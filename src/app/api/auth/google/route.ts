import { NextResponse } from "next/server";
import { consentUrl } from "@/lib/server/google-oauth";
import { isLiveConfigured } from "@/lib/server/env";
import { issueOAuthState } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isLiveConfigured()) {
    return NextResponse.json(
      { error: "Gmail and JEV credentials are not configured on this server." },
      { status: 503 },
    );
  }
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(consentUrl(origin, await issueOAuthState()));
}
