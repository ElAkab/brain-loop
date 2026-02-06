export type StreamMetadata = {
	analysis: string;
	weaknesses: string;
	conclusion: string;
};

type StreamHandlers = {
	onDelta: (content: string) => void;
	onMetadata?: (data: StreamMetadata) => void;
	onDone?: () => void;
};

export async function readSSEStream(
	response: Response,
	handlers: StreamHandlers,
): Promise<void> {
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error("No response body to stream");
	}

	const decoder = new TextDecoder();
	let buffer = "";
	let doneHandled = false;
	let stop = false;

	const handleLine = (line: string) => {
		const trimmed = line.trim();
		if (!trimmed.startsWith("data:")) return;

		const payload = trimmed.slice(5).trim();
		if (!payload) return;
		if (payload === "[DONE]") {
			doneHandled = true;
			stop = true;
			handlers.onDone?.();
			return;
		}

		try {
			const parsed = JSON.parse(payload);
			if (parsed?.type === "metadata") {
				handlers.onMetadata?.(parsed.data);
				return;
			}

			const content = parsed?.choices?.[0]?.delta?.content;
			if (content) handlers.onDelta(content);
		} catch (error) {
			// Ignore malformed JSON chunks
		}
	};

	try {
		while (!stop) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? "";

			for (const line of lines) {
				handleLine(line);
				if (stop) break;
			}
		}

		if (!stop && buffer.trim()) {
			handleLine(buffer);
		}
	} finally {
		if (!doneHandled) {
			handlers.onDone?.();
		}
		reader.releaseLock();
	}
}
