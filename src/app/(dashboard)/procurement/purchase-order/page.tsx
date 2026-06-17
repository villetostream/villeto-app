"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useAuthStore } from "@/stores/auth-stores";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Search, Eye, Download, Loader2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Pagination } from "@/components/ui/custom-pagination";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type POStatus = "draft" | "ready_to_issue" | "issued" | "acknowledge" | "acknowledged" | "ready_for_delivery" | "partially_delivered" | "delivered" | "closed" | "cancelled" | string;

const PO_STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:             { label: "Draft",             className: "text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full" },
  ready_to_issue:    { label: "Ready to Issue",    className: "text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full" },
  issued:            { label: "Issued",            className: "text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full" },
  acknowledged:      { label: "Acknowledged",      className: "text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full" },
  acknowledge:       { label: "Acknowledged",      className: "text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full" },
  ready_for_delivery:{ label: "Ready for delivery",className: "text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full" },
  readiy_for_delivery:{ label:"Ready for delivery",className: "text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full" },
  delivered:         { label: "Delivered",         className: "text-emerald-500 bg-emerald-50 px-2.5 py-0.5 rounded-full" },
  partially_delivered:{ label: "Partial Delivery",  className: "text-blue-500 bg-blue-50 px-2.5 py-0.5 rounded-full" },
  closed:            { label: "Closed",            className: "text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full" },
  cancelled:         { label: "Cancelled",         className: "text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full" },
};

const TABS = [
  { key: "all",                label: "All Requests",      statusFilter: "" },
  { key: "draft",              label: "Draft",             statusFilter: "draft" },
  { key: "ready_to_issue",     label: "Ready to Issue",    statusFilter: "ready_to_issue" },
  { key: "issued",             label: "Issued",            statusFilter: "issued" },
  { key: "acknowledge",        label: "Acknowledged",      statusFilter: "acknowledge" },
  { key: "ready_for_delivery", label: "Ready for Delivery",statusFilter: "ready_for_delivery" },
  { key: "partially_delivered",label: "Partial Delivery",  statusFilter: "partially_delivered" },
  { key: "delivered",          label: "Delivered",         statusFilter: "delivered" },
  { key: "closed",             label: "Closed",            statusFilter: "closed" },
  { key: "cancelled",          label: "Cancelled",         statusFilter: "cancelled" },
];

function POStatusBadge({ status }: { status: POStatus }) {
  const cfg = PO_STATUS_CFG[status] || { label: status, className: "text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full" };
  return <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

function PurchaseOrderPage() {
  const router = useRouter();
  const { setAction, clearAction } = useHeaderActionStore();
  const canCreatePO = useAuthStore(s => s.can)('procurement.purchase_order', 'create');
  
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);

  const scrollRef        = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  // Fetch approved vendors for the dropdown
  const { data: vendorsResponse } = useGetVendors();
  const vendors = vendorsResponse?.data || [];

  // Debounce search safely
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (canCreatePO) {
      setAction({ label: "Create PO", onClick: () => {} });
    } else {
      clearAction();
    }
    return () => clearAction();
  }, [setAction, clearAction, canCreatePO]);

  // Handle Tab Switch correctly mapped to endpoints
  const statusFilter = useMemo(() => {
    return TABS.find(t => t.key === activeTab)?.statusFilter || "";
  }, [activeTab]);

  const { data, isLoading, isError } = usePurchaseOrders(
    page,
    perPage,
    statusFilter || undefined,
    vendorFilter !== "all" ? vendorFilter : undefined,
    debouncedSearch || undefined
  );

  const purchaseOrders = data?.data || [];
  const meta = data?.meta || { totalCount: 0, totalPages: 1, currentPage: 1, limit: perPage };

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 gap-8">
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        
        <div className="relative flex flex-1 items-center max-w-[55%]">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 z-10 -ml-2 p-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-foreground hover:bg-gray-50 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex items-center overflow-x-auto no-scrollbar snap-x snap-mandatory w-full py-0.5"
            style={{
              scrollbarWidth: "none",
              maskImage:         canScrollRight ? "linear-gradient(to right, black 90%, transparent 100%)" : "none",
              WebkitMaskImage:   canScrollRight ? "linear-gradient(to right, black 90%, transparent 100%)" : "none",
            }}
          >
            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
              <TabsList className="bg-muted/60 p-[3px] border border-border/40 flex shrink-0">
                {TABS.map(tab => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 data-[state=active]:text-primary"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 z-10 -mr-2 p-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-foreground hover:bg-gray-50 flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pos or requesters..."
              className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary bg-white transition-colors" />
          </div>

          <Select value={vendorFilter} onValueChange={(val) => { setVendorFilter(val); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 bg-white border-border hover:bg-muted/40 transition-colors">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map(v => (
                <SelectItem key={v.vendorId} value={v.vendorId}>
                  {v.displayName || v.legalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>
      <div className="border-b border-border" />
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20">
              {["PO Number", "Requester", "Vendor", "Department", "Date", "Total Amount", "Status", "Action"].map(h => (
                <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-dashboard-text-secondary uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-muted-foreground font-medium">Loading orders...</span>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center text-red-500 font-medium">
                  Failed to load purchase orders. Please try refreshing.
                </td>
              </tr>
            ) : purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-lg font-medium text-foreground">No purchase orders found</span>
                    <span>Try adjusting your search or filters.</span>
                  </div>
                </td>
              </tr>
            ) : purchaseOrders.map((po: any) => {
              const requester = po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : po.requesterName;
              const vendorLabel = po.vendor?.legalName || po.vendor?.displayName || "N/A";
              
              let formattedDate = po.createdAt || po.issueDate;
              try {
                 formattedDate = format(new Date(formattedDate), "dd MMM, yyyy");
              } catch (e) {
                 // Ignore format error and use raw
              }

              return (
                <tr 
                  key={po.purchaseOrderId || po.id} 
                  onClick={() => router.push(`/procurement/purchase-order/${po.purchaseOrderId || po.id}`)}
                  className="border-b border-border/40 hover:bg-muted/10 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">{po.poNumber}</td>
                  <td className="px-5 py-4 text-foreground whitespace-nowrap">{requester}</td>
                  <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{vendorLabel}</td>
                  <td className="px-5 py-4 text-muted-foreground">{po.departmentName || "N/A"}</td>
                  <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{formattedDate}</td>
                  <td className="px-5 py-4 font-medium">
                    {Number(po.totalAmount).toLocaleString("en-US", { style: "currency", currency: po.currency || "USD" })}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap"><POStatusBadge status={po.status} /></td>
                  <td className="px-5 py-4">
                    <button 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border">
        <Pagination 
          total={meta.totalCount} 
          page={meta.currentPage} 
          perPage={meta.limit} 
          onPage={setPage} 
          onPerPage={setPerPage} 
        />
      </div>
    </div>
  );
}

export default withPermissions(PurchaseOrderPage, [
  { resource: "procurement.purchase_order", action: "read_company" },
  { resource: "procurement.purchase_order", action: "read_own" }
]);
