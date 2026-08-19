"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const LAST_ACTIVITY_KEY = "villeto_lastActivityTime";

export default function IdleSessionManager() {
  const { logout, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    // Initialize last activity time if not set
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    const handleUserActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const checkIdleStatus = () => {
      const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (!lastActivityStr) return;

      const lastActivity = parseInt(lastActivityStr, 10);
      const currentTime = Date.now();

      if (currentTime - lastActivity > IDLE_TIMEOUT_MS) {
        // User has been idle for more than the timeout duration
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        logout();
        window.location.href = "/login";
      }
    };

    // Events that denote user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel"
    ];

    // Attach activity event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Also update activity on focus or visibility change
    window.addEventListener("focus", handleUserActivity);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkIdleStatus();
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    // Check idle status periodically (e.g., every minute)
    const intervalId = setInterval(checkIdleStatus, 60 * 1000);

    // Initial check in case they were asleep and just woke up and loaded a cached page
    checkIdleStatus();

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener("focus", handleUserActivity);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [logout, router, user]);

  return null;
}
