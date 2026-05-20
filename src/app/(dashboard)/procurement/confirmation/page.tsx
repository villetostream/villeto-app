"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { Search, Eye, Download } from "lucide-react";
import { Pagination } from "../purchase-request/page";

type ConfStatus = "pending" | "full_delivery" | "partial_delivery" | "confirmed" | "rejected" | "flagged";

interface Confirmation {
  id: string; poNumber: string; vendor: string; deliveryDate: string; status: ConfStatus;
}

const CONF_STATUS_CFG: Record<ConfStatus, { label: string; className: string }> = {
  pending:         { label: "Pending",          className: "text-amber-500" },
  full_delivery:   { label: "Full Delivery",    className: "text-emerald-500" },
  partial_delivery:{ label: "Partial Delivery", className: "text-blue-500 bg-blue-50 px-2.5 py-0.5 rounded-full" },
  confirmed:       { label: "Confirmed",        className: "text-emerald-600" },
  rejected:        { label: "Rejected",         className: "text-red-500" },
  flagged:         { label: "Flagged",          className: "text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full" },
};

const TABS = [
  { key: "all",       label: "All Requests" },
  { key: "delivered", label: "Delivered" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected",  label: "Rejected" },
];

const TAB_FILTER: Record<string, ConfStatus[] | null> = {
  all:      null,
  delivered:["full_delivery","partial_delivery"],
  confirmed:["confirmed"],
  rejected: ["rejected","flagged"],
};

const STATUSES: ConfStatus[] = ["pending","full_delivery","pending","partial_delivery","pending","flagged","partial_delivery","partial_delivery","full_delivery","full_delivery","flagged"];

const SEED_CONFS: Confirmation[] = Array.from({ length: 22 }, (_, i) => ({
  id: `conf-${i + 1}`,
  poNumber: "PO-2024-001",
  vendor: "John Smith",
  deliveryDate: "26-09-2025",
  status: STATUSES[i % STATUSES.length],
}));

function ConfStatusBadge({ status }: { status: ConfStatus }) {
  const cfg = CONF_STATUS_CFG[status];
  return <span className={`text-sm font-medium ${cfg.className}`}>{cfg.label}</span>;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const { setAction, clearAction } = useHeaderActionStore();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(11);

  useEffect(() => {
    setAction({ label: "Create PO", onClick: () => {} });
    return () => clearAction();
  }, [setAction, clearAction]);

  const filtered = useMemo(() => {
    let list = SEED_CONFS;
    const statuses = TAB_FILTER[activeTab];
    if (statuses) list = list.filter(r => statuses.includes(r.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.poNumber.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, search]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  useEffect(() => { setPage(1); }, [activeTab, search]);

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary bg-white" />
          </div>
          <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>
      <div className="border-b border-border" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60">
            {["PO Number", "Vendor", "Delivery Date", "Status", "Action"].map(h => (
              <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">No confirmations found.</td></tr>
          ) : paginated.map(conf => (
            <tr key={conf.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
              <td className="px-5 py-4 font-semibold text-foreground">{conf.poNumber}</td>
              <td className="px-5 py-4 text-foreground">{conf.vendor}</td>
              <td className="px-5 py-4 text-muted-foreground">{conf.deliveryDate}</td>
              <td className="px-5 py-4"><ConfStatusBadge status={conf.status} /></td>
              <td className="px-5 py-4">
                <button onClick={() => router.push(`/procurement/confirmation/${conf.id}`)}
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
