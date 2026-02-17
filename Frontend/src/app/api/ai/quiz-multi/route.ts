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
		const insightLines = noteIds
			.map((noteId) => {
				const conclusion = conclusionByNote.get(noteId);
				if (!conclusion) return null;
				const title = noteTitleMap.get(noteId) || "Untitled note";
				return `- ${title}: ${conclusion}`;
			})
			.filter(Boolean);
		const previousInsightsBlock =
			insightLines.length > 0
				? `\n\nPrevious Session Insights (per note, use ONLY as context, do NOT assume current knowledge):\n${insightLines.join("\n")}`
				: "";

		// Combine all notes content
		const combinedContent = notes
			.map((note) => `**${note.title}**\n${note.content}`)
			.join("\n\n---\n\n");

		// Prepare system prompt with JSON response format
		const systemPrompt = `You are a helpful AI tutor helping students review and connect multiple study notes through interactive conversation.

**CRITICAL INSTRUCTIONS:**
1. DO NOT include your internal reasoning, thinking process, or chain-of-thought
2. DO NOT make assumptions about the student's knowledge unless they explicitly demonstrate it in their answers
3. ONLY base your assessment on: the provided note content + the student's actual responses in THIS session

**OUTPUT FORMAT (STRICT):**
Return two parts in this exact order:
1) Your chat response in Markdown (no JSON, no code fences)
2) The delimiter line: <<METADATA_JSON>> (must be preceded by two newlines and followed by a newline)
3) A single valid JSON object with keys "analysis", "weaknesses", "conclusion"

**Example:**
Correct ✅ Here is a short explanation...${METADATA_DELIMITER}{"analysis":"...","weaknesses":"...","conclusion":"..."}

**Rules:**
- Do NOT include the delimiter anywhere else
- The JSON must be valid and use double quotes
- Keep the chat response under 100 words
- DO NOT expose your reasoning process

**Context for THIS session:**
The student has selected ${notes.length} note${notes.length > 1 ? "s" : ""} from category_id: ${categoryId || "mixed categories"}.

Combined Note Content:
${combinedContent}
${previousInsightsBlock}

**Guidelines for the chat response:**
- If this is the first message: ask ONE relevant, open-ended question that tests understanding across the selected notes
- Help the student connect ideas between notes (concepts, themes, contrasts)
- Respond in the same language as the student's last message
- Use Markdown: **bold**, bullets where helpful
- If the student answered, follow this structure:
  1. Start with: "Correct ✅" / "Almost 🤏" / "Incorrect ❌"
  2. Brief explanation (under 60 words, use Markdown)
  3. Ask ONE thoughtful follow-up question
- Be conversational, encouraging, focused
- Keep the chat response under 100 words

**Guidelines for metadata fields:**
- "analysis": ONLY concepts the student has explicitly demonstrated in their answers
- "weaknesses": ONLY based on incorrect/incomplete answers in THIS session
- "conclusion": Actionable insight based on THIS session's performance only (e.g., "Student demonstrated X", "Needs practice on Y based on answer Z")
`;

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
