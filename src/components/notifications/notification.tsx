"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, Loader2, X, ExternalLink, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  resolvedMessage?: string; // message with IDs replaced by names
  type?: string;
  actionText?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationProps {
  onClose?: () => void;
  onUnreadChange?: (count: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.villeto.com/";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function apiUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function normalise(raw: Record<string, any>): NotificationItem {
  return {
    id: raw.notificationId ?? raw.id ?? String(Math.random()),
    title: raw.title ?? raw.message ?? "New notification",
    message: raw.message ?? raw.title,
    type: raw.type,
    actionText: raw.actionText ?? raw.action_text,
    actionUrl: raw.actionUrl ?? raw.action_url,
    isRead: raw.isRead ?? raw.is_read ?? raw.read ?? false,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

/**
 * Try to resolve a UUID inside a notification message to a human-readable name.
 * Detects the entity type from the surrounding text (expense report, policy, etc.)
 * and fetches the entity from the API. Falls back gracefully.
 */
async function resolveMessageIds(
  message: string,
  accessToken: string | null
): Promise<string> {
  const matches = Array.from(new Set(message.match(UUID_RE) ?? []));
  if (!matches.length) return message;

  let resolved = message;

  for (const uuid of matches) {
    const idx = resolved.toLowerCase().indexOf(uuid.toLowerCase());
    const context = idx > 0 ? resolved.substring(0, idx).toLowerCase() : "";

    // Determine entity type from context words immediately before the UUID
    let fetchEndpoints: string[] = [];
    if (context.includes("expense report") || context.includes("report")) {
      fetchEndpoints = [
        apiUrl(`expenses/${uuid}`),
        apiUrl(`expenses/personal/${uuid}`),
        apiUrl(`expense-reports/${uuid}`),
      ];
    } else if (context.includes("policy") || context.includes("polic")) {
      fetchEndpoints = [apiUrl(`expense-policies/${uuid}`), apiUrl(`policies/${uuid}`)];
    } else if (context.includes("user") || context.includes("employee")) {
      fetchEndpoints = [apiUrl(`users/${uuid}`)];
    } else {
      // Generic fallback — try common entity endpoints
      fetchEndpoints = [apiUrl(`expenses/${uuid}`), apiUrl(`expense-reports/${uuid}`)];
    }

    let entityName: string | null = null;

    for (const endpoint of fetchEndpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) continue;
        const data = await res.json();
        const entity = data?.data ?? data;
        entityName =
          entity?.name ??
          entity?.title ??
          entity?.reportName ??
          entity?.expenseName ??
          entity?.policyName ??
          (entity?.firstName && entity?.lastName
            ? `${entity.firstName} ${entity.lastName}`
            : null) ??
          null;
        if (entityName) break;
      } catch {
        // Try next endpoint
      }
    }

    if (entityName) {
      // Replace "with ID {uuid}" → "named "{entityName}""
      resolved = resolved.replace(
        new RegExp(`(with\\s+ID\\s+)${uuid}`, "i"),
        `named "${entityName}"`
      );
      // Fallback: replace plain UUID occurrence
      resolved = resolved.replace(new RegExp(uuid, "gi"), `"${entityName}"`);
    }
  }

  return resolved;
}

import { useNotificationCountStore } from "@/hooks/useNotificationCount";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Notification({ onClose, onUnreadChange }: NotificationProps) {
  const accessToken = useAuthStore.getState().accessToken;
  const router = useRouter();
  const setGlobalUnreadCount = useNotificationCountStore((s) => s.setUnreadCount);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const sseAbortRef = useRef<AbortController | null>(null);

  // ── Only show the 3 most recent ─────────────────────────────────────────────
  const preview = notifications.slice(0, 3);
  const hasMore = notifications.length > 3;
  // ── Computed ────────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Sync global badge ────────────────────────────────────────────────────────
  useEffect(() => {
    setGlobalUnreadCount(unreadCount);
    onUnreadChange?.(unreadCount);
  }, [unreadCount, setGlobalUnreadCount, onUnreadChange]);

  // ── Auth headers ─────────────────────────────────────────────────────────────
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  // ── Fetch + resolve messages ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("events/notifications/all"), {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: Record<string, any>[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : [];

      const raw = list.map(normalise).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(raw);

      // Resolve IDs in messages asynchronously after initial render
      const resolved = await Promise.all(
        raw.map(async (n) => {
          const msg = n.message ?? "";
          if (!msg.match(UUID_RE)) return n;
          try {
            const resolvedMessage = await resolveMessageIds(msg, accessToken);
            return { ...n, resolvedMessage };
          } catch {
            return n;
          }
        })
      );
      setNotifications(resolved);
    } catch (err) {
      console.error("[Notification] fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, accessToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── SSE for real-time push ─────────────────────────────────────────────────
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
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log("[SSE Raw Text Received (Notification Panel)]:", chunk);
          buffer += chunk;
          
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            let eventData = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("data:")) eventData += line.slice(5).trimStart();
            }
            if (!eventData || eventData === ":") continue;
            try {
              const parsed = JSON.parse(eventData);
              console.log("[SSE Raw Payload (Notification panel)]:", parsed);
              const incoming = normalise(parsed);
              // Resolve IDs in the incoming message
              const msg = incoming.message ?? "";
              const resolvedMessage = msg.match(UUID_RE)
                ? await resolveMessageIds(msg, accessToken).catch(() => msg)
                : msg;

              setNotifications((prev) => {
                const idx = prev.findIndex((n) => n.id === incoming.id);
                const updated = { ...incoming, resolvedMessage };
                if (idx !== -1) {
                  const copy = [...prev];
                  copy[idx] = updated;
                  return copy;
                }
                return [updated, ...prev];
              });
            } catch {
              // heartbeat / non-JSON — ignore
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error("[Notification] SSE error:", err);
      }
    })();

    return () => controller.abort();
  }, [accessToken]);

  // ── Mark single read ─────────────────────────────────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      if (markingId) return;
      setMarkingId(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      try {
        await fetch(apiUrl(`events/notifications/mark-read/${id}`), {
          headers: authHeaders(),
          credentials: "include",
        });
      } catch {
        // Optimistic update stays; silently fail
      } finally {
        setMarkingId(null);
      }
    },
    [authHeaders, markingId]
  );

  // ── Mark all read ────────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (markingAllRead || unreadCount === 0) return;
    setMarkingAllRead(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(apiUrl("events/notifications/mark-all-read"), {
        headers: authHeaders(),
        credentials: "include",
      });
    } catch {
      fetchAll();
    } finally {
      setMarkingAllRead(false);
    }
  }, [authHeaders, markingAllRead, unreadCount, fetchAll]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden flex flex-col max-h-[80vh] min-h-[200px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">Notifications</h3>
            <p className="text-xs text-gray-400 leading-tight">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAllRead}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {markingAllRead ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              Mark all read
            </button>
          )}

          {/* Close — uses Radix DialogClose so the dialog state closes cleanly */}
          <DialogPrimitive.Close
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
          >
            <X className="w-3.5 h-3.5" />
          </DialogPrimitive.Close>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Bell className="w-7 h-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">You're all caught up!</p>
              <p className="text-xs text-gray-400 mt-0.5">No notifications yet.</p>
            </div>
          </div>
        ) : (
          preview.map((n) => {
            const displayMessage = n.resolvedMessage ?? n.message;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={[
                  "flex items-start gap-3 px-5 py-4 transition-colors group",
                  n.isRead
                    ? "bg-white"
                    : "bg-teal-50/40 cursor-pointer hover:bg-teal-50/70",
                  markingId === n.id ? "opacity-60 pointer-events-none" : "",
                ].join(" ")}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  <div className={[
                    "w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm",
                    n.isRead ? "bg-white border-gray-100" : "bg-white border-teal-100",
                  ].join(" ")}>
                    <img
                      src="/images/villeto-logo-v.png"
                      alt="Villeto"
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <p className={[
                      "text-sm leading-snug",
                      n.isRead ? "text-gray-600 font-normal" : "text-gray-900 font-medium",
                    ].join(" ")}>
                      {n.title}
                    </p>
                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-teal-500 block" />
                    )}
                  </div>

                  {/* Message */}
                  {displayMessage && displayMessage !== n.title && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {displayMessage}
                    </p>
                  )}

                  {/* Action link */}
                  {n.actionText && (
                    <a
                      href={n.actionUrl ?? "#"}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 mt-1.5 hover:underline"
                    >
                      {n.actionText}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Timestamp */}
                  <p className="text-[11px] text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer: View all ── */}
      {!loading && (
        <div className="shrink-0 border-t border-gray-100 px-5 py-3">
          <button
            onClick={() => {
              onClose?.();
              router.push("/inbox");
            }}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
          >
            View all notifications
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
