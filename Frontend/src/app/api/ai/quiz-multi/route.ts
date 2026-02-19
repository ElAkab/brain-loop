import {
	streamOpenRouterResponse,
	METADATA_DELIMITER,
} from "@/app/api/ai/_utils/openrouter-stream";
import {
	routeOpenRouterRequest,
	type OpenRouterMessage,
} from "@/app/api/ai/_utils/openrouter-routing";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type IncomingChatMessage = {
	role: "user" | "assistant";
	content: string;
};

function normalizeIncomingMessages(payload: unknown): OpenRouterMessage[] {
	if (!Array.isArray(payload)) return [];

	return payload.flatMap((entry) => {
		if (!entry || typeof entry !== "object") return [];
		const maybeRole = (entry as Record<string, unknown>).role;
		const maybeContent = (entry as Record<string, unknown>).content;

		if (
			(maybeRole === "user" || maybeRole === "assistant") &&
			typeof maybeContent === "string" &&
			maybeContent.trim().length > 0
		) {
			const message: IncomingChatMessage = {
				role: maybeRole,
				content: maybeContent,
			};
			return [message];
		}

		return [];
	});
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

			// Check credits availability
			const { checkCredits, consumeCredit } = await import("@/lib/credits");
			const creditCheck = await checkCredits(user.id);
			if (!creditCheck.hasCredits) {
				return NextResponse.json(
					{
						error: "Insufficient credits",
						code: "credits_exhausted",
						message: "You don't have enough credits. Buy more Study Questions or use your own OpenRouter key.",
					},
					{ status: 403 },
				);
			}

			const { noteIds, messages } = await request.json();

			// Check if this is the first message of a session
			const isFirstMessage = !messages || messages.length === 0;

			if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
				return NextResponse.json(
					{ error: "noteIds array is required" },
					{ status: 400 },
				);
			}

		// Fetch all selected notes
		const { data: notes, error: notesError } = await supabase
			.from("notes")
			.select("id, title, content, category_id")
			.in("id", noteIds)
			.eq("user_id", user.id);

		if (notesError || !notes || notes.length === 0) {
			return NextResponse.json({ error: "Notes not found" }, { status: 404 });
		}

		// Get category_id (use first note's category, or null if mixed)
		const categoryIds = [
			...new Set(notes.map((n) => n.category_id).filter(Boolean)),
		];
		const categoryId = categoryIds.length === 1 ? categoryIds[0] : null;

		const selectedNoteIds = new Set(noteIds);
		const feedbackLimit = Math.min(50, Math.max(noteIds.length * 5, 10));
		const { data: recentSessions, error: recentSessionsError } = await supabase
			.from("study_sessions")
			.select("note_ids, ai_feedback, created_at")
			.overlaps("note_ids", noteIds)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.limit(feedbackLimit);

		if (recentSessionsError) {
			console.warn(
				"Failed to fetch recent study sessions:",
				recentSessionsError,
			);
		}

		const conclusionByNote = new Map<string, string>();
		for (const session of recentSessions || []) {
			if (!session?.ai_feedback) continue;

			let feedback: unknown = session.ai_feedback;
			if (typeof feedback === "string") {
				try {
					feedback = JSON.parse(feedback);
				} catch {
					continue;
				}
			}

			if (!feedback || typeof feedback !== "object") continue;
			const feedbackRecord = feedback as Record<string, unknown>;
			const conclusion =
				typeof feedbackRecord.conclusion === "string"
					? feedbackRecord.conclusion
					: "";
			if (!conclusion) continue;

			const sessionNoteIds = Array.isArray(session.note_ids)
				? session.note_ids
				: [];

			for (const noteId of sessionNoteIds) {
				if (!selectedNoteIds.has(noteId)) continue;
				if (!conclusionByNote.has(noteId)) {
					conclusionByNote.set(noteId, conclusion);
				}
			}

			if (conclusionByNote.size >= selectedNoteIds.size) break;
		}

		const noteTitleMap = new Map(
			notes.map((note) => [note.id, note.title || "Untitled note"]),
		);

		// Only include previous insights if this is NOT the first message
		// For the first message, we want a fresh start without previous context pollution
		let previousInsightsBlock = "";
		if (!isFirstMessage) {
			const insightLines = noteIds
				.map((noteId) => {
					const conclusion = conclusionByNote.get(noteId);
					if (!conclusion) return null;
					const title = noteTitleMap.get(noteId) || "Untitled note";
					return `- ${title}: ${conclusion}`;
				})
				.filter(Boolean);
			
			if (insightLines.length > 0) {
				previousInsightsBlock = `\n\nPrevious Session Insights (per note, use ONLY as context, do NOT assume current knowledge):\n${insightLines.join("\n")}`;
			}
		}

		// Combine all notes content
		const combinedContent = notes
			.map((note) => `**${note.title}**\n${note.content}`)
			.join("\n\n---\n\n");

		// Prepare system prompt with explicit isFirstMessage flag
		const systemPrompt = `You are a helpful AI tutor helping students review and connect multiple study notes through interactive conversation.

**CRITICAL CONTEXT:**
isFirstMessage: ${isFirstMessage ? "TRUE" : "FALSE"}
${isFirstMessage ? "→ This is the START of a new quiz session. You MUST ask a question first." : "→ This is a CONTINUATION of an ongoing quiz session. Evaluate the user's answer."}

**STRICT DECISION RULES:**
1. IF isFirstMessage IS TRUE:
   - Your response MUST be ONLY ONE question
   - DO NOT evaluate, correct, or judge anything
   - DO NOT say "Correct", "Incorrect", or any evaluation
   - Simply ask a relevant, open-ended question about the notes

2. IF isFirstMessage IS FALSE:
   - The user has provided an answer to your previous question
   - Evaluate their answer with: "Correct ✅" / "Almost 🤏" / "Incorrect ❌"
   - Give a brief explanation (under 60 words)
   - Ask ONE thoughtful follow-up question

**OUTPUT FORMAT (STRICT):**
Return two parts in this exact order:
1) Your chat response in Markdown (no JSON, no code fences)
2) The delimiter line: <<METADATA_JSON>> (must be preceded by two newlines and followed by a newline)
3) A single valid JSON object with keys "analysis", "weaknesses", "conclusion"

**Example for isFirstMessage=TRUE:**
What is the main difference between encryption at rest and encryption in transit, and why are both important for a comprehensive security strategy?

<<METADATA_JSON>>
{"analysis":"Session just started, no assessment yet","weaknesses":"","conclusion":"First question asked about security concepts"}

**Example for isFirstMessage=FALSE:**
Correct ✅ Encryption at rest protects stored data...

<<METADATA_JSON>>
{"analysis":"Student understands encryption concepts","weaknesses":"None observed","conclusion":"Good grasp of security fundamentals"}

**Rules:**
- Do NOT include the delimiter anywhere else
- The JSON must be valid and use double quotes
- Keep the chat response under 100 words
- Respond in the language of the note content (detect it)
- Use Markdown: **bold**, bullets where helpful

**Context for THIS session:**
The student has selected ${notes.length} note${notes.length > 1 ? "s" : ""} from category_id: ${categoryId || "mixed categories"}.

Combined Note Content:
${combinedContent}
${isFirstMessage ? "" : previousInsightsBlock}

**Guidelines for metadata fields:**
- "analysis": ONLY concepts the student has explicitly demonstrated in their answers (empty if isFirstMessage=TRUE)
- "weaknesses": ONLY based on incorrect/incomplete answers in THIS session (empty if isFirstMessage=TRUE)
- "conclusion": Actionable insight based on THIS session's performance only (e.g., "Session started" if isFirstMessage=TRUE)`;

		// Build conversation history
		const aiMessages: OpenRouterMessage[] = [
			{ role: "system", content: systemPrompt },
			...normalizeIncomingMessages(messages),
		];

		const aiResult = await routeOpenRouterRequest({
			supabase,
			userId: user.id,
			messages: aiMessages,
			temperature: 0.7,
			maxTokens: 500,
			stream: true,
			actionType: "QUIZ",
		});

		if (!aiResult.ok) {
			return NextResponse.json(
				{
					error: aiResult.error,
					code: aiResult.code,
					details: aiResult.details,
				},
				{ status: aiResult.status },
			);
		}

		// Consume credit ONLY on first message of session (not on subsequent messages)
		if (isFirstMessage && creditCheck.source !== "byok") {
			const consumptionResult = await consumeCredit(user.id, creditCheck.canUsePremium);
			if (!consumptionResult.success) {
				console.error("Failed to consume credit:", consumptionResult.message);
			}
		}

		return streamOpenRouterResponse(
			aiResult.response,
			aiResult.model,
			aiResult.keySource,
		);
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to generate response";
		console.error("Error in quiz-multi:", error);
		return NextResponse.json(
			{ error: message },
			{ status: 500 },
		);
	}
}
