"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { Search, Eye, Download, ChevronDown, Loader2, RefreshCw, Plus, ArrowRight } from "lucide-react";
import { useGetPurchaseRequests } from "@/actions/procurement/purchase-requests";
import type { PRStatus, PRPriority, PurchaseRequest } from "@/actions/procurement/purchase-requests";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:           { label: "Draft",           className: "text-amber-600 bg-amber-50" },
  submitted:       { label: "Submitted",       className: "text-blue-600 bg-blue-50" },
  converted_to_po: { label: "Converted to PO", className: "text-emerald-600 bg-emerald-50" },
  cancelled:       { label: "Cancelled",       className: "text-red-500 bg-red-50" },
};

const PRIORITY_CFG: Record<string, { label: string; className: string }> = {
  low:    { label: "Low",    className: "text-slate-500 bg-slate-100" },
  medium: { label: "Medium", className: "text-orange-500 bg-orange-50" },
  urgent: { label: "High",   className: "text-red-500 bg-red-50" },
};

export function PRStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || { label: status, className: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PRPriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CFG[priority] || { label: priority, className: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",             label: "All Requests",   status: "" },
  { key: "draft",           label: "Drafts",         status: "draft" },
  { key: "submitted",       label: "Submitted",      status: "submitted" },
  { key: "converted_to_po", label: "Converted to PO", status: "converted_to_po" },
  { key: "cancelled",       label: "Cancelled",      status: "cancelled" },
];

const PRIORITY_OPTIONS = [
  { label: "All Priorities", value: "" },
  { label: "Low",    value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High",   value: "urgent" },
];

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  total, page, perPage, onPage, onPerPage, totalPages,
}: {
  total: number; page: number; perPage: number;
  onPage: (p: number) => void; onPerPage: (n: number) => void; totalPages: number;
}) {
  const start = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total);
  const end   = Math.min(page * perPage, total);
  const maxVisible = 7;
  const pages: (number | "...")[] = [];

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Showing {start}–{end} of {total}</span>
        <div className="relative">
          <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
            className="appearance-none pl-2 pr-6 py-1 rounded border border-border text-sm bg-white cursor-pointer focus:outline-none">
            {[10, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Previous
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-muted-foreground">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p as number)}
              className={`w-8 h-8 rounded border text-sm font-medium transition-colors ${p === page ? "bg-primary text-white border-primary" : "border-border bg-white hover:bg-muted/40"}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseRequestPage() {
  const router = useRouter();
  const { setAction, clearAction } = useHeaderActionStore();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority]   = useState("");
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeTab, priority]);

  useEffect(() => {
    setAction({ label: "Create Request", onClick: () => router.push("/procurement/purchase-request/new") });
    return () => clearAction();
  }, [setAction, clearAction, router]);

  const currentTabStatus = TABS.find(t => t.key === activeTab)?.status || "";

  const { data, isLoading, isError, refetch } = useGetPurchaseRequests({
    status: currentTabStatus || undefined,
    priority: priority || undefined,
    search: debouncedSearch || undefined,
  });

  const requests: PurchaseRequest[] = data?.data || [];
  const meta = data?.meta;
  const totalCount = meta?.totalCount || requests.length;
  const totalPages = meta?.totalPages || Math.ceil(totalCount / perPage);

  // Client-side pagination if API doesn't paginate
  const paginated = useMemo(() => {
    if (meta) return requests; // Server-side pagination
    return requests.slice((page - 1) * perPage, page * perPage);
  }, [requests, page, perPage, meta]);

  const selectedPriorityLabel = PRIORITY_OPTIONS.find(p => p.value === priority)?.label || "All Priorities";

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Tabs + filters row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pb-1 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary transition-colors bg-white" />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <button onClick={() => setPriorityOpen(v => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm bg-white hover:bg-muted/40 transition-colors whitespace-nowrap">
              {selectedPriorityLabel}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${priorityOpen ? "rotate-180" : ""}`} />
            </button>
            {priorityOpen && (
              <div className="absolute right-0 top-10 z-50 bg-white border border-border rounded-xl shadow-lg w-40 overflow-hidden">
                {PRIORITY_OPTIONS.map(p => (
                  <button key={p.value} onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${priority === p.value ? "text-primary font-medium" : "text-foreground"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Table */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-muted-foreground">Failed to load purchase requests.</p>
          <button onClick={() => refetch()} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading purchase requests...</span>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/5">
              {["Request No.", "Title", "Department", "Priority", "Expected Date", "Status", "Action"].map(h => (
                <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No purchase requests found.</p>
                    <button onClick={() => router.push("/procurement/purchase-request/new")}
                      className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity">
                      <Plus className="w-4 h-4" /> Create your first request
                    </button>
                  </div>
                </td>
              </tr>
            ) : paginated.map(pr => (
              <tr key={pr.purchaseRequestId} onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}`)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors group">
                <td className="px-5 py-4 font-semibold text-foreground font-mono text-xs">{pr.requestNumber}</td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-foreground">{pr.title}</p>
                    {pr.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{pr.description}</p>}
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground text-sm">{pr.departmentId || "—"}</td>
                <td className="px-5 py-4"><PRPriorityBadge priority={pr.priority} /></td>
                <td className="px-5 py-4 text-muted-foreground text-sm whitespace-nowrap">{formatDate(pr.neededByDate)}</td>
                <td className="px-5 py-4"><PRStatusBadge status={pr.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    {pr.status === "draft" ? (
                      <button onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}`)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}`)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!isLoading && !isError && totalCount > 0 && (
        <Pagination
          total={totalCount}
          page={page}
          perPage={perPage}
          onPage={setPage}
          onPerPage={setPerPage}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
