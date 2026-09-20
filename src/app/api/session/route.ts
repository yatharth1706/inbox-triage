import { NextResponse } from "next/server";
import { isLiveConfigured } from "@/lib/server/env";
import { readSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  return NextResponse.json({
    configured: isLiveConfigured(),
    connected: Boolean(session),
    email: session?.email ?? null,
  });
}
