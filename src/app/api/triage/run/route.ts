import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { daysAgo, fetchMessage, listMessageIds } from "@/lib/server/gmail";
import { ensureFreshToken } from "@/lib/server/google-oauth";
import { classify } from "@/lib/server/jev";
import { mapPool } from "@/lib/server/pool";
import { readSession, writeSession } from "@/lib/server/session";
import type { Email, RangeDays } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A 90-day window on a busy mailbox takes a while; do not let the platform cut it short. */
export const maxDuration = 300;

/** Fetch and classification share one pool, so a slow message blocks nothing else. */
const RUN_CONCURRENCY = 8;

const VALID_RANGES: RangeDays[] = [30, 60, 90];

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected to Gmail." }, { status: 401 });
  }

  const { range } = (await request.json().catch(() => ({}))) as { range?: number };
  if (!VALID_RANGES.includes(range as RangeDays)) {
    return NextResponse.json({ error: "range must be 30, 60 or 90." }, { status: 422 });
  }

  let fresh;
  try {
    fresh = await ensureFreshToken(session);
  } catch {
    return NextResponse.json({ error: "Gmail authorisation expired." }, { status: 401 });
  }
  if (fresh.accessToken !== session.accessToken) await writeSession(fresh);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Newline-delimited JSON: one event per line, consumed by a streaming fetch.
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        const ids = await listMessageIds(
          fresh.accessToken,
          range as RangeDays,
          env.maxMessages,
        );
        send({ type: "meta", total: ids.length, capped: ids.length >= env.maxMessages });

        if (ids.length === 0) {
          send({ type: "done" });
          controller.close();
          return;
        }

        let failures = 0;
        for await (const settled of mapPool(ids, RUN_CONCURRENCY, async (id) => {
          const message = await fetchMessage(id, fresh.accessToken);
          const verdict = await classify(message);
          const email: Email = {
            id: message.id,
            category: verdict.category,
            subject: message.subject,
            from: message.from,
            snippet: message.snippet,
            reason: verdict.reason,
            day: daysAgo(message.receivedAt),
            confidence: verdict.confidence,
          };
          return email;
        })) {
          if ("value" in settled) {
            send({ type: "message", email: settled.value });
          } else {
            // One bad message should not sink the run; report the tally at the end.
            failures++;
          }
        }

        send({ type: "done", failures });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Run failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
