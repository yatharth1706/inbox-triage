"use client";

import { useEffect, useRef, useState } from "react";

/** easeOutCubic — decelerates into the target without overshooting it. */
const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * Interpolates towards `target` over `duration`, so a value that arrives in
 * discrete jumps (a batch of classified messages) reads as continuous motion.
 * Honours prefers-reduced-motion by snapping instead.
 */
export function useSmoothNumber(target: number, duration = 420): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    const from = valueRef.current;
    if (from === target) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cancel = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    if (reduced) {
      frameRef.current = requestAnimationFrame(() => setValue(target));
      return cancel;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * ease(t));
      frameRef.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frameRef.current = requestAnimationFrame(step);
    return cancel;
  }, [target, duration]);

  return value;
}
