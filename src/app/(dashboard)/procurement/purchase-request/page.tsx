"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import {
  Search, Eye, Download, ChevronDown, Loader2, RefreshCw,
  Plus, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
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

// ─── Status / Priority Badges (use shared config) ────────────────────────────

export function PRStatusBadge({ status, approvalStatus }: { status: string; approvalStatus?: string | null }) {
  const displayKey = getPRDisplayStatus(status, approvalStatus);
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

// ─── Status tabs ─────────────────────────────────────────────────────────────

const ALL_STATUS_TABS = [
  { key: "all",                label: "All Requests",    status: "" },
  { key: "draft",              label: "Drafts",          status: "draft" },
  { key: "submitted",          label: "Submitted",       status: "submitted" },
  { key: "approved",           label: "Approved",        status: "approved" },
  { key: "rejected",           label: "Rejected",        status: "rejected" },
  { key: "partially_converted",label: "Partially Converted to PO", status: "partially_converted" },
  { key: "converted_to_po",    label: "Converted to PO", status: "converted_to_po" },
  { key: "cancelled",          label: "Withdrawn",       status: "cancelled" },
];

// Own scope: show full lifecycle so requesters can track their PO conversion
const OWN_STATUS_TABS      = ALL_STATUS_TABS; // all statuses — requester owns their full history
const ELEVATED_STATUS_TABS = ALL_STATUS_TABS.filter(t => t.key !== "draft");

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

// ─── PR Table ────────────────────────────────────────────────────────────────

function PRTable({
  scope,
}: {
  scope: "own" | "team" | "company";
}) {
  const router         = useRouter();
  const showRequester  = scope !== "own";
  const statusTabs     = scope === "own" ? OWN_STATUS_TABS : ELEVATED_STATUS_TABS;

  const [activeTab, setActiveTab]             = useState("all");
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority]               = useState("");
  const [priorityOpen, setPriorityOpen]       = useState(false);
  const [pageByKey, setPageByKey] = useState<Record<string, number>>({});
  const [perPage, setPerPage]                 = useState(10);

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
  }, [statusTabs]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  const currentStatus = statusTabs.find(t => t.key === activeTab)?.status || "";

  const user        = useAuthStore(s => s.user);
  const can         = useAuthStore(s => s.can);
  const canChangeDept = can("department", "manage") || can("procurement.purchase_request", "manage");
  const { data: deptData } = useGetAllDepartmentsApi({ enabled: canChangeDept });
  const departments = deptData?.data || [];

  const { data, isLoading, isError, refetch } = useGetPurchaseRequests({
    scope,
    status:   currentStatus || undefined,
    priority: priority      || undefined,
    search:   debouncedSearch || undefined,
  });

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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/60 p-[3px] border border-border/40 flex shrink-0">
                {statusTabs.map(tab => (
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
            ) : paginated.map(pr => (
              <tr
                key={pr.purchaseRequestId}
                onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?scope=${scope}`)}
                className="border-b border-border/40 hover:bg-muted/20 cursor-pointer transition-colors group"
              >
                <td className="px-5 py-4 font-semibold text-foreground font-mono text-xs">{pr.requestNumber}</td>
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium text-foreground">{pr.title}</p>
                    {pr.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{pr.description}</p>}
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
                <td className="px-5 py-4"><PRStatusBadge status={pr.status} approvalStatus={pr.approvalStatus} /></td>
                <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/procurement/purchase-request/${pr.purchaseRequestId}?scope=${scope}`)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

// Gate matches sidebar-constants.tsx and the backend's actual requirement —
// confirmed via "User does not have the required permission:
// procurement.purchase_request.read_own". A user with none of these three
// scopes cannot load this page at all, so the sidebar item is hidden for
// them (see sidebar-constants.tsx) and this guard redirects defensively if
// they reach the URL directly.
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

  // Build tab list based on permissions
  const tabs = [
    ...(hasCompanyScope ? [{ key: "company", label: "Company Requests" }] : []),
    ...(hasTeamScope    ? [{ key: "team",    label: "Team Requests"    }] : []),
    { key: "own", label: "My Requests" },
  ];

  const defaultTab = tabs[0].key;
  // Use ?outerTab= to restore the correct tab when navigating back.
  // ?scope= is only used to pass context INTO the detail page, not to
  // restore the outer tab, because "scope" on the detail is the PR's
  // viewing context which may differ from which outer tab was active.
  const tabFromUrl = searchParams.get("outerTab");
  const validTab   = tabs.find(t => t.key === tabFromUrl)?.key ?? defaultTab;
  const [outerTab, setOuterTab] = useState(validTab);

  useEffect(() => {
    setAction({ label: "Create Request", onClick: () => router.push("/procurement/purchase-request/new") });
    return () => clearAction();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Single tab — no outer switcher
  if (tabs.length === 1) {
    return (
      <div className="space-y-4">
        <PRTable scope="own" />
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
            <PRTable scope={t.key as "own" | "team" | "company"} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
