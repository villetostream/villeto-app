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
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/custom-pagination";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  PR_STATUS_CFG,
  PR_PRIORITY_CFG,
  getPRDisplayStatus,
} from "@/lib/constants/purchase-request-status";
import { toast } from "sonner";
import { ProcurementPageHeader } from "@/components/procurement/ProcurementWorkspace";

// ─── Status / Priority Badges ─────────────────────────────────────────────────

function PRPriorityBadge({ priority }: { priority: string }) {
  const cfg = PR_PRIORITY_CFG[priority] || { label: priority, className: "text-[#68726d] bg-[#f9faf9]" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cfg.className}`}>
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
      <div className="relative bg-white rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full max-w-md mx-4 p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors"
        >
          <X className="w-4 h-4 text-[#68726d]" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#fff5f5] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#d33d44]" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#0b100e]">Reject Request</h3>
            <p className="text-[13px] text-[#68726d] mt-0.5">
              Provide a reason so the requester knows what to address.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[#0b100e]">
            Reason <span className="text-[#d33d44]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Budget not approved for this quarter…"
            rows={4}
            className="w-full rounded-[10px] border border-black/[0.1] px-3.5 py-2.5 text-[13px] text-[#0b100e] resize-none focus:outline-none focus:ring-2 focus:ring-[#d33d44]/20 focus:border-[#d33d44]/50 transition-all bg-[#f9faf9] placeholder:text-[#84908a]"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-[12px] text-[#d33d44] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Please provide at least 10 characters.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-[8px] border border-black/[0.12] text-[13px] font-medium text-[#68726d] hover:bg-[#f9faf9] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-[8px] bg-[#d33d44] text-white text-[13px] font-semibold hover:bg-[#b83038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#68726d] hover:bg-[#f9faf9] transition-colors"
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
        className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[#68726d] hover:bg-[#f0faf8] hover:text-[#087f70] transition-colors"
        title="Actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-44 overflow-hidden py-1">
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onView(); }}
            className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#0b100e] hover:bg-[#f9faf9] transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#84908a]" />
            View Details
          </button>
          {showApprove && (
            <>
              <div className="border-t border-black/[0.06] my-1" />
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onApprove(); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#087f70] hover:bg-[#f0faf8] transition-colors font-semibold"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#087f70]" />
                Approve
              </button>
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onReject(); }}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#d33d44] hover:bg-[#fff5f5] transition-colors font-semibold"
              >
                <XCircle className="w-3.5 h-3.5 text-[#d33d44]" />
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
    tabs.push({ key: "action_partially_converted", label: "Partially Converted", status: "partially_converted", actionType: "convert" as const });
  }

  // Remaining info tabs (skip "approved" if we already added "ready_for_po" for it)
  for (const t of BASE_ELEVATED_TABS.slice(1)) {
    if (t.key === "approved" && canConvert) continue; // already represented by ready_for_po
    if (t.key === "partially_converted" && canConvert) continue; // already represented by action_partially_converted
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
    page,
    limit: perPage,
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

  const { data: partialConversionCountData } = useGetPurchaseRequests(
    { scope, status: "partially_converted", requiresMyConversion: true },
    { enabled: canConvert, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const partialPOCount = (partialConversionCountData as unknown as number) ?? 0;

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
  const totalCount  = meta?.totalCount  ?? requests.length;
  const totalPages  = meta?.totalPages  ?? Math.ceil(totalCount / perPage);

  // With server-side pagination the API returns only the current page's records;
  // client-side slicing is only applied as a fallback when meta is absent.
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
    "Priority", "Need by Date", "Status", "Action",
  ];

  return (
    <>
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isPending={isRejecting}
      />

      <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Status tabs + filters */}
        <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
          <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

          <div className="relative flex flex-1 items-center min-w-0">
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 z-10 -ml-1 p-1 bg-white border border-black/[0.08] shadow-sm rounded-full text-[#0b100e] hover:bg-[#f9faf9] flex items-center justify-center transition-all"
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
                <TabsList className="bg-[#f5f7f6] p-1 h-9 rounded-[8px] border border-black/[0.06] flex shrink-0">
                  {statusTabs.map(tab => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="px-3 py-1 text-[12px] font-semibold rounded-[6px] whitespace-nowrap shrink-0 data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] flex items-center"
                    >
                      {tab.label}
                      {tab.key === "awaiting_approval" && (
                        <ActionBadge count={awaitingCount} />
                      )}
                      {tab.key === "ready_for_po" && (
                        <ActionBadge count={readyForPOCount} />
                      )}
                      {tab.key === "action_partially_converted" && (
                        <ActionBadge count={partialPOCount} />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 z-10 -mr-1 p-1 bg-white border border-black/[0.08] shadow-sm rounded-full text-[#0b100e] hover:bg-[#f9faf9] flex items-center justify-center transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search requests..."
                className="pl-9 pr-4 h-9 rounded-[8px] border border-black/[0.12] text-[13px] w-48 focus:outline-none focus:border-[#087f70] transition-colors bg-[#f9faf9] placeholder:text-[#84908a] text-[#0b100e]"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setPriorityOpen(v => !v)}
                className="flex items-center gap-2 h-9 px-3 rounded-[8px] border border-black/[0.12] text-[13px] text-[#0b100e] bg-white hover:bg-[#f9faf9] transition-colors whitespace-nowrap"
              >
                {selectedPriorityLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-[#84908a] transition-transform ${priorityOpen ? "rotate-180" : ""}`} />
              </button>
              {priorityOpen && (
                <div className="absolute right-0 top-10 z-50 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-40 overflow-hidden">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setPriority(p.value); setPriorityOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#f9faf9] transition-colors flex items-center justify-between ${
                        priority === p.value ? "text-[#087f70] font-semibold" : "text-[#0b100e]"
                      }`}
                    >
                      {p.label}
                      {priority === p.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-[#087f70]/30 text-[#087f70] text-[13px] font-semibold hover:bg-[#f0faf8] transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        <div className="border-b border-black/[0.06] shrink-0" />

        {/* Table body */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-[13px] text-[#68726d]">Failed to load purchase requests.</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-black/[0.12] text-[13px] text-[#0b100e] hover:bg-[#f9faf9] transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#f9faf9] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                <tr className="border-b border-black/[0.06]">
                  {columns.map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#84908a] uppercase tracking-widest bg-[#f9faf9]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={`skeleton-row-${rowIndex}`} className="border-b border-black/[0.06] hover:bg-transparent">
                    {Array.from({ length: columns.length }).map((_, colIndex) => (
                      <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="px-5 py-4 whitespace-nowrap">
                        <div className="h-4 w-full animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
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
                          className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors mt-4 mb-10"
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
                    onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?outerTab=${scope}&innerTab=${activeTab}`)}
                    className={`border-b border-black/[0.06] last:border-0 hover:bg-[#f9faf9] cursor-pointer transition-colors group ${
                      needsAction ? "border-l-4 border-l-[#087f70] bg-[#f0faf8]/40 hover:bg-[#f0faf8]/60" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-semibold text-[#0b100e] font-mono text-[12px]">{pr.requestNumber}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-[13px] text-[#0b100e]">{pr.title}</p>
                        {pr.description && <p className="text-[12px] text-[#68726d] mt-0.5 truncate max-w-[200px]">{pr.description}</p>}
                        {pendingOtherApprover && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-[#84908a] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            Pending another approver
                          </span>
                        )}
                      </div>
                    </td>

                    {showRequester && (
                      <td className="px-5 py-4 text-[13px] text-[#68726d]">
                        {getRequesterName(pr) || <span className="text-[#84908a]">—</span>}
                      </td>
                    )}

                    <td className="px-5 py-4 text-[13px] text-[#68726d]">{getDeptName(pr)}</td>
                    <td className="px-5 py-4"><PRPriorityBadge priority={pr.priority} /></td>
                    <td className="px-5 py-4 text-[13px] text-[#68726d] whitespace-nowrap">{formatDate(pr.neededByDate)}</td>
                    <td className="px-5 py-4"><StatusBadge status={(pr.approvalStatus && pr.status !== "rejected" && pr.status !== "cancelled") ? pr.approvalStatus : pr.status} /></td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <PRActionMenu
                        pr={pr}
                        canApprove={canApprove}
                        canConvert={canConvert}
                        onView={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?outerTab=${scope}&innerTab=${activeTab}`)}
                        onApprove={() => handleApproveRow(pr.purchaseRequestId)}
                        onReject={() => setRejectTarget(pr.purchaseRequestId)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
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
      <div className="space-y-5 pb-8 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
        <ProcurementPageHeader title="Purchase requests" description="Capture demand, route approvals, and convert authorized requests into controlled purchase orders." />
        <PRTable scope="own" initialInnerTab={innerTabFromUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      <ProcurementPageHeader title="Purchase requests" description="Capture demand, route approvals, and convert authorized requests into controlled purchase orders." />
      <Tabs value={outerTab} onValueChange={setOuterTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
          {tabs.map(t => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4 flex-1 flex flex-col min-h-0 overflow-hidden m-0">
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
