"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useAuthStore } from "@/stores/auth-stores";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  Search, Eye, Download, Loader2, ChevronLeft, ChevronRight,
  MoreHorizontal, CheckCircle, XCircle, X, AlertCircle, Send,
} from "lucide-react";
import {
  PO_STATUS_CFG,
  getPODisplayStatus,
} from "@/lib/constants/purchase-order-status";
import {
  canPOApprove,
  canPOCreate,
  canPOIssue,
  canPOReadCompany,
  canPOReadDepartment,
  buildPODetailUrl,
} from "@/lib/permissions/purchase-order-permissions";
import { Pagination } from "@/components/ui/custom-pagination";
import { usePurchaseOrders, usePurchaseOrderApprovalDecision, useIssuePurchaseOrder } from "@/queries/procurement/purchase-orders";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";

function POStatusBadge({ status, isOwnView }: { status: string; isOwnView?: boolean }) {
  const displayKey = getPODisplayStatus(status, isOwnView);
  const cfg = PO_STATUS_CFG[displayKey] || PO_STATUS_CFG[status] || { label: status, className: "text-gray-600 bg-gray-100" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
}

// ── Action badge ──────────────────────────────────────────────────────────────

function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Reject Reason Modal ───────────────────────────────────────────────────────

function RejectModal({
  open, onClose, onConfirm, isPending,
}: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean; }) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) setReason(""); }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Reject Purchase Order</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Provide a reason for rejection.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Vendor not approved yet…" rows={4}
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please provide at least 10 characters.
            </p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">Cancel</button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PO Action Menu for All POs (approver scope) ───────────────────────────────

function AllPOActionMenu({
  po, canApprove, canIssue, approvingId, issuingId, onApprove, onReject, onIssue, onView,
}: {
  po: any;
  canApprove: boolean;
  canIssue: boolean;
  approvingId: string | null;
  issuingId: string | null;
  onApprove: () => void;
  onReject: () => void;
  onIssue: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const poId = po.purchaseOrderId || po.id;
  const isApproving = approvingId === poId;
  const isIssuing = issuingId === poId;
  const isBusy = isApproving || isIssuing;

  const showApproveReject = canApprove && po.status === "pending_approval";
  const showIssue = canIssue && (po.status === "ready_to_issue" || po.status === "approved");

  if (!showApproveReject && !showIssue) {
    return (
      <button onClick={onView} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="View">
        <Eye className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        disabled={isBusy}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
        title="Actions"
      >
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white border border-border rounded-xl shadow-xl w-44 overflow-hidden py-1">
          <button onClick={e => { e.stopPropagation(); setOpen(false); onView(); }} className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details
          </button>
          {showApproveReject && (
            <>
              <div className="border-t border-border/60 my-1" />
              <button onClick={e => { e.stopPropagation(); setOpen(false); onApprove(); }} className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Approve
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false); onReject(); }} className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                <XCircle className="w-3.5 h-3.5 text-red-500" /> Reject
              </button>
            </>
          )}
          {showIssue && (
            <>
              <div className="border-t border-border/60 my-1" />
              <button onClick={e => { e.stopPropagation(); setOpen(false); onIssue(); }} className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors font-medium">
                <Send className="w-3.5 h-3.5 text-primary" /> Issue PO
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── My POs Action: view only — edit happens from the detail page ───────────────

function MyPOActionMenu({ onView }: { onView: () => void }) {
  return (
    <button onClick={onView} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="View">
      <Eye className="w-4 h-4" />
    </button>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────

// My POs tabs — submitter's perspective (no approve/reject)
const MY_PO_TABS = [
  { key: "all",             label: "All",              statusFilter: "" },
  { key: "draft",           label: "Draft",            statusFilter: "draft" },
  { key: "pending_review",  label: "Pending Review",   statusFilter: "pending_approval" },
  { key: "issued",          label: "Issued",           statusFilter: "issued" },
  { key: "delivered",       label: "Delivered",        statusFilter: "delivered" },
  { key: "closed",          label: "Closed",           statusFilter: "closed" },
  { key: "cancelled",       label: "Withdrawn",        statusFilter: "cancelled" },
];

// All POs tabs — approver perspective
function buildAllPOTabs(canApprove: boolean) {
  const tabs = [
    { key: "all",               label: "All",               statusFilter: "", actionType: null as null | "approve" },
    { key: "awaiting_approval", label: "Awaiting Approval", statusFilter: "pending_approval", actionType: canApprove ? "approve" as const : null },
    { key: "issued",            label: "Issued",            statusFilter: "issued",           actionType: null },
    { key: "delivered",         label: "Delivered",         statusFilter: "delivered",        actionType: null },
    { key: "closed",            label: "Closed",            statusFilter: "closed",           actionType: null },
    { key: "cancelled",         label: "Withdrawn",         statusFilter: "cancelled",        actionType: null },
  ];
  return tabs;
}

// ── PO Table ──────────────────────────────────────────────────────────────────

function POTable({
  scope,
  outerTabKey,
  initialInnerTab,
}: {
  scope: "own" | "team" | "company";
  outerTabKey: "own" | "all";
  initialInnerTab?: string;
}) {
  const router     = useRouter();
  const can        = useAuthStore(s => s.can);
  const isMyScope  = scope === "own";
  const canApprove = !isMyScope && canPOApprove(can);
  const canIssue   = !isMyScope && canPOIssue(can);

  const statusTabs  = isMyScope ? MY_PO_TABS : buildAllPOTabs(canApprove);
  const defaultTab  = statusTabs[0].key;

  const [activeTab, setActiveTab] = useState(
    initialInnerTab && statusTabs.some(t => t.key === initialInnerTab) ? initialInnerTab : defaultTab
  );
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [issuingId, setIssuingId]       = useState<string | null>(null);

  const scrollRef        = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  useEffect(() => {
    const h = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(h);
  }, [search]);

  const { data: vendorsResponse } = useGetVendors();
  const vendors = vendorsResponse?.data || [];

  const activeTabCfg   = statusTabs.find(t => t.key === activeTab);
  const statusFilter   = activeTabCfg?.statusFilter || "";
  const isAwaitingTab  = !isMyScope && activeTab === "awaiting_approval";

  const { data, isLoading, isError } = usePurchaseOrders(
    page, perPage,
    statusFilter || undefined,
    vendorFilter !== "all" ? vendorFilter : undefined,
    debouncedSearch || undefined,
    scope,
  );

  // Badge count for "Awaiting Approval" tab (only for All POs / elevated scope)
  const { data: approvalCountData } = usePurchaseOrders(
    1, 1, "pending_approval", undefined, undefined, scope,
    { enabled: canApprove, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const awaitingCount = (approvalCountData as unknown as number) ?? 0;

  const purchaseOrders = data?.data || [];
  const meta = data?.meta || { totalCount: 0, totalPages: 1, currentPage: 1, limit: perPage };

  // Mutations
  const approvalDecision = usePurchaseOrderApprovalDecision();
  const issueMut = useIssuePurchaseOrder();

  // Approve = approve the decision then immediately issue the PO
  const handleApprove = useCallback(async (id: string) => {
    setApprovingId(id);
    try {
      await approvalDecision.mutateAsync({ id, payload: { decision: "approved" } });
      await issueMut.mutateAsync(id);
      toast.success("Purchase order approved and issued.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve or issue purchase order.");
    } finally {
      setApprovingId(null);
    }
  }, [approvalDecision, issueMut]);

  const handleRejectConfirm = useCallback(async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await approvalDecision.mutateAsync({ id: rejectTarget, payload: { decision: "rejected", reason } });
      toast.success("Purchase order rejected.");
      setRejectTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject purchase order.");
    }
  }, [rejectTarget, approvalDecision]);

  const handleIssue = useCallback(async (id: string) => {
    setIssuingId(id);
    try {
      await issueMut.mutateAsync(id);
      toast.success("Purchase order issued.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to issue purchase order.");
    } finally {
      setIssuingId(null);
    }
  }, [issueMut]);

  const navigateToDetail = (id: string) => {
    router.push(buildPODetailUrl(id, outerTabKey, activeTab));
  };

  const showRequester = !isMyScope;
  const colSpan = showRequester ? 8 : 7;

  return (
    <>
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isPending={approvalDecision.isPending}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 gap-8">
          <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

          <div className="relative flex flex-1 items-center max-w-[55%]">
            {canScrollLeft && (
              <button onClick={() => scroll("left")} className="absolute left-0 z-10 -ml-2 p-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-foreground hover:bg-gray-50 flex items-center justify-center transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div
              ref={scrollRef} onScroll={checkScroll}
              className="flex items-center overflow-x-auto no-scrollbar snap-x snap-mandatory w-full py-0.5"
              style={{
                scrollbarWidth: "none",
                maskImage: canScrollRight ? "linear-gradient(to right, black 90%, transparent 100%)" : "none",
                WebkitMaskImage: canScrollRight ? "linear-gradient(to right, black 90%, transparent 100%)" : "none",
              }}
            >
              <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
                <TabsList className="bg-muted/60 p-[3px] border border-border/40 flex shrink-0">
                  {statusTabs.map(tab => (
                    <TabsTrigger
                      key={tab.key} value={tab.key}
                      className="px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 data-[state=active]:text-primary flex items-center"
                    >
                      {tab.label}
                      {/* Red badge on Awaiting Approval tab in All POs view */}
                      {tab.key === "awaiting_approval" && canApprove && <ActionBadge count={awaitingCount} />}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {canScrollRight && (
              <button onClick={() => scroll("right")} className="absolute right-0 z-10 -mr-2 p-1.5 bg-white border border-gray-200 shadow-sm rounded-full text-foreground hover:bg-gray-50 flex items-center justify-center transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search POs…"
                className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary bg-white transition-colors" />
            </div>

            <Select value={vendorFilter} onValueChange={v => { setVendorFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-9 bg-white border-border hover:bg-muted/40 transition-colors">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v.vendorId} value={v.vendorId}>{v.displayName || v.legalName}</SelectItem>
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
                {["PO Number", ...(showRequester ? ["Requester"] : []), "Vendor", "Department", "Date", "Total Amount", "Status", "Action"].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-dashboard-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-muted-foreground font-medium">Loading orders…</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-16 text-center text-red-500 font-medium">
                    Failed to load purchase orders. Please try refreshing.
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-10 text-center border-0 p-0">
                    <div className="w-full flex justify-center py-10 px-4">
                      <EmptyState icon={<Search className="w-6 h-6" />} title="No purchase orders found" description="Try adjusting your search or filters." />
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.map((po: any) => {
                const id = po.purchaseOrderId || po.id;
                const requester = po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}`.trim() : po.requesterName;
                const vendorLabel = po.vendor?.legalName || po.vendor?.displayName || "N/A";
                const needsAction = !isMyScope && isAwaitingTab && canApprove && po.status === "pending_approval";
                let formattedDate = po.createdAt || po.issueDate;
                try { formattedDate = format(new Date(formattedDate), "dd MMM, yyyy"); } catch { /* keep raw */ }

                return (
                  <tr
                    key={id}
                    onClick={() => navigateToDetail(id)}
                    className={`border-b border-border/40 hover:bg-muted/10 transition-colors cursor-pointer ${
                      needsAction ? "border-l-4 border-l-primary bg-amber-50/30 hover:bg-amber-50/50" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">{po.poNumber}</td>
                    {showRequester && <td className="px-5 py-4 text-foreground whitespace-nowrap">{requester || "—"}</td>}
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{vendorLabel}</td>
                    <td className="px-5 py-4 text-muted-foreground">{po.departmentName || "N/A"}</td>
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{formattedDate}</td>
                    <td className="px-5 py-4 font-medium">
                      {Number(po.totalAmount).toLocaleString("en-US", { style: "currency", currency: po.currency || "USD" })}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap"><POStatusBadge status={po.status} isOwnView={isMyScope} /></td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      {isMyScope ? (
                        <MyPOActionMenu onView={() => navigateToDetail(id)} />
                      ) : (
                        <AllPOActionMenu
                          po={po}
                          canApprove={canApprove}
                          canIssue={canIssue}
                          approvingId={approvingId}
                          issuingId={issuingId}
                          onView={() => navigateToDetail(id)}
                          onApprove={() => handleApprove(id)}
                          onReject={() => setRejectTarget(id)}
                          onIssue={() => handleIssue(id)}
                        />
                      )}
                    </td>
                  </tr>
                );
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
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function PurchaseOrderPage() {
  const router                   = useRouter();
  const searchParams             = useSearchParams();
  const { setAction, clearAction } = useHeaderActionStore();
  const can                      = useAuthStore(s => s.can);

  const hasCompanyPOScope = canPOReadCompany(can);
  const hasTeamPOScope    = canPOReadDepartment(can);
  const canCreatePO       = canPOCreate(can);
  const canApprovePO      = canPOApprove(can);

  // Outer tabs: "All POs" (elevated) + "My POs" (own)
  const outerTabs = useMemo(() => [
    ...(hasCompanyPOScope || hasTeamPOScope ? [{ key: "all", label: "All POs" }] : []),
    { key: "own", label: "My POs" },
  ], [hasCompanyPOScope, hasTeamPOScope]);

  const defaultTab = outerTabs[0].key;
  const tabFromUrl = searchParams.get("outerTab");
  const validTab   = outerTabs.find(t => t.key === tabFromUrl)?.key ?? defaultTab;
  const [outerTab, setOuterTab] = useState(validTab);
  const innerTabFromUrl = searchParams.get("innerTab") ?? undefined;

  // Badge count for the outer "All POs" tab label
  const elevatedScope = hasCompanyPOScope ? "company" : hasTeamPOScope ? "team" : "own";
  const { data: outerBadgeData } = usePurchaseOrders(
    1, 1, "pending_approval", undefined, undefined, elevatedScope as any,
    { enabled: canApprovePO && (hasCompanyPOScope || hasTeamPOScope), select: d => d.meta?.totalCount ?? 0 }
  );
  const outerAwaitingCount = (outerBadgeData as unknown as number) ?? 0;

  useEffect(() => {
    if (canCreatePO) {
      setAction({ label: "Create PO", onClick: () => router.push("/procurement/purchase-order/new") });
    } else {
      clearAction();
    }
    return () => clearAction();
  }, [setAction, clearAction, canCreatePO, router]);

  // If user only has own scope, skip the outer tabs entirely
  if (outerTabs.length === 1) {
    return (
      <div className="space-y-4">
        <POTable scope="own" outerTabKey="own" initialInnerTab={innerTabFromUrl} />
      </div>
    );
  }

  // Map outer tab key → API scope
  const tabToScope = (key: string): "own" | "team" | "company" => {
    if (key === "own") return "own";
    if (hasCompanyPOScope) return "company";
    return "team";
  };

  return (
    <div className="space-y-4">
      <Tabs value={outerTab} onValueChange={setOuterTab}>
        <TabsList>
          {outerTabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="flex items-center gap-1">
              {t.label}
              {t.key === "all" && canApprovePO && <ActionBadge count={outerAwaitingCount} />}
            </TabsTrigger>
          ))}
        </TabsList>
        {outerTabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            <POTable
              scope={tabToScope(t.key)}
              outerTabKey={t.key as "own" | "all"}
              initialInnerTab={outerTab === t.key ? innerTabFromUrl : undefined}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default withPermissions(PurchaseOrderPage, [
  { resource: "procurement.purchase_order", action: "read_company" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_own" },
]);
