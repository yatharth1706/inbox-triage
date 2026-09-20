import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/server/google-oauth";
import { consumeOAuthState, writeSession } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = new URL("/", url.origin);

  const error = url.searchParams.get("error");
  if (error) {
    // The usual case is the user clicking "Cancel" on the consent screen.
    home.searchParams.set("auth_error", error);
    return NextResponse.redirect(home);
  }

  if (!(await consumeOAuthState(url.searchParams.get("state")))) {
    home.searchParams.set("auth_error", "state_mismatch");
    return NextResponse.redirect(home);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    home.searchParams.set("auth_error", "missing_code");
    return NextResponse.redirect(home);
  }

  try {
    await writeSession(await exchangeCode(url.origin, code));
  } catch {
    home.searchParams.set("auth_error", "exchange_failed");
    return NextResponse.redirect(home);
  }

  home.searchParams.set("connected", "1");
  return NextResponse.redirect(home);
}
