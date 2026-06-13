import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { create } from "zustand";
import { deferStateUpdate } from "@/lib/defer-state-update";
import { logger } from "@/lib/logger";

// ── Global Store for Unread Count ──────────────────────────────────────────
interface NotificationCountState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useNotificationCountStore = create<NotificationCountState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) =>
    deferStateUpdate(() => set({ unreadCount: count })),
}));

// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.villeto.com/";

function apiUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function useNotificationCountHook() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setUnreadCount } = useNotificationCountStore();
  const sseAbortRef = useRef<AbortController | null>(null);

  // ── Fetch unread count from dedicated endpoint ────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(apiUrl("events/notifications/unread-count"), {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      logger.log("[fetchCount] Raw response:", json);

      // Handle Villeto response format: { status: 200, data: 5 }
      let count = 0;
      if (typeof json === "number") count = json;
      else if (typeof json?.data === "number") count = json.data;
      else if (typeof json?.count === "number") count = json.count;
      else if (typeof json?.data?.count === "number") count = json.data.count;
      else if (typeof json?.unreadCount === "number") count = json.unreadCount;
      
      logger.log("[fetchCount] Extracted count:", count);
      setUnreadCount(Number(count));
    } catch (err) {
      logger.error("[fetchCount] Error:", err);
      // Silently fail — badge stays at previous value
    }
  }, [accessToken, setUnreadCount]);

  // Initial fetch on mount / when token changes + Polling Fallback
  useEffect(() => {
    fetchCount();
    // Bulletproof fallback: Poll every 15 seconds so changes are ALWAYS
    // picked up automatically, even if SSE drops or network stutters.
    const interval = setInterval(fetchCount, 15000);
    
    return () => clearInterval(interval);
  }, [fetchCount]);

  // ── SSE subscription ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    sseAbortRef.current = controller;
    let buffer = "";

    (async () => {
      try {
        const res = await fetch(apiUrl("events/notifications"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          logger.warn("[useNotificationCount] SSE connection failed", res.status);
          return;
        }

        logger.log("[useNotificationCount] SSE connected successfully");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          logger.log("[SSE Raw Text Received (useNotificationCount)]:", chunk);
          buffer += chunk;
          
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            let eventData = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("data:")) {
                eventData += line.slice(5).trimStart();
              }
            }
            if (!eventData || eventData === ":") continue; // skip heartbeats

            try {
              const parsed = JSON.parse(eventData); // validate it's real JSON
              logger.log("[SSE Raw Payload (useNotificationCount)]:", parsed);
              // Re-fetch so the badge count is always pinned to server state
              fetchCount();
            } catch {
              // Not JSON (heartbeat / comment line) — ignore
            }
          }
        }
      } catch (err: unknown) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          logger.error("[useNotificationCount] SSE error:", err);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [accessToken, fetchCount]);
}

/** 
 * Drop-in replacement for any component that just needs the count.
 * Maintains backwards compatibility with `const unreadCount = useNotificationCount();`
 */
export function useNotificationCount(): number {
  useNotificationCountHook(); // Keeps the SSE engine running
  return useNotificationCountStore((s) => s.unreadCount);
}
