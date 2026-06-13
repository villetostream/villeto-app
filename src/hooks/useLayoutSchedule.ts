"use client";

import { useCallback, useEffect, useRef } from "react";
import { deferStateUpdate } from "@/lib/defer-state-update";

type LayoutScheduleOptions = {
  /** When false, no listeners or polling are registered. */
  enabled?: boolean;
  /** Poll interval while enabled (ms). 0 = events only. */
  pollMs?: number;
};

/**
 * Schedules layout reads/writes on rAF, then defers setState to a macrotask.
 * Avoids startTransition + extension hooks that break React 19 FiberRootNode.
 */
export function useLayoutSchedule(
  callback: () => void,
  options?: LayoutScheduleOptions
) {
  const enabled = options?.enabled ?? true;
  const pollMs = options?.pollMs ?? 0;

  const callbackRef = useRef(callback);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const schedule = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      deferStateUpdate(() => {
        callbackRef.current();
      });
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    schedule();

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { capture: true, passive: true });

    const pollId =
      pollMs > 0 ? window.setInterval(schedule, pollMs) : undefined;

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pollId != null) clearInterval(pollId);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [schedule, pollMs, callback, enabled]);
}
