import { NextResponse } from "next/server";
import { fetchMessageBody } from "@/lib/server/gmail";
import { ensureFreshToken } from "@/lib/server/google-oauth";
import { readSession, writeSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bodies are fetched only when a card is expanded, never during a run. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 422 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected to Gmail." }, { status: 401 });
  }

  try {
    const fresh = await ensureFreshToken(session);
    if (fresh.accessToken !== session.accessToken) await writeSession(fresh);
    return NextResponse.json({ body: await fetchMessageBody(id, fresh.accessToken) });
  } catch {
    return NextResponse.json({ error: "Could not read that message." }, { status: 502 });
  }
}
