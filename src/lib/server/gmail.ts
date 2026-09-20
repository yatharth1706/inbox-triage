import "server-only";

import { env } from "./env";
import { HttpError, withRetry } from "./pool";

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  /** Epoch millis. */
  receivedAt: number;
  /** Gmail's own labels, useful context for the classifier. */
  labelIds: string[];
}

async function gmailGet<T>(path: string, accessToken: string): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(`${env.gmailApiBase}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new HttpError(response.status, `Gmail ${path}: ${await response.text()}`);
    }
    return (await response.json()) as T;
  });
}

interface ListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
}

/**
 * Pages through the window until the cap is reached. Chats are excluded because
 * they are not mail and pollute every folder.
 */
export async function listMessageIds(
  accessToken: string,
  rangeDays: number,
  cap: number,
): Promise<string[]> {
  const query = `newer_than:${rangeDays}d -in:chats`;
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(500, cap - ids.length)),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const page = await gmailGet<ListResponse>(`/messages?${params}`, accessToken);
    for (const message of page.messages ?? []) ids.push(message.id);
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < cap);

  return ids.slice(0, cap);
}

interface MessageResponse {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: { name: string; value: string }[] };
}

/**
 * `format=metadata` keeps the response small — headers and snippet only, no
 * bodies — which is all the UI and the classifier need.
 */
export async function fetchMessage(id: string, accessToken: string): Promise<GmailMessage> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const header of ["From", "Subject", "Date"]) {
    params.append("metadataHeaders", header);
  }

  const message = await gmailGet<MessageResponse>(
    `/messages/${id}?${params}`,
    accessToken,
  );
  const headers = new Map(
    (message.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]),
  );
  const { name, address } = parseFrom(headers.get("from") ?? "");

  return {
    id: message.id,
    threadId: message.threadId,
    from: name || address || "Unknown sender",
    fromAddress: address,
    subject: headers.get("subject") || "(no subject)",
    snippet: decodeEntities(message.snippet ?? ""),
    receivedAt: Number(message.internalDate) || Date.parse(headers.get("date") ?? "") || Date.now(),
    labelIds: message.labelIds ?? [],
  };
}

/** `"Dana Whitfield <dana@northwind.com>"` → name and address. */
export function parseFrom(raw: string): { name: string; address: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: stripQuotes(match[1]), address: match[2].trim() };
  }
  const trimmed = raw.trim();
  return { name: "", address: trimmed };
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

/** Gmail snippets arrive HTML-escaped. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function daysAgo(receivedAt: number, now = Date.now()): string {
  const days = Math.max(1, Math.floor((now - receivedAt) / 86_400_000));
  return days === 1 ? "1d ago" : `${days}d ago`;
}

interface PartResponse {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: PartResponse[];
}

/** Fetched lazily, only when a card is expanded. */
export async function fetchMessageBody(
  id: string,
  accessToken: string,
  limit = 1200,
): Promise<string> {
  const message = await gmailGet<{ payload?: PartResponse; snippet?: string }>(
    `/messages/${id}?format=full`,
    accessToken,
  );

  const text =
    findPart(message.payload, "text/plain") ??
    stripHtml(findPart(message.payload, "text/html") ?? "");

  const clean = collapse(text || decodeEntities(message.snippet ?? ""));
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

/** Depth-first walk for the first part of the wanted type. */
function findPart(part: PartResponse | undefined, mimeType: string): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf8");
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function collapse(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
