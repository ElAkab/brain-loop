export type StreamMetadata = {
	analysis: string;
	weaknesses: string;
	conclusion: string;
};

export const METADATA_DELIMITER = "\n\n<<METADATA_JSON>>\n";

const EMPTY_METADATA: StreamMetadata = {
	analysis: "",
	weaknesses: "",
	conclusion: "",
};

function parseMetadata(raw: string): StreamMetadata {
	const trimmed = raw.trim();
	if (!trimmed) return EMPTY_METADATA;

	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed === "object") {
			return {
				analysis: parsed.analysis || "",
				weaknesses: parsed.weaknesses || "",
				conclusion: parsed.conclusion || "",
			};
		}
	} catch (error) {
		console.warn("Failed to parse metadata JSON:", error);
	}

	return EMPTY_METADATA;
}

function enqueueSSE(controller: ReadableStreamDefaultController, data: unknown) {
	const encoder = new TextEncoder();
	controller.enqueue(
		encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
	);
}

function enqueueDone(controller: ReadableStreamDefaultController) {
	const encoder = new TextEncoder();
	controller.enqueue(encoder.encode("data: [DONE]\n\n"));
}

export function streamOpenRouterResponse(
	openRouterResponse: Response,
	modelUsed: string,
): Response {
	const stream = new ReadableStream({
		async start(controller) {
			const reader = openRouterResponse.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				enqueueSSE(controller, { type: "metadata", data: EMPTY_METADATA });
				enqueueDone(controller);
				controller.close();
				return;
			}

			let buffer = "";
			let fullText = "";
			let delimiterIndex: number | null = null;
			let lastSentLength = 0;
			let metadataText = "";
			let doneSent = false;

			const handleContent = (content: string) => {
				if (!content) return;

				fullText += content;

				if (delimiterIndex === null) {
					const idx = fullText.indexOf(METADATA_DELIMITER);
					if (idx !== -1) delimiterIndex = idx;
				}

				const chatText =
					delimiterIndex === null
						? fullText
						: fullText.slice(0, delimiterIndex);

				if (chatText.length > lastSentLength) {
					const newContent = chatText.slice(lastSentLength);
					lastSentLength = chatText.length;
					enqueueSSE(controller, {
						choices: [{ delta: { content: newContent } }],
					});
				}

				if (delimiterIndex !== null) {
					const metadataStart = delimiterIndex + METADATA_DELIMITER.length;
					metadataText = fullText.slice(metadataStart);
				}
			};

			const handleLine = (line: string) => {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data:")) return;
				const payload = trimmed.slice(5).trim();
				if (!payload || payload === "[DONE]") return;

				try {
					const parsed = JSON.parse(payload);
					const content = parsed?.choices?.[0]?.delta?.content;
					if (content) handleContent(content);
				} catch (error) {
					// Ignore malformed JSON chunks
				}
			};

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split(/\r?\n/);
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						handleLine(line);
					}
				}

				if (buffer.trim()) {
					handleLine(buffer);
				}
			} catch (error) {
				console.error("OpenRouter stream error:", error);
			} finally {
				if (!doneSent) {
					doneSent = true;
					const metadata = parseMetadata(metadataText);
					enqueueSSE(controller, { type: "metadata", data: metadata });
					enqueueDone(controller);
					controller.close();
				}
				reader.releaseLock();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Model-Used": modelUsed,
		},
	});
}
