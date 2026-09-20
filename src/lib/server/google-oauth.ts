import "server-only";

import { env, redirectUri } from "./env";
import { HttpError, withRetry } from "./pool";
import type { Session } from "./session";

/**
 * Read-only. The UI never writes labels back, so this is the whole scope —
 * `gmail.modify` would be required to apply labels and is deliberately absent.
 */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function consentUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    state,
    // Needed to receive a refresh token on the first authorisation.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  return withRetry(async () => {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new HttpError(response.status, `Google token endpoint: ${await response.text()}`);
    }
    return (await response.json()) as TokenResponse;
  });
}

export async function exchangeCode(origin: string, code: string): Promise<Session> {
  const token = await postToken(
    new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  );

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    email: await fetchEmailAddress(token.access_token),
  };
}

/** Refreshes in place when the access token is within a minute of expiry. */
export async function ensureFreshToken(session: Session): Promise<Session> {
  if (Date.now() < session.expiresAt - 60_000) return session;
  if (!session.refreshToken) {
    throw new HttpError(401, "Access token expired and no refresh token is stored.");
  }

  const token = await postToken(
    new URLSearchParams({
      refresh_token: session.refreshToken,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      grant_type: "refresh_token",
    }),
  );

  return {
    ...session,
    accessToken: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
}

export async function revoke(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
  }).catch(() => {
    // Best effort: the local session is cleared either way.
  });
}

async function fetchEmailAddress(accessToken: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return "";
  const profile = (await response.json()) as { email?: string };
  return profile.email ?? "";
}
