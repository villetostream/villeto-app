"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import {
  Search, Eye, Download, ChevronDown, Loader2, RefreshCw,
  Plus, Check, ChevronLeft, ChevronRight, MoreHorizontal,
  CheckCircle, XCircle, X, AlertCircle,
} from "lucide-react";
import { useGetPurchaseRequests, useApprovePurchaseRequest, useRejectPurchaseRequest } from "@/queries/procurement/purchase-requests";
import type { PurchaseRequest } from "@/queries/procurement/purchase-requests";

import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useAuthStore } from "@/stores/auth-stores";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/custom-pagination";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  PR_STATUS_CFG,
  PR_PRIORITY_CFG,
  getPRDisplayStatus,
} from "@/lib/constants/purchase-request-status";
import { toast } from "sonner";

// ─── Status / Priority Badges ─────────────────────────────────────────────────

export function PRStatusBadge({ status, approvalStatus, isOwnRequest }: { status: string; approvalStatus?: string | null; isOwnRequest?: boolean }) {
  const displayKey = getPRDisplayStatus(status, approvalStatus, isOwnRequest);
  const cfg = PR_STATUS_CFG[displayKey] || PR_STATUS_CFG[status] || { label: status, className: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function PRPriorityBadge({ priority }: { priority: string }) {
  const cfg = PR_PRIORITY_CFG[priority] || { label: priority, className: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Action Badge (red pill) ──────────────────────────────────────────────────

function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Reject Reason Modal ──────────────────────────────────────────────────────

function RejectModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Reject Request</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Provide a reason so the requester knows what to address.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Budget not approved for this quarter…"
            rows={4}
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please provide at least 10 characters.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
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

// ─── Inline Action Menu ───────────────────────────────────────────────────────

function PRActionMenu({
  pr,
  canApprove,
  canConvert,
  onApprove,
  onReject,
  onView,
}: {
  pr: PurchaseRequest;
  canApprove: boolean;
  canConvert: boolean;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const showApprove = canApprove && pr.currentUserActionRequired && pr.status === "submitted";
  const showReject  = canApprove && pr.currentUserActionRequired && pr.status === "submitted";

  if (!showApprove && !showReject) {
    // Read-only eye button
    return (
      <button
        onClick={onView}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
        title="View"
      >
        <Eye className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        title="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white border border-border rounded-xl shadow-xl w-44 overflow-hidden py-1">
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onView(); }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            View Details
          </button>
          {showApprove && (
            <>
              <div className="border-t border-border/60 my-1" />
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onApprove(); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Approve
              </button>
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onReject(); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                Reject
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inner Tab Definitions ────────────────────────────────────────────────────

type TabCfg = {
  key: string;
  label: string;
  status: string;
  actionType?: "approve" | "convert" | null;
};

// Own scope: show full lifecycle so requesters can track their PO conversion
const OWN_STATUS_TABS: TabCfg[] = [
  { key: "all",                label: "All",                status: "" },
  { key: "draft",              label: "Drafts",             status: "draft" },
  { key: "pending_review",     label: "Pending Review",     status: "submitted" },
  { key: "approved",           label: "Approved",           status: "approved" },
  { key: "rejected",           label: "Rejected",           status: "rejected" },
  { key: "partially_converted",label: "Partially Converted to PO", status: "partially_converted" },
  { key: "converted_to_po",    label: "Converted to PO",   status: "converted_to_po" },
  { key: "cancelled",          label: "Withdrawn",          status: "cancelled" },
];

const BASE_ELEVATED_TABS: TabCfg[] = [
  { key: "all",             label: "All",             status: "",              actionType: null },
  { key: "approved",        label: "Approved",        status: "approved",      actionType: null },
  { key: "rejected",        label: "Rejected",        status: "rejected",      actionType: null },
  { key: "partially_converted", label: "Partially Converted", status: "partially_converted", actionType: null },
  { key: "converted_to_po", label: "Converted to PO", status: "converted_to_po", actionType: null },
  { key: "cancelled",       label: "Withdrawn",       status: "cancelled",     actionType: null },
];

function buildInnerTabs(canApprove: boolean, canConvert: boolean): TabCfg[] {
  const tabs: TabCfg[] = [BASE_ELEVATED_TABS[0]]; // "All"

  if (canApprove) {
    tabs.push({ key: "awaiting_approval", label: "Awaiting Approval", status: "submitted", actionType: "approve" as const });
  } else {
    // Read-only: still show submitted, but no badge, no action
    tabs.push({ key: "awaiting_approval", label: "Awaiting Approval", status: "submitted", actionType: null });
  }

  if (canConvert) {
    tabs.push({ key: "ready_for_po", label: "Ready for PO", status: "approved", actionType: "convert" as const });
  }

  // Remaining info tabs (skip "approved" if we already added "ready_for_po" for it)
  for (const t of BASE_ELEVATED_TABS.slice(1)) {
    if (t.key === "approved" && canConvert) continue; // already represented by ready_for_po
    tabs.push(t);
  }

  return tabs;
}

const PRIORITY_OPTIONS = [
  { label: "All Priorities", value: "" },
  { label: "Low",    value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High",   value: "urgent" },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function getRequesterName(pr: PurchaseRequest): string {
  if (pr.requesterName) return pr.requesterName;
  for (const person of [pr.creator, pr.employee]) {
    if (person) {
      const name = `${person.firstName || ""} ${person.lastName || ""}`.trim();
      if (name) return name;
    }
  }
  return "";
}

// ─── PR Table ─────────────────────────────────────────────────────────────────

function PRTable({
  scope,
  initialInnerTab,
}: {
  scope: "own" | "team" | "company";
  initialInnerTab?: string;
}) {
  const router         = useRouter();
  const showRequester  = scope !== "own";

  const can         = useAuthStore(s => s.can);
  const canApprove  = scope !== "own" && can("procurement.purchase_request", "approve");
  const canConvert  = scope !== "own" && can("procurement.purchase_request", "convert_to_po");

  const statusTabs  = scope === "own"
    ? OWN_STATUS_TABS
    : buildInnerTabs(canApprove, canConvert);

  const defaultTab  = statusTabs[0].key;
  const [activeTab, setActiveTab] = useState(initialInnerTab && statusTabs.some(t => t.key === initialInnerTab) ? initialInnerTab : defaultTab);

  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority]               = useState("");
  const [priorityOpen, setPriorityOpen]       = useState(false);
  const [pageByKey, setPageByKey] = useState<Record<string, number>>({});
  const [perPage, setPerPage]                 = useState(10);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const paginationKey = `${activeTab}-${debouncedSearch}-${priority}`;
  const page = pageByKey[paginationKey] ?? 1;
  const setPage = (nextPage: number) => {
    setPageByKey(prev => ({ ...prev, [paginationKey]: nextPage }));
  };

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
  }, [statusTabs, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  const activeTabCfg = statusTabs.find(t => t.key === activeTab);
  const currentStatus = activeTabCfg?.status || "";
  const isActionTab   = activeTabCfg?.actionType != null;

  // Only pass requiresMyApproval when the user is on the "awaiting_approval" action tab
  const requiresMyApproval  = isActionTab && activeTabCfg?.actionType === "approve";
  const requiresMyConversion = isActionTab && activeTabCfg?.actionType === "convert";

  const user        = useAuthStore(s => s.user);
  const canChangeDept = can("department", "manage") || can("procurement.purchase_request", "manage");
  const { data: deptData } = useGetAllDepartmentsApi({ enabled: canChangeDept });
  const departments = deptData?.data || [];

  const { data, isLoading, isError, refetch } = useGetPurchaseRequests({
    scope,
    status:   currentStatus || undefined,
    priority: priority      || undefined,
    search:   debouncedSearch || undefined,
    requiresMyApproval:   requiresMyApproval   || undefined,
    requiresMyConversion: requiresMyConversion || undefined,
  });

  // ── Badge count queries (lightweight — reads meta.totalCount only) ──────────

  const { data: approvalCountData } = useGetPurchaseRequests(
    { scope, status: "submitted", requiresMyApproval: true },
    { enabled: canApprove, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const awaitingCount = (approvalCountData as unknown as number) ?? 0;

  const { data: conversionCountData } = useGetPurchaseRequests(
    { scope, status: "approved", requiresMyConversion: true },
    { enabled: canConvert, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const readyForPOCount = (conversionCountData as unknown as number) ?? 0;

  // ── Mutations ──────────────────────────────────────────────────────────────

  // Per-row approve — id is set via state before mutateAsync fires
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { mutateAsync: approveFn } = useApprovePurchaseRequest(approvingId ?? "");

  const handleApproveRow = useCallback(async (id: string) => {
    setApprovingId(id);
    try {
      await approveFn();
      toast.success("Purchase request approved successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve request.");
    } finally {
      setApprovingId(null);
    }
  }, [approveFn]);

  const { mutateAsync: rejectFn, isPending: isRejecting } = useRejectPurchaseRequest(rejectTarget ?? "");

  const handleRejectConfirm = useCallback(async (reason: string) => {
    try {
      await rejectFn({ reason });
      toast.success("Purchase request rejected.");
      setRejectTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject request.");
    }
  }, [rejectFn]);

  const requests = useMemo<PurchaseRequest[]>(() => data?.data || [], [data?.data]);
  const meta        = data?.meta;
  const totalCount  = meta?.totalCount  || requests.length;
  const totalPages  = meta?.totalPages  || Math.ceil(totalCount / perPage);

  const paginated = useMemo(() => {
    if (meta) return requests;
    return requests.slice((page - 1) * perPage, page * perPage);
  }, [requests, page, perPage, meta]);

  const selectedPriorityLabel = PRIORITY_OPTIONS.find(p => p.value === priority)?.label || "All Priorities";

  const getDeptName = (pr: PurchaseRequest) => {
    if (!pr.departmentId) return "—";
    if (pr.departmentName) return pr.departmentName;
    const found = departments.find(d => d.departmentId === pr.departmentId);
    if (found?.departmentName) return found.departmentName;
    if (pr.departmentId === user?.department?.departmentId) {
      return user?.department?.departmentName || pr.departmentId;
    }
    return pr.departmentId;
  };

  const columns = [
    "Request No.", "Title",
    ...(showRequester ? ["Requester", "Department"] : ["Department"]),
    "Priority", "Expected Date", "Status", "Action",
  ];

  return (
    <>
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isPending={isRejecting}
      />

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {/* Status tabs + filters */}
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
              <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); }}>
                <TabsList className="bg-muted/60 p-[3px] border border-border/40 flex shrink-0">
                  {statusTabs.map(tab => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 data-[state=active]:text-primary flex items-center"
                    >
                      {tab.label}
                      {tab.key === "awaiting_approval" && (
                        <ActionBadge count={awaitingCount} />
                      )}
                      {tab.key === "ready_for_po" && (
                        <ActionBadge count={readyForPOCount} />
                      )}
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
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="pl-9 pr-4 h-9 rounded-lg border border-border text-sm w-52 focus:outline-none focus:border-primary transition-colors bg-white"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setPriorityOpen(v => !v)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-sm bg-white hover:bg-muted/40 transition-colors whitespace-nowrap"
              >
                {selectedPriorityLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${priorityOpen ? "rotate-180" : ""}`} />
              </button>
              {priorityOpen && (
                <div className="absolute right-0 top-10 z-50 bg-white border border-border rounded-xl shadow-lg w-40 overflow-hidden">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors flex items-center justify-between ${priority === p.value ? "text-primary font-medium" : "text-foreground"}`}
                    >
                      {p.label}
                      {priority === p.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        <div className="border-b border-border" />

        {/* Table body */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-muted-foreground">Failed to load purchase requests.</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors"
            >
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
                {columns.map(h => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center border-0 p-0">
                    <div className="w-full flex justify-center flex-col items-center">
                      <EmptyState
                        icon={<Search className="w-6 h-6" />}
                        title="No purchase requests found"
                        description="Try adjusting your filters or search query to find what you're looking for."
                      />
                      {scope === "own" && (
                        <button
                          onClick={() => router.push("/procurement/purchase-request/new")}
                          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity mt-4 mb-10"
                        >
                          <Plus className="w-4 h-4" /> Create your first request
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : paginated.map(pr => {
                const needsAction = isActionTab && pr.currentUserActionRequired === true;
                const pendingOtherApprover = isActionTab && activeTabCfg?.actionType === "approve" && !pr.currentUserActionRequired;

                return (
                  <tr
                    key={pr.purchaseRequestId}
                    onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?scope=${scope}`)}
                    className={`border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors group ${
                      needsAction ? "border-l-4 border-l-primary bg-amber-50/30 hover:bg-amber-50/50" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-semibold text-foreground font-mono text-xs">{pr.requestNumber}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-foreground">{pr.title}</p>
                        {pr.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{pr.description}</p>}
                        {pendingOtherApprover && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            Pending another approver
                          </span>
                        )}
                      </div>
                    </td>

                    {showRequester && (
                      <td className="px-5 py-4 text-muted-foreground text-sm">
                        {getRequesterName(pr) || <span className="text-xs text-muted-foreground/50">—</span>}
                      </td>
                    )}

                    <td className="px-5 py-4 text-muted-foreground text-sm">{getDeptName(pr)}</td>
                    <td className="px-5 py-4"><PRPriorityBadge priority={pr.priority} /></td>
                    <td className="px-5 py-4 text-muted-foreground text-sm whitespace-nowrap">{formatDate(pr.neededByDate)}</td>
                    <td className="px-5 py-4"><PRStatusBadge status={pr.status} approvalStatus={pr.approvalStatus} isOwnRequest={scope === "own"} /></td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <PRActionMenu
                        pr={pr}
                        canApprove={canApprove}
                        canConvert={canConvert}
                        onView={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?scope=${scope}`)}
                        onApprove={() => handleApproveRow(pr.purchaseRequestId)}
                        onReject={() => setRejectTarget(pr.purchaseRequestId)}
                      />
                    </td>
                  </tr>
                );
              })}
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
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default withPermissions(PurchaseRequestPage, [
  { resource: "procurement.purchase_request", action: "read_own" },
  { resource: "procurement.purchase_request", action: "read_department" },
  { resource: "procurement.purchase_request", action: "read_company" },
]);

function PurchaseRequestPage() {
  const router                   = useRouter();
  const searchParams             = useSearchParams();
  const { setAction, clearAction } = useHeaderActionStore();
  const can                      = useAuthStore(s => s.can);

  const hasTeamScope    = can("procurement.purchase_request", "read_department");
  const hasCompanyScope = can("procurement.purchase_request", "read_company");

  // Build outer tab list based on permissions
  const tabs = [
    ...(hasCompanyScope ? [{ key: "company", label: "Company Requests" }] : []),
    ...(hasTeamScope    ? [{ key: "team",    label: "Team Requests"    }] : []),
    { key: "own", label: "My Requests" },
  ];

  const defaultTab = tabs[0].key;

  const tabFromUrl = searchParams.get("outerTab");
  const validTab   = tabs.find(t => t.key === tabFromUrl)?.key ?? defaultTab;
  const [outerTab, setOuterTab] = useState(validTab);

  // Restore inner tab from URL when navigating back from detail page
  const innerTabFromUrl = searchParams.get("innerTab") ?? undefined;

  useEffect(() => {
    setAction({ label: "Create Request", onClick: () => router.push("/procurement/purchase-request/new") });
    return () => clearAction();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Single outer tab — no outer switcher
  if (tabs.length === 1) {
    return (
      <div className="space-y-4">
        <PRTable scope="own" initialInnerTab={innerTabFromUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={outerTab} onValueChange={setOuterTab}>
        <TabsList>
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            <PRTable
              scope={t.key as "own" | "team" | "company"}
              initialInnerTab={outerTab === t.key ? innerTabFromUrl : undefined}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
