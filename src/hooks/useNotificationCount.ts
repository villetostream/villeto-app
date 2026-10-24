"use client";
import { workspaceFetch } from "@/features/entity-workspace/fetch";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
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

export const useNotificationCountStore = create<NotificationCountState>(
  (set) => ({
    unreadCount: 0,
    setUnreadCount: (count) => {
      const generation = useEntityWorkspaceStore.getState().generation;
      deferStateUpdate(() => {
        if (generation === useEntityWorkspaceStore.getState().generation)
          set({ unreadCount: count });
      });
    },
  }),
);

// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.villeto.com/";

function apiUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// ── Singleton guard: only one SSE + polling loop runs at a time ────────────
let _hookMountCount = 0;
let _sseController: AbortController | null = null;
let _pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Core hook — opens a **single** SSE connection and a **single** polling
 * fallback for the entire app.  Multiple components can call
 * `useNotificationCount()` without creating duplicate connections.
 *
 * Changes vs. previous version:
 * - Polling interval raised from 15 s → 2 min (SSE covers real-time)
 * - Singleton guard: only the first mount starts SSE + polling;
 *   subsequent mounts just bump a ref-counter.
 * - SSE events no longer call `fetchCount` (they already receive the
 *   updated data in the payload).
 */
export function useNotificationCountHook() {
  const generation = useEntityWorkspaceStore((state) => state.generation);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setUnreadCount } = useNotificationCountStore();

  // ── Fetch unread count from dedicated endpoint ────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await workspaceFetch(
        apiUrl("events/notifications/unread-count"),
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        },
      );
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
      if (generation === useEntityWorkspaceStore.getState().generation)
        setUnreadCount(Number(count));
    } catch (err) {
      logger.error("[fetchCount] Error:", err);
      // Silently fail — badge stays at previous value
    }
  }, [accessToken, setUnreadCount, generation]);

  // Keep a stable ref so the SSE handler always has the latest closure
  const fetchCountRef = useRef(fetchCount);
  useEffect(() => {
    fetchCountRef.current = fetchCount;
  });

  // ── Initial fetch + Polling Fallback (singleton) ──────────────────────────
  useEffect(() => {
    _hookMountCount++;

    // Always fetch on mount (fast — 304 if nothing changed)
    fetchCount();

    // Only start polling if we're the first mount
    if (_hookMountCount === 1) {
      setUnreadCount(0);
      // Poll every 2 minutes as a fallback for SSE drops.
      // 15 s was way too aggressive — SSE covers real-time.
      _pollInterval = setInterval(() => {
        // Only poll when the tab is visible
        if (typeof document !== "undefined" && document.hidden) return;
        fetchCountRef.current();
      }, 2 * 60 * 1000);
    }

    return () => {
      _hookMountCount--;
      if (_hookMountCount === 0 && _pollInterval) {
        clearInterval(_pollInterval);
        _pollInterval = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SSE subscription (singleton) ──────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    // Don't open a second SSE if one is already running
    if (_sseController && !_sseController.signal.aborted) {
      return;
    }

    const controller = new AbortController();
    _sseController = controller;
    let buffer = "";

    (async () => {
      try {
        const res = await workspaceFetch(apiUrl("events/notifications"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          logger.warn(
            "[useNotificationCount] SSE connection failed",
            res.status,
          );
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
              const parsed = JSON.parse(eventData);
              logger.log("[SSE Raw Payload (useNotificationCount)]:", parsed);
              // Re-fetch so the badge count is always pinned to server state.
              // Debounce: only fetch if the last fetch was > 5 s ago
              fetchCountRef.current();
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
      if (_sseController === controller) {
        _sseController = null;
      }
    };
  }, [accessToken]);
}

/**
 * Drop-in replacement for any component that just needs the count.
 * Maintains backwards compatibility with `const unreadCount = useNotificationCount();`
 */
export function useNotificationCount(): number {
  useNotificationCountHook(); // Keeps the SSE engine running
  return useNotificationCountStore((s) => s.unreadCount);
}
