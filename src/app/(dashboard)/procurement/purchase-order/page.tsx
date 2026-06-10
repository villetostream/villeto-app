"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useAuthStore } from "@/stores/auth-stores";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Search, Eye, Download, ChevronDown } from "lucide-react";
import { Pagination } from "@/components/ui/custom-pagination";

type POStatus = "pending_approval" | "acknowledged" | "ready_for_delivery" | "delivered" | "partial_delivery" | "confirmed";

interface PurchaseOrder {
  id: string; poNumber: string; requester: string; department: string;
  date: string; status: POStatus; vendor: string; priority: string;
  estDelivery: string; totalAmount: number; submittedOn: string;
}

const PO_STATUS_CFG: Record<POStatus, { label: string; className: string }> = {
  pending_approval:  { label: "Pending Approval",  className: "text-gray-500" },
  acknowledged:      { label: "Acknowledged",       className: "text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full" },
  ready_for_delivery:{ label: "Ready for delivery", className: "text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full" },
  delivered:         { label: "Delivered",          className: "text-emerald-500" },
  partial_delivery:  { label: "Partial Delivery",   className: "text-blue-500 bg-blue-50 px-2.5 py-0.5 rounded-full" },
  confirmed:         { label: "Confirmed",          className: "text-emerald-600" },
};

const TABS = [
  { key: "all",      label: "All Requests" },
  { key: "submitted",label: "Submitted" },
  { key: "awaiting", label: "Awaiting Review" },
  { key: "approved", label: "Approved" },
];

const TAB_FILTER: Record<string, POStatus[] | null> = {
  all:      null,
  submitted:["pending_approval"],
  awaiting: ["acknowledged", "ready_for_delivery"],
  approved: ["delivered", "confirmed"],
};

const STATUSES: POStatus[] = ["pending_approval","acknowledged","ready_for_delivery","delivered","acknowledged","ready_for_delivery","acknowledged","partial_delivery","ready_for_delivery","confirmed","confirmed"];

const SEED_POS: PurchaseOrder[] = Array.from({ length: 22 }, (_, i) => ({
  id: `po-${i + 1}`,
  poNumber: "PO-2024-001",
  requester: "John Smith",
  department: "Product Engineering",
  date: "26-09-2025",
  status: STATUSES[i % STATUSES.length],
  vendor: "ABC Supplies",
  priority: "medium",
  estDelivery: "04-12-2026",
  totalAmount: 16000000,
  submittedOn: "2024-03-15",
}));

function POStatusBadge({ status }: { status: POStatus }) {
  const cfg = PO_STATUS_CFG[status];
  return <span className={`text-sm font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function PurchaseOrderPage() {
  const router = useRouter();
  const { setAction, clearAction } = useHeaderActionStore();
  const canCreatePO = useAuthStore(s => s.can)('procurement.purchase_order', 'create');
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(11);

  useEffect(() => {
    if (canCreatePO) {
      setAction({ label: "Create PO", onClick: () => {} });
    } else {
      clearAction();
    }
    return () => clearAction();
  }, [setAction, clearAction, canCreatePO]);

  const filtered = useMemo(() => {
    let list = SEED_POS;
    const statuses = TAB_FILTER[activeTab];
    if (statuses) list = list.filter(r => statuses.includes(r.status));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.poNumber.toLowerCase().includes(q) || r.requester.toLowerCase().includes(q));
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
            {["PO Number", "Requester", "Department", "Date", "Status", "Action"].map(h => (
              <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">No purchase orders found.</td></tr>
          ) : paginated.map(po => (
            <tr key={po.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
              <td className="px-5 py-4 font-semibold text-foreground">{po.poNumber}</td>
              <td className="px-5 py-4 text-foreground">{po.requester}</td>
              <td className="px-5 py-4 text-muted-foreground">{po.department}</td>
              <td className="px-5 py-4 text-muted-foreground">{po.date}</td>
              <td className="px-5 py-4"><POStatusBadge status={po.status} /></td>
              <td className="px-5 py-4">
                <button onClick={() => router.push(`/procurement/purchase-order/${po.id}`)}
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

export default withPermissions(PurchaseOrderPage, [
  { resource: "procurement.purchase_order", action: "read_company" },
  { resource: "procurement.purchase_order", action: "read_own" }
]);
