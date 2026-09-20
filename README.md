# JEV · Inbox Triage

A Next.js implementation of the JEV Inbox Triage design — a three-step flow that
points a classifier at a mailbox, sorts every message into one of nine folders
with a confidence score, and hands the labels back to Gmail on approval.

Ported from the Claude Design source `JEV Inbox Triage.dc.html` (dark variant).

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**, strict
- **Tailwind CSS v4** — design tokens live in `src/app/globals.css` under `@theme`
- `next/font/google` for Space Grotesk and JetBrains Mono

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Architecture

The flow is a **single route with a client-side state machine**, not one route
per step. Putting `connect → running → done` in the URL would mean serialising a
whole in-flight run into query params, and re-mounting between steps would break
the entry animations that carry the flow. So `/` renders one client component
and `useTriageRun` owns the transitions.

```
src/
  app/
    layout.tsx              fonts, metadata, dark colour-scheme
    page.tsx                server component -> config provider -> app
    globals.css             design tokens (@theme), keyframes, reduced-motion
  hooks/
    use-triage-run.ts       reducer + interval: the whole state machine
  lib/
    types.ts                Category, Email, Step, FolderFilter, ...
    categories.ts           the nine folders and their hues
    seed.ts                 28 message templates (the demo mailbox)
    emails.ts               window sizing, fan-out, confidence formatting
    sources.ts              Gmail / export / demo source definitions
    config.ts               accent, speed, showConfidence
    category-styles.ts      per-category colour tints as inline styles
  components/
    triage-app.tsx          step switch
    triage-config-context.tsx
    site-header.tsx
    connect/                source cards, window toggle, step
    running/                progress ring, activity log, now-classifying, tiles
    done/                   folder nav, email card, step
    ui/                     dot, pill, eyebrow
```

### State

`useTriageRun` is a `useReducer` over one `RunState`. A run is deterministic:
`buildEmails(range)` fans the 28 seed templates across the window (42 / 78 / 112
messages for 30 / 60 / 90 days) and assigns each a stable age and confidence, so
the same window always produces the same run and there is no hydration drift.

Classification is a `setInterval` that dispatches `tick`, sized so any window
finishes in ~48 ticks regardless of length. The effect is keyed on step, batch
size and speed, so it is React Strict Mode safe — no timer leaks on double-mount.

Moving a message re-tallies every folder count from scratch and clears the
`pushed` flag, since the labels last sent to Gmail no longer match.

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
| `speed` | `95` | Milliseconds between classification batches (30–260). |
| `showConfidence` | `true` | Hides the numeric score; the confidence bar stays. |

### Accessibility

The source is a static mockup, so the port adds what a real app needs: the
progress ring is a `role="progressbar"` with live `aria-valuetext`, email cards
expand via a real `<button>` with `aria-expanded`/`aria-controls`, folder pills
and source cards report `aria-pressed`, the window toggle is a radio group, the
"Move to" select is labelled, and the decorative activity log is hidden from
assistive tech. `prefers-reduced-motion` collapses every animation.

## Where the demo data ends

`src/lib/seed.ts` is sample content and `buildEmails` is a deterministic stand-in
for a classifier. Wiring this to a real mailbox means replacing those two and the
`push` action; nothing in the components depends on the data being fake.
