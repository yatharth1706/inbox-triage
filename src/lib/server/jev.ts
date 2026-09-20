import "server-only";

import { CATEGORIES } from "@/lib/categories";
import type { CategoryId } from "@/lib/types";
import { env } from "./env";
import { HttpError, withRetry } from "./pool";
import type { GmailMessage } from "./gmail";

/**
 * Descriptions do the heavy lifting: JEV sees both the option names and these
 * values. `not_for` is what keeps the neighbouring folders apart.
 */
const CATEGORY_CRITERIA: Record<CategoryId, Record<string, unknown>> = {
  reply_needed: {
    what: "Written by a person and waiting on a response, decision or approval from the recipient.",
    not_for: "Automated mail, even when it mentions a deadline.",
    examples: ["A colleague asking a direct question", "A client awaiting confirmation"],
  },
  interview: {
    what: "Any stage of a hiring pipeline the recipient is a candidate in: applications, scheduling, take-homes, offers.",
    not_for: "General recruiter cold outreach with no live process.",
  },
  calendar: {
    what: "Meeting invitations, reschedules, cancellations and RSVP responses.",
    not_for: "Ordinary mail that merely proposes a time in prose.",
  },
  finance: {
    what: "Banking, payroll, statements, balances and fraud or unusual-spend alerts.",
    not_for: "Receipts for a specific purchase, which belong in receipts.",
  },
  receipts: {
    what: "Confirmation that a specific payment was made: invoices, order confirmations, trip receipts.",
    not_for: "Account-level financial summaries, which belong in finance.",
  },
  newsletters: {
    what: "Periodical editorial content the recipient subscribed to, sent to a list.",
    not_for: "Marketing mail whose purpose is to sell something.",
  },
  social: {
    what: "Notifications from social or collaboration platforms: mentions, replies, follows, connection requests.",
  },
  promotional: {
    what: "Marketing from a legitimate business: sales, discounts, product launches, abandoned carts.",
    not_for: "Fraudulent mail, which belongs in spam.",
  },
  spam: {
    what: "Phishing, scams and fraud: credential bait, spoofed senders, fake invoices, lottery and prize claims.",
    not_for: "Legitimate but unwanted marketing, which belongs in promotional.",
  },
};

interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

interface NoulAnswer {
  type: "noul";
  noul: number;
}

interface SystemOneResponse {
  model: string;
  answers: {
    category: ChoiceAnswer;
    action_required: NoulAnswer;
    security_alert: NoulAnswer;
  };
  usage?: { input_tokens: number; output_tokens: number };
}

export interface Verdict {
  category: CategoryId;
  confidence: number;
  probabilities: Record<string, number>;
  actionRequired: number;
  securityAlert: number;
  /** Human-readable rationale, composed from typed signals — JEV emits no prose. */
  reason: string;
}

/**
 * All three questions ride on one request against the same state, so the extra
 * signals cost no additional round trip.
 */
export async function classify(message: GmailMessage): Promise<Verdict> {
  const criteria = Object.fromEntries(
    CATEGORIES.map((category) => [category.id, CATEGORY_CRITERIA[category.id]]),
  );

  const body = {
    model: env.typesafeModel,
    state: {
      from: message.from,
      from_address: message.fromAddress,
      subject: message.subject,
      preview: message.snippet,
      received: new Date(message.receivedAt).toISOString(),
      gmail_labels: message.labelIds,
    },
    questions: {
      category: {
        type: "choice",
        instructions:
          "Which folder does this email belong in? Judge the sender and the purpose of the message, not its tone.",
        criteria,
      },
      action_required: {
        type: "noul",
        instructions:
          "Does this email require the recipient personally to do something, such as reply, approve, decide or attend?",
      },
      security_alert: {
        type: "noul",
        instructions:
          "Is this a security or fraud alert about one of the recipient's own accounts, sent by the real provider?",
      },
    },
  };

  const response = await withRetry(async () => {
    const res = await fetch(env.typesafeApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.typesafeApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new HttpError(res.status, `JEV ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as SystemOneResponse;
  });

  const answer = response.answers.category;
  const category = toCategoryId(answer.choice);
  const actionRequired = response.answers.action_required?.noul ?? 0;
  const securityAlert = response.answers.security_alert?.noul ?? 0;

  return {
    category,
    confidence: answer.confidence,
    probabilities: answer.probabilities ?? {},
    actionRequired,
    securityAlert,
    reason: composeReason(answer, actionRequired, securityAlert),
  };
}

/** Guards against a model returning an option name we do not know. */
function toCategoryId(choice: string): CategoryId {
  const match = CATEGORIES.find((category) => category.id === choice);
  return match ? match.id : "reply_needed";
}

/**
 * JEV returns no text, so the rationale is assembled from what it does return:
 * the runner-up option and the two yes/no signals.
 */
function composeReason(
  answer: ChoiceAnswer,
  actionRequired: number,
  securityAlert: number,
): string {
  const parts: string[] = [];

  const ranked = Object.entries(answer.probabilities ?? {}).sort((a, b) => b[1] - a[1]);
  const runnerUp = ranked[1];
  if (runnerUp && runnerUp[1] >= 0.1) {
    parts.push(`runner-up ${runnerUp[0].replace(/_/g, " ")} ${runnerUp[1].toFixed(2)}`);
  } else if (answer.confidence >= 0.9) {
    parts.push("no competing folder");
  }

  if (actionRequired >= 0.6) parts.push(`action requested ${actionRequired.toFixed(2)}`);
  if (securityAlert >= 0.6) parts.push(`account security alert ${securityAlert.toFixed(2)}`);
  if (answer.confidence < 0.5) parts.push("low confidence — worth a look");

  return parts.length > 0 ? parts.join(" · ") : "clear single-folder match";
}
