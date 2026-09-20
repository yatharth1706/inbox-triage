"use client";

import { useEffect, useMemo, useReducer } from "react";
import { categoryById } from "@/lib/categories";
import { buildEmails, messageCountFor, runTimestamp } from "@/lib/emails";
import type {
  CategoryCounts,
  CategoryId,
  Email,
  FolderFilter,
  LogLine,
  RangeDays,
  SourceKey,
  Step,
} from "@/lib/types";

/** Messages per tick are sized so any window finishes in ~48 ticks. */
const TICKS_PER_RUN = 48;
const LOG_LINES = 4;
/** Cards rendered for the selected folder. */
const VISIBLE_LIMIT = 36;

interface RunState {
  step: Step;
  source: SourceKey;
  range: RangeDays;
  emails: Email[];
  processed: number;
  counts: CategoryCounts;
  log: LogLine[];
  selected: FolderFilter;
  pushed: boolean;
  openId: number | null;
}

type Action =
  | { type: "selectSource"; source: SourceKey }
  | { type: "selectRange"; range: RangeDays }
  | { type: "start" }
  | { type: "tick"; batch: number }
  | { type: "selectFolder"; folder: FolderFilter }
  | { type: "toggleOpen"; id: number }
  | { type: "move"; id: number; category: CategoryId }
  | { type: "push" }
  | { type: "reset" };

const INITIAL: RunState = {
  step: "connect",
  source: "gmail",
  range: 30,
  emails: [],
  processed: 0,
  counts: {},
  log: [],
  selected: "all",
  pushed: false,
  openId: null,
};

function tally(emails: readonly Email[]): CategoryCounts {
  const counts: CategoryCounts = {};
  for (const email of emails) {
    counts[email.category] = (counts[email.category] ?? 0) + 1;
  }
  return counts;
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "selectSource":
      return { ...state, source: action.source };

    case "selectRange":
      return { ...state, range: action.range };

    case "start":
      return {
        ...state,
        step: "running",
        emails: buildEmails(state.range),
        processed: 0,
        counts: {},
        log: [],
        selected: "all",
        pushed: false,
        openId: null,
      };

    case "tick": {
      if (state.processed >= state.emails.length) {
        return state.step === "done" ? state : { ...state, step: "done" };
      }
      const next = Math.min(state.processed + action.batch, state.emails.length);
      const counts = { ...state.counts };
      const lines: LogLine[] = [];
      for (let i = state.processed; i < next; i++) {
        const email = state.emails[i];
        counts[email.category] = (counts[email.category] ?? 0) + 1;
        const label = categoryById(email.category).label.toLowerCase();
        lines.unshift({
          t: runTimestamp(i),
          text: `→ ${label}  ${email.subject.slice(0, 24)}`,
        });
      }
      return {
        ...state,
        processed: next,
        counts,
        log: [...lines, ...state.log].slice(0, LOG_LINES),
      };
    }

    case "selectFolder":
      return { ...state, selected: action.folder, openId: null };

    case "toggleOpen":
      return { ...state, openId: state.openId === action.id ? null : action.id };

    case "move": {
      const emails = state.emails.map((email) =>
        email.id === action.id ? { ...email, category: action.category } : email,
      );
      // Moving a message invalidates whatever was last pushed to Gmail.
      return { ...state, emails, counts: tally(emails), pushed: false };
    }

    case "push":
      return { ...state, pushed: true };

    case "reset":
      return { ...INITIAL, source: state.source, range: state.range };
  }
}

export function useTriageRun(speed: number) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const batch = state.emails.length
    ? Math.max(1, Math.round(state.emails.length / TICKS_PER_RUN))
    : 1;

  useEffect(() => {
    if (state.step !== "running") return;
    const id = setInterval(() => dispatch({ type: "tick", batch }), speed);
    return () => clearInterval(id);
  }, [state.step, batch, speed]);

  /** Falls back to the window estimate before a run has been built. */
  const total = state.emails.length || messageCountFor(state.range);
  const percent = state.emails.length
    ? Math.round((state.processed / state.emails.length) * 100)
    : 0;

  const current = useMemo(
    () => state.emails[Math.min(state.processed, state.emails.length - 1)],
    [state.emails, state.processed],
  );

  const pool = useMemo(
    () =>
      state.selected === "all"
        ? state.emails
        : state.emails.filter((email) => email.category === state.selected),
    [state.emails, state.selected],
  );

  const visible = useMemo(() => pool.slice(0, VISIBLE_LIMIT), [pool]);

  const actions = useMemo(
    () => ({
      selectSource: (source: SourceKey) => dispatch({ type: "selectSource", source }),
      selectRange: (range: RangeDays) => dispatch({ type: "selectRange", range }),
      start: () => dispatch({ type: "start" }),
      selectFolder: (folder: FolderFilter) => dispatch({ type: "selectFolder", folder }),
      toggleOpen: (id: number) => dispatch({ type: "toggleOpen", id }),
      move: (id: number, category: CategoryId) => dispatch({ type: "move", id, category }),
      push: () => dispatch({ type: "push" }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [],
  );

  return { state, actions, total, percent, current, pool, visible };
}

export type TriageRun = ReturnType<typeof useTriageRun>;
export type TriageActions = TriageRun["actions"];

export { VISIBLE_LIMIT };
