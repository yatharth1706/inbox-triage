# JEV · Inbox Triage

Connect Gmail read-only, and [TypeSafe AI's JEV](https://docs.typesafe.ai/) sorts
the last stretch of your mail into nine folders with a calibrated confidence
score for each message.

**Read-only, by construction.** The app requests `gmail.readonly` and nothing
else. It cannot label, archive, move or delete anything — sorting exists only in
this UI. Moving a card here re-tallies the local view and never touches Gmail.

UI ported from the Claude Design source `JEV Inbox Triage.dc.html` (dark variant).

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**, strict
- **Tailwind CSS v4** — design tokens live in `src/app/globals.css` under `@theme`
- **TypeSafe JEV** for classification, over its HTTP API
- Gmail REST API v1, read-only
- No database: the session lives in an encrypted cookie, the last run in
  `localStorage`

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in, see below
npm run dev                  # http://localhost:3000
```

The demo inbox works with no configuration at all. Gmail needs three things:

**1. Google OAuth client.** In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
enable the Gmail API, then create an OAuth 2.0 Client ID of type *Web
application* and add this exact redirect URI:

```
http://localhost:3000/api/auth/google/callback
```

Put the client ID and secret in `.env.local`. While the app is in testing mode
you must also add yourself as a test user on the OAuth consent screen.

**2. Session secret.** `openssl rand -base64 48` into `SESSION_SECRET`.

**3. TypeSafe API key.** From [console.typesafe.ai](https://console.typesafe.ai)
into `TYPESAFE_API_KEY`.

### Before you ship this to other people

`gmail.readonly` is a **restricted scope**. Google requires app verification,
including a third-party security assessment, before anyone outside your own
test-user list can grant it. Testing mode caps you at 100 users and shows an
unverified-app warning. Budget weeks, not days.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Architecture

The flow is a **single route with a client-side state machine**, not one route
per step. Putting `connect → running → done` in the URL would mean serialising a
whole in-flight run into query params, and re-mounting between steps would break
the entry animations that carry the flow.

```
src/
  app/
    api/
      auth/google/            consent redirect
      auth/google/callback/   code exchange, session cookie
      auth/logout/            revoke + clear
      session/                { configured, connected, email }
      triage/run/             NDJSON stream of classified mail
      messages/body/          one message body, fetched on expand
    layout.tsx, page.tsx, globals.css
  hooks/
    use-triage-run.ts         reducer + demo pacing + live stream consumer
    use-session.ts            connection state
  lib/
    server/                   server-only; never reaches the client bundle
      env.ts                  validated config
      session.ts              AES-256-GCM sealed cookie
      google-oauth.ts         consent URL, code exchange, refresh, revoke
      gmail.ts                list, fetch, parse, lazy body
      jev.ts                  the classifier
      pool.ts                 bounded concurrency + retry with jitter
    categories.ts, seed.ts, emails.ts, sources.ts, config.ts
    run-events.ts             NDJSON stream parser
  components/                 connect/ running/ done/ ui/
```

### How a run works

1. `listMessageIds` pages through `newer_than:{30,60,90}d -in:chats` until the
   `MAX_MESSAGES` cap.
2. One bounded pool (8 wide) does fetch-then-classify per message, so a slow
   classification never blocks an unrelated fetch.
3. Each result is streamed to the browser as a line of NDJSON, so the progress
   ring reflects real work rather than a timer.
4. A message that cannot be read is counted and skipped — one bad message never
   sinks the run.

Everything retries with exponential backoff and full jitter, but only on 429 and
5xx; a 404 is not retried.

### How JEV is used

JEV is a *System One* model: it returns typed decisions with calibrated
probabilities, not text. Each message is one request carrying three questions
against the same state, so the extra signals cost no extra round trip:

| Question | Type | Used for |
| --- | --- | --- |
| `category` | `choice` over the nine folders | the folder, and `confidence` for the bar |
| `action_required` | `noul` | whether the message needs the recipient to act |
| `security_alert` | `noul` | genuine account-security mail |

The option descriptions in `src/lib/server/jev.ts` do most of the work — in
particular `not_for`, which is what keeps neighbouring folders apart (finance vs.
receipts, promotional vs. spam). Tune those first if classification drifts.

**On the `jev ·` line in an expanded card.** The original mockup showed generated
prose there. JEV emits no text by design, so that line is composed from what it
actually returns: the runner-up folder and its probability, plus whichever
yes/no signals cleared their threshold. It is a real readout, not a paraphrase.

An unknown option name from the model falls back to `reply_needed` rather than
throwing, so a model update cannot break a run.

### State

`useTriageRun` is a `useReducer` with two modes. Demo replays canned data on a
timer sized so any window finishes in ~48 ticks; live appends messages as the
stream delivers them. Folder counts are **derived** with `useMemo` from the
classified list rather than stored, so a move can never desync them.

### Saved runs

The last completed run is kept in `localStorage`, so returning to the app shows
your results rather than an empty connect screen. The header reads **Saved run**
with the mailbox it came from and how long ago it was saved, and there is a
**Clear saved run** button beside **New run**.

Notes on the implementation:

- **Tokens are never stored there.** See below — this is the whole reason the
  split exists.
- Reclassifications are saved too, so a message you moved stays moved.
- Restoring does not re-save, so the "saved 2h ago" timestamp stays truthful.
- The stored blob is validated on read and discarded if it does not match the
  schema; `localStorage` is user-writable, so nothing read back is trusted.
- Bodies are not persisted. They are small, lazily fetched, and would bloat the
  blob for no benefit — a restored card refetches on expand.
- Roughly 10 KB per 40 messages. If the write fails (quota, private mode) the
  run still works in memory and the UI says it could not be saved.
- Connecting a different mailbox does not silently swap the results. The saved
  run stays, labelled with whose it is, and a notice points out that Gmail is
  now connected as someone else.

### Security notes

- **Tokens live in the httpOnly cookie, never in `localStorage`.** This is the
  load-bearing decision. Scripts cannot read an httpOnly cookie; they can read
  `localStorage` freely, so putting a refresh token there would turn any XSS
  into standing access to the mailbox. Only non-secret display data — the
  address and the classification results — goes to `localStorage`.
- Those results still contain subjects, senders and snippets in plaintext on
  the user's disk. That is ordinary for a mail client, but it is why **Clear
  saved run** exists, and why a shared machine is worth thinking about.
- The session cookie is `httpOnly`, `sameSite=lax`, AES-256-GCM sealed, and
  `secure` in production. OAuth uses a single-use `state` cookie for CSRF.
- **The refresh token lives in that cookie**, which is fine for a single-user
  demo and is the main thing to change before real use: move tokens into a
  server-side store keyed by a session id. Rotating `SESSION_SECRET`
  invalidates every session.
- `src/lib/server/*` is marked `server-only`, so importing any of it from a
  client component is a build error rather than a leaked secret.

### Motion

Every easing curve is a token on `:root` (`--ease-out-soft`, `--ease-out-gentle`,
`--ease-in-out-soft`) and none of them overshoot. The source design used springy
curves like `cubic-bezier(.2, 1.4, .4, 1)`, whose y > 1 makes each transition
spring past its target and snap back — snappy rather than smooth.

Three things that matter more than the curves:

- The **progress ring interpolates**. Messages arrive in batches, so the raw
  percentage jumps; `useSmoothNumber` eases the displayed value with `rAF` and
  the ring is drawn from that. Without it the ring visibly ratchets.
- The **card entrance is staggered** by 28ms, capped at 14 cards, instead of
  three dozen cards animating in perfect unison.
- A **restored run does not animate in**. Those results are not new, so they are
  simply there.

Expanding a card animates `grid-template-rows` from `0fr` to `1fr`, which eases
to the panel's natural height without a hard-coded one. The panel stays mounted
so a fetched body survives collapsing, with `inert` keeping it out of the tab
order while closed.

Measured at 4x CPU throttle: 16.7ms p50 and p95 through classification, card
entrance and folder filtering.

### Styling

Layout, spacing and typography are Tailwind utilities over the tokens in
`globals.css`. The one deliberate exception is per-category colour: nine hues,
each needing several alpha steps (`1A`, `22`, `33`), are genuinely dynamic, so
they stay as inline styles in `src/lib/category-styles.ts` rather than being
forced into arbitrary-value utilities.

### Configuration

The design exposes three component props. They are typed config rather than
on-screen controls, overridable at the provider:

```tsx
<TriageConfigProvider accent="#B39CF5" speed={140} showConfidence={false}>
  <TriageApp />
</TriageConfigProvider>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `accent` | `#7CE3BC` | Drives the `--accent` custom property. Design offers `#7CE3BC`, `#B39CF5`, `#F0C36F`, `#6FB6F0`. |
| `speed` | `95` | Milliseconds between demo batches (30–260). Live runs are paced by the stream. |
| `showConfidence` | `true` | Hides the numeric score; the confidence bar stays. |
| `model` | `jev-latest` | From `TYPESAFE_MODEL`. Shown in the header chip. |

### Accessibility

The source is a static mockup, so the port adds what a real app needs: the
progress ring is a `role="progressbar"` with live `aria-valuetext`, email cards
expand via a real `<button>` with `aria-expanded`/`aria-controls`, folder pills
and source cards report `aria-pressed`, the window toggle is a radio group, the
"Move to" select is labelled, and the decorative activity log is hidden from
assistive tech. `prefers-reduced-motion` collapses every animation.

## Testing

`GMAIL_API_BASE` and `TYPESAFE_API_URL` exist so the live path can be pointed at
a stub. The pipeline was verified end to end that way — pagination, the message
cap, a failing message, entity decoding, sender parsing, streamed progress, lazy
body loading, and folder re-tally on move.

**It has not been run against real Gmail or a real JEV key**, which needs
credentials this codebase does not ship. Expect to shake out consent-screen
configuration and real-world header shapes on first contact.

## Known limits

- One JEV request per message. A 150-message run is 150 requests; the cap exists
  for that reason.
- No incremental sync. Each run re-reads the whole window rather than using
  Gmail's `historyId`.
- One saved run, not a history. A new run replaces the previous one.
- Saved runs are per-browser. Nothing syncs across devices, because there is
  still no server-side storage.
- Classification quality is unmeasured. There is no labelled set and no eval, so
  the category descriptions are reasoned-about, not tuned.
