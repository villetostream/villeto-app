"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Bell, Mail, AlertTriangle, FileText, CheckCheck,
  Loader2, Search, RefreshCw, X, Clock,
  ExternalLink, CheckCircle2, Calendar,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import { asRecord, getBoolean, isRecord, asArray, pickOptionalString, pickString } from "@/lib/types/api-error";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  resolvedMessage?: string;
  type?: string;
  actionText?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

type TabId = "all" | "unread" | "policy" | "messages" | "alerts";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  filter: (n: NotificationItem) => boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.villeto.com/";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function apiUrl(path: string) {
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function normalise(raw: Record<string, unknown>): NotificationItem {
  return {
    id: pickString(raw, "notificationId", "id") || String(Math.random()),
    title: pickString(raw, "title", "message") || "New notification",
    message: pickOptionalString(raw, "message", "title"),
    type: pickOptionalString(raw, "type"),
    actionText: pickOptionalString(raw, "actionText", "action_text"),
    actionUrl: pickOptionalString(raw, "actionUrl", "action_url"),
    isRead: getBoolean(raw.isRead) || getBoolean(raw.is_read) || getBoolean(raw.read),
    createdAt: pickString(raw, "createdAt", "created_at") || new Date().toISOString(),
  };
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } catch {
    return "";
  }
}

/** Guess notification category from type or title/message content */
function inferCategory(n: NotificationItem): "policy" | "message" | "alert" | "other" {
  const text = `${n.type ?? ""} ${n.title} ${n.message ?? ""}`.toLowerCase();
  if (text.includes("policy") || text.includes("violation") || text.includes("polic")) return "policy";
  if (text.includes("message") || text.includes("inbox") || text.includes("chat")) return "message";
  if (text.includes("alert") || text.includes("warning") || text.includes("urgent") || text.includes("failed")) return "alert";
  return "other";
}

async function resolveMessageIds(message: string, accessToken: string | null): Promise<string> {
  const matches = Array.from(new Set(message.match(UUID_RE) ?? []));
  if (!matches.length) return message;

  let resolved = message;
  for (const uuid of matches) {
    const idx = resolved.toLowerCase().indexOf(uuid.toLowerCase());
    const context = idx > 0 ? resolved.substring(0, idx).toLowerCase() : "";

    let endpoints: string[] = [];
    if (context.includes("expense report") || context.includes("report")) {
      endpoints = [apiUrl(`expenses/${uuid}`), apiUrl(`expenses/personal/${uuid}`), apiUrl(`expense-reports/${uuid}`)];
    } else if (context.includes("policy") || context.includes("polic")) {
      endpoints = [apiUrl(`expense-policies/${uuid}`), apiUrl(`policies/${uuid}`)];
    } else if (context.includes("user") || context.includes("employee")) {
      endpoints = [apiUrl(`users/${uuid}`)];
    } else {
      endpoints = [apiUrl(`expenses/${uuid}`), apiUrl(`expense-reports/${uuid}`)];
    }

    let name: string | null = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), "Content-Type": "application/json" },
          credentials: "include",
        });
        if (!res.ok) continue;
        const data = await res.json();
        const e = asRecord(isRecord(data) ? (data.data ?? data) : data);
        const fullName =
          pickString(e, "firstName") && pickString(e, "lastName")
            ? `${pickString(e, "firstName")} ${pickString(e, "lastName")}`
            : "";
        name =
          pickOptionalString(e, "name", "title", "reportName", "expenseName", "policyName") ??
          (fullName || null);
        if (name) break;
      } catch { /* try next */ }
    }

    if (name) {
      resolved = resolved.replace(new RegExp(`(with\\s+ID\\s+)${uuid}`, "i"), `named "${name}"`);
      resolved = resolved.replace(new RegExp(uuid, "gi"), `"${name}"`);
    }
  }
  return resolved;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  { id: "all",      label: "All",             icon: <Bell className="w-4 h-4" />,          filter: () => true },
  { id: "unread",   label: "Unread",          icon: <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />, filter: (n) => !n.isRead },
  { id: "policy",   label: "Policy",          icon: <FileText className="w-4 h-4" />,       filter: (n) => inferCategory(n) === "policy" },
  { id: "messages", label: "Messages",        icon: <Mail className="w-4 h-4" />,           filter: (n) => inferCategory(n) === "message" },
  { id: "alerts",   label: "Alerts",          icon: <AlertTriangle className="w-4 h-4" />,  filter: (n) => inferCategory(n) === "alert" },
];

// ─── Category chip ────────────────────────────────────────────────────────────

function CategoryChip({ category }: { category: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    policy:  { label: "Policy",  cls: "bg-orange-50 text-orange-600 border-orange-100" },
    message: { label: "Message", cls: "bg-blue-50 text-blue-600 border-blue-100" },
    alert:   { label: "Alert",   cls: "bg-red-50 text-red-600 border-red-100" },
    other:   { label: "System",  cls: "bg-gray-50 text-gray-500 border-gray-100" },
  };
  const cfg = map[category] ?? map.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

import { useNotificationCountStore } from "@/hooks/useNotificationCount";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const accessToken = useAuthStore.getState().accessToken;
  const setGlobalUnreadCount = useNotificationCountStore((s) => s.setUnreadCount);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  const sseAbortRef = useRef<AbortController | null>(null);

  // ── Auth headers ─────────────────────────────────────────────────────────────
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  // ── Fetch all ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch(apiUrl("events/notifications/all"), { headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const jsonRecord = asRecord(json);
      const rawList = Array.isArray(json)
        ? json
        : asArray(jsonRecord.data);
      const list = rawList.filter(isRecord).map(asRecord);
      const raw = list.map(normalise).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(raw);

      // Resolve IDs async
      Promise.all(raw.map(async (n) => {
        const msg = n.message ?? "";
        if (!msg.match(UUID_RE)) return n;
        try { return { ...n, resolvedMessage: await resolveMessageIds(msg, accessToken) }; }
        catch { return n; }
      })).then(setNotifications);
    } catch (err) {
      console.error("[Inbox] fetchAll error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeaders, accessToken]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchAll();
    });
  }, [fetchAll]);

  // ── SSE ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    sseAbortRef.current = controller;
    let buffer = "";

    (async () => {
      try {
        const res = await fetch(apiUrl("events/notifications"), {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "text/event-stream", "Cache-Control": "no-cache" },
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
          console.log("[SSE Raw Text Received (Inbox)]:", chunk);
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
              console.log("[SSE Raw Payload (Inbox Page)]:", parsed);
              const incoming = normalise(asRecord(parsed));
              const msg = incoming.message ?? "";
              const resolvedMessage = msg.match(UUID_RE)
                ? await resolveMessageIds(msg, accessToken).catch(() => msg)
                : msg;
              setNotifications((prev) => {
                const idx = prev.findIndex((n) => n.id === incoming.id);
                const updated = { ...incoming, resolvedMessage };
                if (idx !== -1) { const copy = [...prev]; copy[idx] = updated; return copy; }
                return [updated, ...prev];
              });
            } catch { /* heartbeat */ }
          }
        }
      } catch (err: unknown) {
        if (!(isRecord(err) && err.name === "AbortError")) console.error("[Inbox] SSE error:", err);
      }
    })();
    return () => controller.abort();
  }, [accessToken]);

  // ── Mark single read ─────────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    if (markingId) return;
    setMarkingId(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(apiUrl(`events/notifications/mark-read/${id}`), { headers: authHeaders(), credentials: "include" });
    } catch { /* optimistic stays */ } finally { setMarkingId(null); }
  }, [authHeaders, markingId]);

  // ── Mark all read ────────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(apiUrl("events/notifications/mark-all-read"), { headers: authHeaders(), credentials: "include" });
    } catch { fetchAll(true); } finally { setMarkingAllRead(false); }
  }, [authHeaders, markingAllRead, fetchAll]);

  // ── Derived lists ────────────────────────────────────────────────────────────
  const tabFilter = TABS.find((t) => t.id === activeTab)?.filter ?? (() => true);
  const filtered = notifications
    .filter(tabFilter)
    .filter((n) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || (n.message ?? "").toLowerCase().includes(q);
    });

  const totalUnread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    setGlobalUnreadCount(totalUnread);
  }, [totalUnread, setGlobalUnreadCount]);
  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50/50">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100 px-8 pt-8 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalUnread > 0
                ? `${totalUnread} unread notification${totalUnread !== 1 ? "s" : ""}`
                : "All notifications read"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Mark all as read */}
            {totalUnread > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAllRead}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {markingAllRead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 -mb-px">
          {TABS.map((tab) => {
            const count = notifications.filter(tab.filter).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                ].join(" ")}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={[
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                    isActive ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-8 py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="w-full pl-9 pr-9 h-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 px-8 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-600">
                {search ? "No results found" : "Nothing here yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {search ? `No notifications match "${search}"` : "Check back later for new notifications."}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {filtered.map((n) => {
              const category = inferCategory(n);
              const displayMessage = n.resolvedMessage ?? n.message;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    // Mark as read then open detail sheet
                    if (!n.isRead) markRead(n.id);
                    setSelected({ ...n, isRead: true });
                  }}
                  className={[
                    "flex items-start gap-4 px-6 py-5 transition-colors cursor-pointer",
                    n.isRead ? "bg-white hover:bg-gray-50/60" : "bg-teal-50/30 hover:bg-teal-50/60",
                    markingId === n.id ? "opacity-60 pointer-events-none" : "",
                  ].join(" ")}
                >
                  {/* Unread indicator bar */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${n.isRead ? "bg-transparent" : "bg-teal-500"}`} />

                  {/* Avatar */}
                  <div className={[
                    "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm",
                    n.isRead ? "bg-white border-gray-100" : "bg-white border-teal-100",
                  ].join(" ")}>
                    <Image src="/images/villeto-logo-v.png" alt="Villeto" width={24} height={24} className="w-6 h-6 object-contain" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <CategoryChip category={category} />
                          <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className={`text-sm leading-snug ${n.isRead ? "text-gray-600 font-normal" : "text-gray-900 font-semibold"}`}>
                          {n.title}
                        </p>
                        {displayMessage && displayMessage !== n.title && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{displayMessage}</p>
                        )}
                        {n.actionText && (
                          <a
                            href={n.actionUrl ?? "#"}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 mt-2 hover:underline"
                          >
                            {n.actionText} →
                          </a>
                        )}
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-teal-500 block" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Notification detail sheet ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col gap-0">
          {selected && (
            <>
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100">
                <div className="flex items-start gap-3 flex-1 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                    <Image src="/images/villeto-logo-v.png" alt="Villeto" width={24} height={24} className="w-6 h-6 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CategoryChip category={inferCategory(selected)} />
                      {selected.isRead ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                          <CheckCircle2 className="w-3 h-3" /> Read
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" /> Unread
                        </span>
                      )}
                    </div>
                    <SheetTitle className="text-base font-semibold text-gray-900 leading-snug">
                      {selected.title}
                    </SheetTitle>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {new Date(selected.createdAt).toLocaleDateString("en-GB", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                  <span className="text-gray-300">·</span>
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>
                    {new Date(selected.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400 text-xs">{timeAgo(selected.createdAt)}</span>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100" />

                {/* Full message */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selected.resolvedMessage ?? selected.message ?? selected.title}
                  </div>
                </div>

                {/* Meta details */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</p>
                  <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Type</span>
                      <CategoryChip category={inferCategory(selected)} />
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Status</span>
                      <span className={`text-xs font-semibold ${selected.isRead ? "text-gray-400" : "text-teal-600"}`}>
                        {selected.isRead ? "Read" : "Unread"}
                      </span>
                    </div>
                    {selected.type && (
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs text-gray-500 font-medium">Category</span>
                        <span className="text-xs text-gray-700 font-medium capitalize">{selected.type}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-500 font-medium">Received</span>
                      <span className="text-xs text-gray-700">{timeAgo(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Action link */}
                {selected.actionText && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Action Required</p>
                    <a
                      href={selected.actionUrl ?? "#"}
                      className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors group"
                    >
                      <span className="text-sm font-medium text-teal-700">{selected.actionText}</span>
                      <ExternalLink className="w-4 h-4 text-teal-500 group-hover:text-teal-700 transition-colors" />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-gray-100 px-6 py-4 flex items-center gap-3">
                {!selected.isRead && (
                  <button
                    onClick={() => {
                      markRead(selected.id);
                      setSelected({ ...selected, isRead: true });
                    }}
                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark as read
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 hover:border-gray-300 bg-white text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}