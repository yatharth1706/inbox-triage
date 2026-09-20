"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { categoryById } from "@/lib/categories";
import { buildEmails, messageCountFor, runTimestamp } from "@/lib/emails";
import { readRunEvents } from "@/lib/run-events";
import { clearRun, loadRun, saveRun, type StoredRun } from "@/lib/run-storage";
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

/** Demo runs are paced so any window finishes in ~48 ticks. */
const TICKS_PER_RUN = 48;
const LOG_LINES = 4;
const VISIBLE_LIMIT = 36;

interface RunState {
  step: Step;
  source: SourceKey;
  range: RangeDays;
  /** Demo replays canned data; live streams real classified mail. */
  mode: "demo" | "live";
  /** Demo only: built up front, revealed by ticks. */
  queue: Email[];
  classified: Email[];
  total: number;
  log: LogLine[];
  selected: FolderFilter;
  openId: string | null;
  error: string | null;
  capped: boolean;
  failures: number;
  bodies: Record<string, string>;
  loadingBody: string | null;
  /** "demo" or the Gmail address these results came from. */
  account: string | null;
  /** Set only when the results were restored from a previous visit. */
  savedAt: number | null;
  /** False once localStorage refuses to hold the run (quota, private mode). */
  persisted: boolean;
  /** Blocks the first paint until the restore check has run. */
  hydrated: boolean;
  /** True when the in-memory run differs from what is on disk. */
  dirty: boolean;
}

type Action =
  | { type: "selectSource"; source: SourceKey }
  | { type: "selectRange"; range: RangeDays }
  | { type: "startDemo"; account: string }
  | { type: "tick"; batch: number }
  | { type: "startLive"; account: string }
  | { type: "liveMeta"; total: number; capped: boolean }
  | { type: "liveMessage"; email: Email }
  | { type: "finish"; failures?: number }
  | { type: "fail"; message: string }
  | { type: "selectFolder"; folder: FolderFilter }
  | { type: "toggleOpen"; id: string }
  | { type: "move"; id: string; category: CategoryId }
  | { type: "bodyLoading"; id: string }
  | { type: "bodyLoaded"; id: string; body: string }
  | { type: "restore"; run: StoredRun }
  | { type: "hydrated" }
  | { type: "persistFailed" }
  | { type: "reset" };

const INITIAL: RunState = {
  step: "connect",
  source: "gmail",
  range: 30,
  mode: "demo",
  queue: [],
  classified: [],
  total: 0,
  log: [],
  selected: "all",
  openId: null,
  error: null,
  capped: false,
  failures: 0,
  bodies: {},
  loadingBody: null,
  account: null,
  savedAt: null,
  persisted: true,
  hydrated: false,
  dirty: false,
};

function logLine(email: Email, index: number): LogLine {
  return {
    t: runTimestamp(index),
    text: `→ ${categoryById(email.category).label.toLowerCase()}  ${email.subject.slice(0, 24)}`,
  };
}

const clearedRun = {
  classified: [],
  queue: [],
  log: [],
  selected: "all" as FolderFilter,
  openId: null,
  error: null,
  capped: false,
  failures: 0,
  savedAt: null,
  persisted: true,
  dirty: false,
};

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "selectSource":
      return { ...state, source: action.source, error: null };

    case "selectRange":
      return { ...state, range: action.range };

    case "startDemo": {
      const queue = buildEmails(state.range);
      return {
        ...state,
        ...clearedRun,
        step: "running",
        mode: "demo",
        queue,
        total: queue.length,
        account: action.account,
      };
    }

    case "tick": {
      if (state.queue.length === 0) {
        // Demo runs end here rather than via "finish", so mark them for saving too.
        return state.step === "done" ? state : { ...state, step: "done", dirty: true };
      }
      const revealed = state.queue.slice(0, action.batch);
      const lines = revealed.map((email, i) => logLine(email, state.classified.length + i));
      return {
        ...state,
        queue: state.queue.slice(action.batch),
        classified: [...state.classified, ...revealed],
        log: [...lines.reverse(), ...state.log].slice(0, LOG_LINES),
      };
    }

    case "startLive":
      return {
        ...state,
        ...clearedRun,
        step: "running",
        mode: "live",
        total: 0,
        account: action.account,
      };

    case "liveMeta":
      return { ...state, total: action.total, capped: action.capped };

    case "liveMessage":
      return {
        ...state,
        classified: [...state.classified, action.email],
        log: [logLine(action.email, state.classified.length), ...state.log].slice(0, LOG_LINES),
      };

    case "finish":
      return { ...state, step: "done", failures: action.failures ?? 0, dirty: true };

    case "fail":
      // Keep whatever was classified before the failure rather than discarding it.
      return state.classified.length > 0
        ? { ...state, step: "done", error: action.message }
        : { ...state, step: "connect", error: action.message };

    case "selectFolder":
      return { ...state, selected: action.folder, openId: null };

    case "toggleOpen":
      return { ...state, openId: state.openId === action.id ? null : action.id };

    case "move":
      return {
        ...state,
        classified: state.classified.map((email) =>
          email.id === action.id ? { ...email, category: action.category } : email,
        ),
        dirty: true,
      };

    case "bodyLoading":
      return { ...state, loadingBody: action.id };

    case "bodyLoaded":
      return {
        ...state,
        bodies: { ...state.bodies, [action.id]: action.body },
        loadingBody: state.loadingBody === action.id ? null : state.loadingBody,
      };

    case "restore":
      return {
        ...state,
        step: "done",
        mode: action.run.account === "demo" ? "demo" : "live",
        classified: action.run.emails,
        total: action.run.total,
        capped: action.run.capped,
        failures: action.run.failures,
        account: action.run.account,
        savedAt: action.run.savedAt,
        hydrated: true,
        dirty: false,
      };

    case "hydrated":
      return { ...state, hydrated: true };

    case "persistFailed":
      return { ...state, persisted: false };

    case "reset":
      return {
        ...INITIAL,
        source: state.source,
        range: state.range,
        bodies: state.bodies,
        hydrated: true,
      };
  }
}

export function useTriageRun(speed: number, gmailAccount: string | null) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const accountRef = useRef(gmailAccount);

  // Synced after render, never during it. Event handlers fire after effects
  // have flushed, so callbacks always read the committed state.
  useEffect(() => {
    stateRef.current = state;
    accountRef.current = gmailAccount;
  });

  // Restore a previous visit's run. localStorage is unavailable during SSR, so
  // this deliberately waits for mount rather than using a lazy initialiser.
  useEffect(() => {
    const saved = loadRun();
    dispatch(saved ? { type: "restore", run: saved } : { type: "hydrated" });
  }, []);

  // Demo pacing. Live runs advance on stream events instead.
  useEffect(() => {
    if (state.step !== "running" || state.mode !== "demo") return;
    const batch = Math.max(1, Math.round(state.total / TICKS_PER_RUN));
    const id = setInterval(() => dispatch({ type: "tick", batch }), speed);
    return () => clearInterval(id);
  }, [state.step, state.mode, state.total, speed]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const startLive = useCallback(async (range: RangeDays, account: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "startLive", account });

    try {
      const response = await fetch("/api/triage/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        dispatch({
          type: "fail",
          message:
            detail?.error ??
            (response.status === 401
              ? "Gmail is not connected. Authorise it and try again."
              : "Could not start the run."),
        });
        return;
      }

      for await (const event of readRunEvents(response.body, controller.signal)) {
        if (event.type === "meta") {
          dispatch({ type: "liveMeta", total: event.total, capped: event.capped });
        } else if (event.type === "message") {
          dispatch({ type: "liveMessage", email: event.email });
        } else if (event.type === "done") {
          dispatch({ type: "finish", failures: event.failures });
        } else {
          dispatch({ type: "fail", message: event.message });
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: "fail",
        message: error instanceof Error ? error.message : "The run was interrupted.",
      });
    }
  }, []);

  const loadBody = useCallback(async (id: string) => {
    const current = stateRef.current;
    if (current.mode !== "live" || current.bodies[id] || current.loadingBody === id) return;

    dispatch({ type: "bodyLoading", id });
    try {
      const response = await fetch(`/api/messages/body?id=${encodeURIComponent(id)}`);
      const payload = (await response.json()) as { body?: string; error?: string };
      dispatch({
        type: "bodyLoaded",
        id,
        body: response.ok ? (payload.body ?? "") : "Could not load this message.",
      });
    } catch {
      dispatch({ type: "bodyLoaded", id, body: "Could not load this message." });
    }
  }, []);

  const actions = useMemo(
    () => ({
      selectSource: (source: SourceKey) => dispatch({ type: "selectSource", source }),
      selectRange: (range: RangeDays) => dispatch({ type: "selectRange", range }),
      start: () => {
        const { source, range } = stateRef.current;
        if (source === "demo") dispatch({ type: "startDemo", account: "demo" });
        else void startLive(range, accountRef.current ?? "gmail");
      },
      selectFolder: (folder: FolderFilter) => dispatch({ type: "selectFolder", folder }),
      toggleOpen: (id: string) => {
        const wasOpen = stateRef.current.openId === id;
        dispatch({ type: "toggleOpen", id });
        if (!wasOpen) void loadBody(id);
      },
      move: (id: string, category: CategoryId) => dispatch({ type: "move", id, category }),
      reset: () => {
        abortRef.current?.abort();
        dispatch({ type: "reset" });
      },
      /** Forgets the saved run on this device as well as the in-memory one. */
      forget: () => {
        abortRef.current?.abort();
        clearRun();
        dispatch({ type: "reset" });
      },
    }),
    [startLive, loadBody],
  );

  // Persist finished runs, including any reclassification the user makes.
  useEffect(() => {
    if (!state.dirty || state.step !== "done") return;
    if (state.classified.length === 0 || !state.account) return;
    const ok = saveRun({
      account: state.account,
      total: state.total,
      capped: state.capped,
      failures: state.failures,
      emails: state.classified,
    });
    if (!ok) dispatch({ type: "persistFailed" });
  }, [
    state.dirty,
    state.step,
    state.classified,
    state.account,
    state.total,
    state.capped,
    state.failures,
  ]);

  // Derived, never stored: a move can never desync the folder counts.
  const counts = useMemo<CategoryCounts>(() => {
    const tally: CategoryCounts = {};
    for (const email of state.classified) {
      tally[email.category] = (tally[email.category] ?? 0) + 1;
    }
    return tally;
  }, [state.classified]);

  const processed = state.classified.length;
  /** Before a run, fall back to the demo window estimate. */
  const total = state.total || (state.source === "demo" ? messageCountFor(state.range) : 0);
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
  const current = state.classified[processed - 1] ?? state.queue[0];

  const pool = useMemo(
    () =>
      state.selected === "all"
        ? state.classified
        : state.classified.filter((email) => email.category === state.selected),
    [state.classified, state.selected],
  );

  const visible = useMemo(() => pool.slice(0, VISIBLE_LIMIT), [pool]);

  return { state, actions, counts, processed, total, percent, current, pool, visible };
}

export type TriageRun = ReturnType<typeof useTriageRun>;
export { VISIBLE_LIMIT };
