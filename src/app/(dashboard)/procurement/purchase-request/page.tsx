"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { Search, Eye, Download, ChevronDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PRStatus = "pending" | "under_review" | "approved" | "rejected" | "submitted" | "awaiting_review";

export interface PRItem {
  name: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface PurchaseRequest {
  id: string;
  prNumber: string;
  requester: string;
  department: string;
  date: string;
  status: PRStatus;
  vendor: string;
  priority: "low" | "medium" | "high";
  estDelivery: string;
  items: PRItem[];
  totalAmount: number;
  submittedOn: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CFG: Record<PRStatus, { label: string; className: string }> = {
  pending:        { label: "Pending",        className: "text-amber-500" },
  submitted:      { label: "Submitted",      className: "text-blue-500" },
  under_review:   { label: "Under Review",   className: "text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full" },
  awaiting_review:{ label: "Awaiting Review",className: "text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full" },
  approved:       { label: "Approved",       className: "text-emerald-500" },
  rejected:       { label: "Rejected",       className: "text-red-500" },
};

const TABS = [
  { key: "all",             label: "All Requests" },
  { key: "submitted",       label: "Submitted" },
  { key: "awaiting_review", label: "Awaiting Review" },
  { key: "approved",        label: "Approved" },
];

const TAB_FILTER: Record<string, PRStatus[] | null> = {
  all:             null,
  submitted:       ["submitted", "pending"],
  awaiting_review: ["under_review", "awaiting_review"],
  approved:        ["approved"],
};

// ─── Seed data ─────────────────────────────────────────────────────────────────

const STATUSES: PRStatus[] = ["pending","under_review","pending","approved","pending","under_review","pending","approved","under_review","approved","approved"];

export const SEED_REQUESTS: PurchaseRequest[] = Array.from({ length: 22 }, (_, i) => ({
  id: `pr-${i + 1}`,
  prNumber: "PR-882",
  requester: "John Smith",
  department: "Product Engineering",
  date: "26-09-2025",
  status: STATUSES[i % STATUSES.length],
  vendor: "ABC Supplies",
  priority: "medium" as const,
  estDelivery: "21/05/2026",
  submittedOn: "2024-03-15",
  totalAmount: 16000000,
  items: [
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
  ],
}));

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function PRStatusBadge({ status }: { status: PRStatus }) {
  const cfg = STATUS_CFG[status];
  return <span className={`text-sm font-medium ${cfg.className}`}>{cfg.label}</span>;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  total, page, perPage, onPage, onPerPage,
}: { total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.min((page - 1) * perPage + 1, total);
  const end   = Math.min(page * perPage, total);
  const pageNums = Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Showing {start}-{end} of {total} entries</span>
        <div className="relative">
          <select
            value={perPage}
            onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
            className="appearance-none pl-2 pr-6 py-1 rounded border border-border text-sm bg-white cursor-pointer focus:outline-none"
          >
            {[4, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Previous
        </button>
        {pageNums.map(p => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 rounded border text-sm font-medium transition-colors ${
              p === page ? "bg-primary text-white border-primary" : "border-border bg-white hover:bg-muted/40"
            }`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="px-3 h-8 rounded border border-border bg-white hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseRequestPage() {
  const router = useRouter();
  const { setAction, clearAction } = useHeaderActionStore();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(11);

  useEffect(() => {
    setAction({ label: "Create Request", onClick: () => router.push("/procurement/purchase-request/new") });
    return () => clearAction();
  }, [setAction, clearAction, router]);

  const filtered = useMemo(() => {
    let list = SEED_REQUESTS;
    const statuses = TAB_FILTER[activeTab];
    if (statuses) list = list.filter(r => statuses.includes(r.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.prNumber.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, search]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [activeTab, search]);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      {/* Tabs + actions row */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary transition-colors bg-white" />
          </div>
          <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="border-b border-border" />

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {["Request ID", "Requester", "Department", "Date", "Status", "Action"].map(h => (
              <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">No purchase requests found.</td>
            </tr>
          ) : paginated.map(pr => (
            <tr key={pr.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
              <td className="px-5 py-4 font-semibold text-foreground">{pr.prNumber}</td>
              <td className="px-5 py-4 text-foreground">{pr.requester}</td>
              <td className="px-5 py-4 text-muted-foreground">{pr.department}</td>
              <td className="px-5 py-4 text-muted-foreground">{pr.date}</td>
              <td className="px-5 py-4"><PRStatusBadge status={pr.status} /></td>
              <td className="px-5 py-4">
                <button onClick={() => router.push(`/procurement/purchase-request/${pr.id}`)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
    </div>
  );
}
