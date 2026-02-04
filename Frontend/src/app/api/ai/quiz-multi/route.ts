import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const FREE_MODELS = [
	"tngtech/deepseek-r1t2-chimera:free",
	"google/gemini-2.0-flash-exp:free",
	"meta-llama/llama-3.2-3b-instruct:free",
	"qwen/qwen-2-7b-instruct:free",
	"microsoft/phi-3-mini-128k-instruct:free",
	"z-ai/glm-4.5-air:free",
	"tngtech/deepseek-r1t-chimera:free",
	"openai/gpt-oss-120b:free",
	"stepfun/step-3.5-flash:free",
	"openai/gpt-oss-120b:free",
];

let currentModelIndex = 0;

const OPENROUTER_KEY =
	process.env.OPENROUTER_API_KEY ||
	process.env.OPENROUTER_DEV_API_KEY ||
	process.env.OPENROUTER_PROD_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

async function callOpenRouter(
	messages: any[],
	retryCount = 0,
): Promise<string> {
	if (retryCount >= FREE_MODELS.length) {
		throw new Error(
			"All free models are currently unavailable. Please try again later.",
		);
	}

	const model = FREE_MODELS[currentModelIndex];

	try {
		if (!OPENROUTER_KEY) {
			throw new Error(
				JSON.stringify({
					error:
						"OpenRouter API key not configured (OPENROUTER_API_KEY|OPENROUTER_DEV_API_KEY|OPENROUTER_PROD_API_KEY)",
				}),
			);
		}

		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${OPENROUTER_KEY}`,
					"Content-Type": "application/json",
					"HTTP-Referer":
						process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
					"X-Title": "Brain Loop",
				},
				body: JSON.stringify({
					model,
					messages,
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();

			// Si erreur 429 (rate limit), essayer le modèle suivant
			if (response.status === 429 || error.error?.code === 429) {
				console.log(`Model ${model} rate limited, switching to next model...`);
				currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
				return callOpenRouter(messages, retryCount + 1);
			}

			throw new Error(JSON.stringify(error));
		}

		const data = await response.json();

		// Rotation automatique après chaque succès
		currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;

		return data.choices[0].message.content;
	} catch (error: any) {
		if (retryCount < FREE_MODELS.length - 1) {
			currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
			return callOpenRouter(messages, retryCount + 1);
		}
		throw error;
	}
}

export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient(request);
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { noteIds, messages } = await request.json();

		if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
			return NextResponse.json(
				{ error: "noteIds array is required" },
				{ status: 400 },
			);
		}

		// Fetch all selected notes
		const { data: notes, error: notesError } = await supabase
			.from("notes")
			.select("id, title, content")
			.in("id", noteIds)
			.eq("user_id", user.id);

		if (notesError || !notes || notes.length === 0) {
			return NextResponse.json({ error: "Notes not found" }, { status: 404 });
		}

		// Combine all notes content
		const combinedContent = notes
			.map((note) => `**${note.title}**\n${note.content}`)
			.join("\n\n---\n\n");

		// Prepare system prompt
		const systemPrompt = `You are a helpful AI tutor helping students review and connect multiple study notes through interactive conversation. You can use Markdown formatting in your responses.

Context:
The student has selected ${notes.length} note${notes.length > 1 ? "s" : ""} to study.

Combined Note Content:
${combinedContent}

Your role:
- Ask thoughtful, open-ended questions that test understanding across the selected notes
- Help the student connect ideas between notes (concepts, themes, contrasts)
- Provide feedback on student answers (encouraging and constructive)
- Adapt to the student's level and responses
- Keep responses concise, focused, and progressive

Guidelines:
- If this is the first message, ask directly ONE relevant, brief question that checks the student's understanding of the overall context or key ideas shared by the notes.
- Always respond in the same language as the student's last message
- Use Markdown formatting when it helps clarity and memorization (short lists, **bold keywords**)

- If the student has answered, ALWAYS follow this structure:

1. Start with exactly one symbolic word indicating correctness:
   - "Correct ✅"
   - "Almost 🤏"
   - "Incorrect ❌"

2. Provide a brief explanation:
   - Keep it concise and focused
   - Highlight key concepts using Markdown (**bold**, short bullets)
   - Explicitly reference ideas from multiple notes when relevant

3. Continue based on the answer quality:
   - If the answer is correct:
     - Give a very short clarification or connection between notes if useful
     - Immediately ask a deeper or more integrative question based on the same content
   - If the answer is partially correct:
     - Clarify what is missing, incorrect, or not fully connected
     - Ask a guiding follow-up question, slightly similar in intent
   - If the answer is incorrect:
     - Clearly state the correct answer
     - Ask a reformulated question that helps the student reason correctly without repeating verbatim

- Be conversational, encouraging, and focused
- Ask only ONE question per message
- Keep total responses under 100 words
`;

		// Build conversation history
		const aiMessages = [{ role: "system", content: systemPrompt }, ...messages];

		// Call OpenRouter with retry logic and return a streaming response (SSE)
		if (!OPENROUTER_KEY) {
			return NextResponse.json(
				{ error: "OpenRouter API key not configured" },
				{ status: 500 },
			);
		}

		let lastError: any = null;
		for (const model of FREE_MODELS) {
			try {
				const response = await fetch(
					`${OPENROUTER_BASE_URL}/chat/completions`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${OPENROUTER_KEY}`,
							"Content-Type": "application/json",
							"HTTP-Referer":
								process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
							"X-Title": "Brain Loop",
						},
						body: JSON.stringify({
							model,
							messages: aiMessages,
							temperature: 0.7,
							max_tokens: 500,
							stream: true,
						}),
					},
				);

				if (!response.ok) {
					const errData = await response.json().catch(() => null);
					// rate limit -> try next model
					if (
						response.status === 429 ||
						(errData && errData.error?.code === 429)
					) {
						console.log(
							`Model ${model} rate limited, switching to next model...`,
						);
						lastError = errData || { status: response.status };
						continue;
					}

					throw new Error(
						JSON.stringify(errData || { status: response.status }),
					);
				}

				const encoder = new TextEncoder();
				const stream = new ReadableStream({
					async start(controller) {
						const reader = response.body?.getReader();
						if (!reader) {
							controller.close();
							return;
						}

						try {
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								controller.enqueue(value);
							}
						} catch (err) {
							console.error("Stream error:", err);
						} finally {
							controller.close();
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			} catch (err) {
				console.warn(`Model ${model} threw error:`, err);
				lastError = err;
				continue;
			}
		}

		console.error("All models failed. Last error:", lastError);
		return NextResponse.json(
			{
				error:
					"All AI models are currently unavailable. Please try again later.",
			},
			{ status: 503 },
		);
	} catch (error: any) {
		console.error("Error in quiz-multi:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to generate response" },
			{ status: 500 },
		);
	}
}
