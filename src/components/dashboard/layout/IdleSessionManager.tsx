"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { logoutAndRedirect } from "@/lib/logout";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const CHECK_INTERVAL_MS = 60 * 1000;    // Check every minute
const LAST_ACTIVITY_KEY = "villeto_lastActivityTime";

export default function IdleSessionManager() {
  // Track whether the user is logged in, but don't include it in the effect
  // deps — we want the listeners to stay alive across re-renders. We'll read
  // the current value from the store inside callbacks instead.
  const isLoggedIn = !!useAuthStore((s) => s.user);

  // Use a stable ref so we never have to tear-down/re-attach listeners when
  // the user navigates between pages (which changes the router reference).
  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  });

  useEffect(() => {
    // Initialise last-activity timestamp once (idempotent).
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    const updateActivity = () => {
      // Only track activity while a session is active.
      if (!isLoggedInRef.current) return;
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const checkIdle = () => {
      if (!isLoggedInRef.current) return;

      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!lastActivityStr) return;

      const elapsed = Date.now() - parseInt(lastActivityStr, 10);
      if (elapsed > IDLE_TIMEOUT_MS) {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        logoutAndRedirect();
      }
    };

    // Activity events that reset the idle clock.
    const ACTIVITY_EVENTS = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ] as const;

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, updateActivity, { passive: true }),
    );
    window.addEventListener("focus", updateActivity);

    // visibilitychange fires on the document, not the window.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkIdle();
        updateActivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Periodic check — catches the case where the tab stays open but idle.
    const intervalId = setInterval(checkIdle, CHECK_INTERVAL_MS);

    // Immediate check on mount (e.g. user woke their laptop and the cached
    // page re-hydrated with a very old lastActivityTime).
    checkIdle();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, updateActivity),
      );
      window.removeEventListener("focus", updateActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
    // Empty deps: we intentionally run this effect once for the lifetime of
    // the component. Auth state is read through the ref above, not via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
