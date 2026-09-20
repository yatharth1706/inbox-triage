import type { Email } from "./types";

/** Events streamed by POST /api/triage/run as newline-delimited JSON. */
export type RunEvent =
  | { type: "meta"; total: number; capped: boolean }
  | { type: "message"; email: Email }
  | { type: "done"; failures?: number }
  | { type: "error"; message: string };

/** Parses an NDJSON body, yielding each complete line as it arrives. */
export async function* readRunEvents(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<RunEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      // The last element is a partial line; hold it until more bytes arrive.
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line) as RunEvent;
      }
    }
    if (buffer.trim()) yield JSON.parse(buffer) as RunEvent;
  } finally {
    reader.releaseLock();
  }
}
