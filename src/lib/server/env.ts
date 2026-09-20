import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

export const env = {
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get typesafeApiKey() {
    return required("TYPESAFE_API_KEY");
  },
  get typesafeModel() {
    return process.env.TYPESAFE_MODEL || "jev-latest";
  },
  /** Overridable so the live path can be exercised against a stub in tests. */
  get gmailApiBase() {
    return process.env.GMAIL_API_BASE || "https://gmail.googleapis.com/gmail/v1/users/me";
  },
  get typesafeApiUrl() {
    return process.env.TYPESAFE_API_URL || "https://api.typesafe.ai/v1/systemone";
  },
  /** Hard ceiling on messages pulled per run, so a busy mailbox cannot run away. */
  get maxMessages() {
    const raw = Number(process.env.MAX_MESSAGES);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 150;
  },
};

/** True when Gmail + JEV are both configured; the UI degrades to demo-only if not. */
export function isLiveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.SESSION_SECRET &&
      process.env.TYPESAFE_API_KEY,
  );
}

/** Redirect URI must match the one registered in Google Cloud exactly. */
export function redirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}
