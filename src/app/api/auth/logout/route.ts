import { NextResponse } from "next/server";
import { revoke } from "@/lib/server/google-oauth";
import { clearSession, readSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await readSession();
  if (session?.refreshToken) await revoke(session.refreshToken);
  await clearSession();
  return NextResponse.json({ connected: false });
}
