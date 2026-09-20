import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE = "jev_session";
const STATE_COOKIE = "jev_oauth_state";
const ALGORITHM = "aes-256-gcm";

export interface Session {
  accessToken: string;
  refreshToken?: string;
  /** Epoch millis when the access token expires. */
  expiresAt: number;
  email: string;
}

function key(): Buffer {
  return createHash("sha256").update(env.sessionSecret).digest();
}

function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function unseal<T>(token: string): T | null {
  try {
    const [iv, tag, body] = token.split(".");
    if (!iv || !tag || !body) return null;
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    // Tampered, truncated, or sealed under a rotated secret.
    return null;
  }
}

const secure = process.env.NODE_ENV === "production";

export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? unseal<Session>(raw) : null;
}

export async function writeSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE, seal(session), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Single-use CSRF token tying the consent redirect to this browser. */
export async function issueOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("base64url");
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return state;
}

export async function consumeOAuthState(candidate: string | null): Promise<boolean> {
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  return Boolean(expected && candidate && expected === candidate);
}
