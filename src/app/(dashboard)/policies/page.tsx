"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  PlusCircle, ShieldCheck, MoreHorizontal, Pencil, Shield, Trash2,
  Search, SlidersHorizontal, RefreshCcw, ChevronDown,
  Eye, Archive, X, UserCircle, FileText, Clock, Tag, Loader2,
  Users, CheckCircle2, Globe
} from "lucide-react";
import PolicyCreationModal, { type CreatedPolicyData } from "@/components/policies/PolicyCreationModal";
import AddCategoryModal from "@/components/auth/AddCategoryModal";
import { DataTable } from "@/components/datatable";
import { ColumnDef } from "@tanstack/react-table";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useGetExpenseCategoriesApi } from "@/actions/companies/get-expense-categories";
import { useGetPoliciesApi } from "@/actions/companies/get-policies";
import { useGetPolicyDetailsApi } from "@/actions/companies/get-policy-details";
import { useGetAllDepartmentsApi } from "@/actions/departments/get-all-departments";
import { useGetCompanyRolesApi } from "@/actions/role/get-all-roles";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { useDataTable } from "@/components/datatable/useDataTable";
import { notifySetupGuide } from "@/lib/setupGuideEvents";

/* ─── Types ─────────────────────────────────────────────────────────────────── */


type PolicyStatus = "active" | "pending" | "draft";

interface Policy {
  id: string;
  name: string;
  version: number;
  category: string;
  appliedTo: string;
  createdBy: string;
  date: string;
  status: PolicyStatus;
  approvers: string[];
  dailyLimit: string;
  receiptRequired: boolean;
  archivedOn?: string;
}

type ExpenseCategory = {
  id: string;
  category: string;
  description: string;
  createdBy: string;
  date: string;
  isPolicyAttached: boolean;
};

type ExpenseCategoryDetails = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  categoryId: string;
  name: string;
  description: string | null;
  isPolicyAttached: boolean;
  policies: unknown[];
  createdBy: string | null;
};

// Live data logic below

const CURRENT_USER = "Israel Chen (You)";
const IS_APPROVER  = true;

function todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2,"0"), String(d.getMonth()+1).padStart(2,"0"), d.getFullYear()].join("-");
}

/* ─── Status Badge ───────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:  "bg-success/10 text-success",
    pending: "bg-pending/10 text-pending",
    draft:   "bg-draft/10 text-draft",
  };
  return (
    <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold capitalize ${map[status.toLowerCase()] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

/* ─── Expense Category Action Menu ───────────────────────────────────────────── */

function ActionMenu({ onView, onCreatePolicy }: { onView: () => void; onCreatePolicy: () => void }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/60 transition-colors cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[210px] bg-white rounded-[20px] border border-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 overflow-hidden">
          <DropdownMenuItem onClick={onView} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors border-b border-border/50 cursor-pointer">
            <Eye className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors border-b border-border/50 cursor-pointer">
            <Pencil className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreatePolicy} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors border-b border-border/50 cursor-pointer">
            <Shield className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> Create policy
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer text-destructive">
            <Trash2 className="w-[17px] h-[17px] text-destructive shrink-0" strokeWidth={1.5} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ExpenseCategoryDetailsModal({
  category,
  isLoading,
  onClose,
}: {
  category: ExpenseCategoryDetails | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!category && !isLoading) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[560px] overflow-hidden">
        <div className="p-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-foreground">Category Details</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/40 hover:bg-muted/80 flex items-center justify-center transition-all border border-border/50">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="h-px bg-border w-full my-6 opacity-60" />
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <RefreshCcw className="w-4 h-4 animate-spin" />
              Loading category details...
            </div>
          ) : category ? (
            <div className="rounded-[1.5rem] border border-border/60 bg-muted/10 p-7 space-y-6">
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Category Name</p>
                  <p className="text-base font-semibold text-foreground">{category.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Policy Status</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      category.isPolicyAttached
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {category.isPolicyAttached ? "Policy Attached" : "No Policy"}
                  </span>
                </div>
              </div>
              <div className="h-px bg-border/60" />
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Description</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {category.description ?? <span className="italic text-muted-foreground">No description provided</span>}
                </p>
              </div>
              <div className="h-px bg-border/60" />
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Created By</p>
                  <p className="text-sm font-semibold text-foreground">
                    {category.createdBy ?? <span className="italic text-muted-foreground">—</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Created On</p>
                  <p className="text-sm font-semibold text-foreground">
                    {category.createdAt ? new Date(category.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
              {category.policies && category.policies.length > 0 && (
                <>
                  <div className="h-px bg-border/60" />
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Attached Policies</p>
                    <div className="flex flex-wrap gap-2">
                      {category.policies.map((pol: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-primary/10 text-sm font-medium text-foreground">
                          <Shield className="w-4 h-4 text-primary opacity-60" />{pol.name ?? `Policy ${i + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


/* ─── Policy Details Modal ───────────────────────────────────────────────────── */

function PolicyDetailsModal({ policy, onClose, onEdit, onArchive }: {
  policy: Policy | null; onClose: () => void;
  onEdit: (p: Policy) => void; onArchive: (p: Policy) => void;
}) {
  const { data: detailData, isLoading } = useGetPolicyDetailsApi(policy?.id || null);
  const fullPolicy = detailData?.data;

  const rolesApi = useGetCompanyRolesApi({ enabled: !!policy });
  const departmentsApi = useGetAllDepartmentsApi({ enabled: !!policy });

  if (!policy) return null;

  const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

  const formatUser = (userObj: any, fallbackStr?: string) => {
    if (!userObj) return fallbackStr || "—";
    if (typeof userObj === "string") return fallbackStr || userObj;
    return `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim() || userObj.email || "Unknown User";
  };

  const formatUserRole = (userObj: any) => {
    if (!userObj || typeof userObj === "string") return "";
    const role = userObj.villetoRole?.name || userObj.role?.name || userObj.jobTitle || userObj.position || "";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  const mapTimeframe = (tf?: string) => {
    if (!tf) return "transaction";
    const str = tf.toLowerCase();
    if (str === "daily" || str === "day") return "day";
    if (str === "weekly" || str === "week") return "week";
    if (str === "monthly" || str === "month") return "month";
    if (str === "yearly" || str === "year") return "year";
    return str;
  };

  const getScopeText = () => {
    if (!fullPolicy?.scope) return policy.appliedTo;
    if (fullPolicy.scope.type === "all" || fullPolicy.scope.type === "all_employees") return "All Employees";
    const deptIds = fullPolicy.scope.departments || [];
    const roleIds = fullPolicy.scope.userRoles || fullPolicy.applicableRoles || [];
    const depts = deptIds.map((d: string) => departmentsApi.data?.data?.find((o: any) => String(o.departmentId) === String(d))?.departmentName || d);
    const roles = roleIds.map((r: string) => rolesApi.data?.data?.find((o: any) => String(o.roleId) === String(r))?.name?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || r);
    const listFmt = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
    if (depts.length === 0 && roles.length === 0) return "Specific Employees";
    const rolePart = roles.length > 0 ? listFmt.format(roles) : "";
    const deptPart = depts.length > 0 ? `the ${listFmt.format(depts)} department${depts.length > 1 ? "s" : ""}` : "";
    if (rolePart && deptPart) return `${rolePart} in ${deptPart}`;
    if (rolePart) return `${rolePart} across all departments`;
    if (deptPart) return `All employees in ${deptPart}`;
    return "Specific Employees";
  };

  const formatDate = (dateStr?: string, fallback?: string) => {
    if (!dateStr) return fallback || "—";
    try { return new Date(dateStr).toISOString().split("T")[0]; } catch { return fallback || "—"; }
  };

  const policyName   = fullPolicy?.name   || policy.name;
  const policyStatus = fullPolicy?.status || policy.status;
  const policyVersion = fullPolicy?.version || policy.version;
  const approvers    = fullPolicy?.approvers || policy.approvers || [];
  const createdAt    = fullPolicy?.createdAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[500px] flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  {capitalizeName(policyName)}
                </h2>
                <StatusBadge status={policyStatus} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">v{policyVersion}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="h-px bg-border w-full mt-5 mb-4 opacity-60" />
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-2 space-y-3"
          style={{ scrollbarWidth: "none" }}
        >
          <style>{`div::-webkit-scrollbar{display:none}`}</style>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
              <p>Loading policy details…</p>
            </div>
          ) : (
            <>
              {/* APPLIES TO */}
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2.5">
                  Applies To
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{getScopeText()}</p>
              </div>

              {/* EXPENSE CATEGORY */}
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2.5">
                  Expense Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {(fullPolicy?.expenseCategories || []).length > 0 ? (
                    (fullPolicy?.expenseCategories || []).map((cat: any, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-foreground/70 text-xs font-medium"
                      >
                        {cat.name || cat.category || cat}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No specific categories attached.</p>
                  )}
                </div>
              </div>

              {/* ENFORCEMENT RULES */}
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2.5">
                  Enforcement Rules
                </p>
                <div className="space-y-2">
                  {(fullPolicy?.rules || []).length > 0 ? (
                    fullPolicy.rules.map((r: any, i: number) => {
                      const isLimit = r.type === "spend_limit";
                      const isBlock = r.enforcementAction === "block";
                      const enforcement = isBlock ? "Hard Block" : "Soft Warning";
                      const description = isLimit
                        ? `Must not exceed ${r.currency || "NGN"} ${Number(r.amount || 0).toLocaleString()}/${mapTimeframe(r.timeUnit || r.time_unit || r.timeframe || fullPolicy.spendLimitPeriod)}`
                        : (r.receiptAmountThreshold || r.threshold)
                          ? `For transactions above ${r.currency || "NGN"} ${Number(r.receiptAmountThreshold || r.threshold).toLocaleString()}`
                          : "Required for all transactions";
                      return (
                        <div key={i} className="rounded-xl border border-border/60 p-3.5">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground">
                              {isLimit ? "Spend Limit" : "Receipts requirement"}
                            </p>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isBlock
                                  ? "bg-red-50 text-red-500 border border-red-100"
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}
                            >
                              {enforcement}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-3">
                      No enforcement rules configured.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Created / Approved by ── */}
        {!isLoading && (
          <div className="px-6 pt-3 pb-4 shrink-0">
            <div className="flex justify-between gap-4">
              {/* Created by */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Created by</p>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {formatUser(fullPolicy?.createdBy, policy.createdBy)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(createdAt, policy.date)}</p>
              </div>
              {/* Approved by */}
              {approvers.length > 0 && (
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground mb-1.5">Approved by</p>
                  <div className="space-y-2">
                    {approvers.map((a: any, i: number) => {
                      const roleLabel = formatUserRole(a);
                      return (
                        <div key={i}>
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {formatUser(a)}
                            {roleLabel && (
                              <span className="text-muted-foreground font-normal"> ({roleLabel})</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(createdAt, policy.date)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer buttons ── */}
        <div className="px-6 pb-6 pt-1 shrink-0 flex gap-3">
          <button
            onClick={() => { onArchive(policy); onClose(); }}
            className="flex-1 h-11 rounded-full border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
          >
            Move to Archive
          </button>
          <button
            onClick={() => { onEdit(policy); onClose(); }}
            className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Review Policy Modal ────────────────────────────────────────────────────── */

function ReviewPolicyModal({ policy, onClose, onApprove, onReject }: {
  policy: Policy | null; onClose: () => void;
  onApprove: (p: Policy) => void; onReject: (p: Policy) => void;
}) {
  if (!policy) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[540px] overflow-hidden">
        <div className="p-10">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-foreground">Review Policy</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/40 hover:bg-muted/80 flex items-center justify-center transition-all border border-border/50">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="h-px bg-border w-full my-6 opacity-60" />
          <div className="rounded-[1.5rem] border border-border/60 bg-muted/10 p-7 space-y-6">
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Policy Name</p>
                <p className="text-base font-semibold text-foreground">{policy.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Expense Category</p>
                <p className="text-base font-semibold text-foreground capitalize">{policy.category}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Applied To</p>
                <p className="text-base font-semibold text-foreground capitalize">{policy.appliedTo}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Rules</p>
                <p className="text-base font-semibold text-foreground">Daily Limit: ${policy.dailyLimit || "0"}</p>
                {policy.receiptRequired && <p className="text-base font-semibold text-foreground">Receipt required</p>}
              </div>
            </div>
            <div className="h-px bg-border/60" />
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Approver(s)</p>
              <div className="flex flex-wrap gap-2">
                {policy.approvers.length > 0 ? policy.approvers.map((a, i) => {
                  const name = typeof a === 'string' ? a : (a?.firstName ? `${a.firstName} ${a.lastName || ''}` : a.email || 'User');
                  return (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-primary/10 text-sm font-medium text-foreground">
                      <UserCircle className="w-4 h-4 text-primary opacity-60" />{name}
                    </div>
                  );
                }) : <p className="text-sm text-muted-foreground italic">None assigned</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => { onReject(policy); onClose(); }}
              className="h-12 px-10 rounded-[18px] border-[1.5px] border-destructive text-destructive font-bold text-sm hover:bg-destructive/5 transition-colors">
              Reject
            </button>
            <button onClick={() => { onApprove(policy); onClose(); }}
              className="h-12 px-10 rounded-[18px] bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function PoliciesPage() {
  const axios = useAxios();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab]           = useState<"policies" | "expense" | "archived">("policies");
  
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "expense" || tab === "policies" || tab === "archived") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen]   = useState(false);
  const [detailPolicy, setDetailPolicy]     = useState<Policy | null>(null);
  const [reviewPolicy, setReviewPolicy]     = useState<Policy | null>(null);
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<ExpenseCategoryDetails | null>(null);
  const [isCategoryDetailsLoading, setIsCategoryDetailsLoading] = useState(false);
  const [search, setSearch]                 = useState("");
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const expCatApi = useGetExpenseCategoriesApi();
  const liveExpenseCategories = useMemo<ExpenseCategory[]>(() => {
    return (expCatApi.data?.data || []).map((c: any) => ({
      id: c.categoryId ?? c.id,
      category: c.name,
      description: c.description || "",
      createdBy: c.createdBy ?? "—",
      date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
      isPolicyAttached: Boolean(c.isPolicyAttached),
    }));
  }, [expCatApi.data?.data]);

  const policiesApi = useGetPoliciesApi();
  const queryClient = useQueryClient();

  // Pagination state for the policies table
  const policyTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const expenseTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const archivedTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

  const policies = useMemo<Policy[]>(() => {
    const rawPolicies = policiesApi.data?.data || [];
    const sortedPolicies = [...rawPolicies].sort((a: any, b: any) => 
       new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return sortedPolicies.map((p: any) => {
      const getCatNames = (cats: any[]) => {
        if (!cats || !cats.length) return "General";
        const names = cats.map(c => {
          if (typeof c === 'string') {
            return liveExpenseCategories.find(lc => lc.id === c)?.category || c;
          }
          return c.name || c.category || 'Category';
        });
        return names.join(", ");
      };

      const createdByObj = p.createdBy;
      const createdByName = createdByObj && typeof createdByObj === 'object'
        ? `${createdByObj.firstName || ''} ${createdByObj.lastName || ''}`.trim() || createdByObj.email || "Admin"
        : typeof createdByObj === 'string' ? createdByObj : "Admin";

      return {
        id: p.policyId || p.id || Math.random().toString(),
        name: p.name || "",
        version: p.version || 1,
        category: getCatNames(p.expenseCategories),
        appliedTo: p.scope?.type === "all" || p.scope?.type === "all_employees" ? "All Employees" : "Specific Employees",
        createdBy: createdByName,
        date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—",
        status: (p.status?.toLowerCase() as PolicyStatus) || "inactive",
        approvers: (p.approvers || []).map((a: any) => typeof a === 'string' ? a : (a?.firstName ? `${a.firstName} ${a.lastName || ''}` : a.email || 'User')),
        dailyLimit: p.rules?.find((r: any) => r.type === "spend_limit")?.amount?.toString() || "0",
        receiptRequired: !!p.rules?.find((r: any) => r.type === "receipt_requirement")?.amount,
        archivedOn: p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : undefined,
      };
    });
  }, [policiesApi.data?.data, liveExpenseCategories]);

  // Register dynamic header CTA button
  const { setAction, clearAction } = useHeaderActionStore();

  useEffect(() => {
    if (activeTab === "policies") {
      setAction({ label: "New Policy", dataTourId: "new-policy-button", onClick: () => setIsCreatePolicyOpen(true) });
    } else if (activeTab === "expense") {
      setAction({ label: "New Expense Category", dataTourId: "new-expense-category-button", onClick: () => setIsAddCategoryOpen(true) });
    } else {
      // Archived tab — no button
      clearAction();
    }
    // Cleanup on unmount
    return () => clearAction();
  }, [activeTab, setAction, clearAction]);

  /* derived */
  const activePolicies   = useMemo(() => policies.filter(p => !p.archivedOn), [policies]);
  const archivedPolicies = useMemo(() => policies.filter(p =>  p.archivedOn), [policies]);
  const approvedCount    = useMemo(() => activePolicies.filter(p => p.status === "active").length,  [activePolicies]);
  const draftedCount     = useMemo(() => activePolicies.filter(p => p.status === "draft").length,   [activePolicies]);
  const pendingCount     = useMemo(() => activePolicies.filter(p => p.status === "pending").length, [activePolicies]);

  const filteredPolicies = useMemo(() => {
    const q = search.toLowerCase();
    return activePolicies.filter(p =>
      !q || p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.createdBy.toLowerCase().includes(q)
    );
  }, [activePolicies, search]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase();
    return liveExpenseCategories.filter(c =>
      !q || c.category.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.createdBy.toLowerCase().includes(q)
    );
  }, [search, liveExpenseCategories]);

  const handleViewCategory = async (categoryId: string) => {
    setIsCategoryDetailsLoading(true);
    setSelectedCategoryDetails(null);
    try {
      const response = await axios.get(`${API_KEYS.EXPENSE.CATEGORIES}/${categoryId}`);
      const payload = response?.data?.data ?? response?.data;
      setSelectedCategoryDetails(payload as ExpenseCategoryDetails);
    } catch {
      toast.error("Failed to load expense category details");
    } finally {
      setIsCategoryDetailsLoading(false);
    }
  };

  /* handlers */
  const handleCreated = (data: CreatedPolicyData) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    notifySetupGuide("policy");
    setActiveTab("policies");
  };

  const handleEdit    = (policy: Policy) => {
    setEditingPolicyId(policy.id);
    setIsCreatePolicyOpen(true);
  };
  const handleArchive = (policy: Policy) => toast.info("Archive policy API not integrated yet.");
  const handleApprove = (policy: Policy) => toast.info("Approve policy API not integrated yet.");
  const handleReject  = (policy: Policy) => toast.info("Reject policy API not integrated yet.");

  const lastUpdated = `Last updated: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`;
  const statCards = [
    { title: "Approved Policies", value: approvedCount,            icon: ShieldCheck, bg: "#418341" },
    { title: "Drafted Policies",  value: draftedCount,             icon: FileText,    bg: "#384A57" },
    { title: "Pending Policies",  value: pendingCount,             icon: Clock,       bg: "#D97706" },
    { title: "Expense Category",  value: liveExpenseCategories.length, icon: Tag,         bg: "#38B2AC" },
  ];

  /* DataTable columns for Policy tab */
  const policyColumns = useMemo<ColumnDef<Policy>[]>(() => [
    {
      accessorKey: "name",
      header: "Policy Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-foreground">{capitalizeName(row.original.name)}</p>
          <p className="text-xs text-muted-foreground">v{row.original.version}</p>
        </div>
      ),
    },
    { accessorKey: "appliedTo", header: "Applied To" },
    {
      accessorKey: "createdBy",
      header: "Created By",
      cell: ({ row }) => (
         <div>
           <p className="text-sm font-semibold text-foreground">{row.original.createdBy}</p>
           <p className="text-xs text-muted-foreground tabular-nums">{row.original.date}</p>
         </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: () => <div className="text-right w-full">Action</div>,
      cell: ({ row }) => {
        const policy = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            {policy.status === "pending" && IS_APPROVER && (
              <button
                onClick={() => setReviewPolicy(policy)}
                className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Review
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[210px] bg-white rounded-[20px] border border-border shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 overflow-hidden">
                <DropdownMenuItem onClick={() => setDetailPolicy(policy)} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50">
                  <Eye className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(policy)} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/50">
                  <Pencil className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> Edit Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(policy)} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer">
                  <Archive className="w-[17px] h-[17px] text-muted-foreground shrink-0" strokeWidth={1.5} /> Archive Policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], []);

  /* DataTable columns for Archived tab */
  const archivedColumns = useMemo<ColumnDef<Policy>[]>(() => [
    {
      accessorKey: "name",
      header: "Policy Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-foreground">{capitalizeName(row.original.name)}</p>
          <p className="text-xs text-muted-foreground">v{row.original.version}</p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <span className="capitalize">{row.original.category}</span>,
    },
    { accessorKey: "appliedTo", header: "Applied To" },
    {
      accessorKey: "createdBy",
      header: "Created By",
      cell: ({ row }) => (
         <div>
           <p className="text-sm font-semibold text-foreground">{row.original.createdBy}</p>
           <p className="text-xs text-muted-foreground tabular-nums">{row.original.date}</p>
         </div>
      )
    },
    {
      accessorKey: "archivedOn",
      header: "Archived On",
      cell: ({ row }) => <span className="tabular-nums">{row.original.archivedOn}</span>,
    },
    {
      id: "actions",
      header: () => <div className="text-right w-full">Action</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={() => setDetailPolicy(row.original)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-auto cursor-pointer"
          >
            <Eye className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      ),
    },
  ], []);

  /* DataTable columns for Expense Category tab */
  const columns = useMemo<ColumnDef<ExpenseCategory>[]>(() => [
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.description || "—"}</span>,
    },
    {
      accessorKey: "createdBy",
      header: "Created By",
      cell: ({ row }) => <span className="text-foreground/75">{row.original.createdBy}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-foreground/75 tabular-nums">{row.original.date}</span>,
    },
    {
      accessorKey: "isPolicyAttached",
      header: "Policy",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold ${
            row.original.isPolicyAttached
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {row.original.isPolicyAttached ? "Policy Attached" : "No Policy"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right w-full">Action</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <ActionMenu
            onView={() => handleViewCategory(row.original.id)}
            onCreatePolicy={() => setIsCreatePolicyOpen(true)}
          />
        </div>
      ),
    },
  ], [handleViewCategory]);

  return (
    <div className="bg-background min-h-screen p-6 space-y-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {statCards.map((s) => (
          <StatsCard
            key={s.title}
            title={s.title}
            value={s.value}
            icon={
              <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0"
                style={{ backgroundColor: s.bg }}>
                <s.icon className="w-5 h-5" />
              </div>
            }
            subtitle={<span className="text-xs leading-[125%]">{lastUpdated}</span>}
          />
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="bg-card rounded-[1.25rem] border border-border shadow-sm overflow-hidden flex flex-col">

        {/* Tab row */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0 flex-wrap gap-3">
          {/* Pill tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            <button
              data-tour="policies-tab"
              onClick={() => { setActiveTab("policies"); setSearch(""); }}
              className={`py-1.5 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === "policies" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Policies
            </button>
            <button
              data-tour="expense-category-tab"
              onClick={() => { setActiveTab("expense"); setSearch(""); }}
              className={`py-1.5 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === "expense" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expense Category
            </button>
            <button
              onClick={() => { setActiveTab("archived"); setSearch(""); }}
              className={`py-1.5 px-4 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === "archived" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Archived
            </button>
          </div>

          {/* Search + Filter + Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 pr-4 rounded-xl border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors w-[200px]"
              />
            </div>
            <button className="h-10 px-4 rounded-xl border border-border bg-white text-sm text-muted-foreground flex items-center gap-1.5 hover:bg-muted/30 transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Filter <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button className="h-10 w-10 rounded-xl border border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors">
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ════ POLICIES TAB ════ */}
        {activeTab === "policies" && (
          <>
            {policiesApi.isLoading ? (
              <div className="border-t border-border flex justify-center items-center py-20 px-6">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                  <p className="text-sm font-medium">Fetching policies...</p>
                </div>
              </div>
            ) : activePolicies.length === 0 ? (
              <div className="border-t border-border flex justify-center items-center py-10 px-6">
                <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-border bg-primary/[0.02] py-10 px-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center mb-7">
                    <ShieldCheck className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">No policies created yet</h2>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-9">
                    Policies help you automate expense approvals and enforce spending limits.
                  </p>
                  <button
                    onClick={() => setIsCreatePolicyOpen(true)}
                    className="h-12 px-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                    Create First Policy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 border-t border-border overflow-hidden flex flex-col">
                <DataTable
                  data={filteredPolicies}
                  columns={policyColumns}
                  height="auto"
                  onRowClick={(row) => setDetailPolicy(row)}
                  paginationProps={{ ...policyTableProps.paginationProps, total: filteredPolicies.length }}
                />
              </div>
            )}
          </>
        )}

        {/* ════ EXPENSE CATEGORY TAB ════ */}
        {activeTab === "expense" && (
        <div className="flex-1 border-t border-border overflow-hidden flex flex-col">
            <DataTable
              data={filteredCategories}
              columns={columns}
              height="auto"
              onRowClick={(row) => handleViewCategory(row.id)}
              paginationProps={{ ...expenseTableProps.paginationProps, total: filteredCategories.length }}
            />
          </div>
        )}

        {/* ════ ARCHIVED TAB ════ */}
        {activeTab === "archived" && (
          <>
            {archivedPolicies.length === 0 ? (
              <div className="border-t border-border flex justify-center items-center py-10 px-6">
                <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-border bg-primary/[0.02] py-10 px-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/[0.06] flex items-center justify-center mb-7">
                    <Archive className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">No archived policies</h2>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Policies that you archive will appear here for future reference.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 border-t border-border overflow-hidden flex flex-col">
                <DataTable
                  data={archivedPolicies}
                  columns={archivedColumns}
                  height="auto"
                  onRowClick={(row) => setDetailPolicy(row)}
                  paginationProps={{ ...archivedTableProps.paginationProps, total: archivedPolicies.length }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <PolicyCreationModal
        open={isCreatePolicyOpen}
        onOpenChange={(open) => {
          setIsCreatePolicyOpen(open);
          if (!open) setEditingPolicyId(null);
        }}
        onSuccess={handleCreated}
        policyId={editingPolicyId}
      />
      <AddCategoryModal
        open={isAddCategoryOpen}
        onOpenChange={setIsAddCategoryOpen}
        onSkip={() => setIsAddCategoryOpen(false)}
        onSuccess={() => { setIsAddCategoryOpen(false); notifySetupGuide("expense-category"); }}
        showOnboardingIntro={false}
      />
      <ExpenseCategoryDetailsModal
        category={selectedCategoryDetails}
        isLoading={isCategoryDetailsLoading}
        onClose={() => {
          setSelectedCategoryDetails(null);
        }}
      />
      <PolicyDetailsModal
        policy={detailPolicy}
        onClose={() => setDetailPolicy(null)}
        onEdit={(p) => { handleEdit(p); setDetailPolicy(null); }}
        onArchive={(p) => { handleArchive(p); setDetailPolicy(null); }}
      />
      <ReviewPolicyModal
        policy={reviewPolicy}
        onClose={() => setReviewPolicy(null)}
        onApprove={(p) => { handleApprove(p); setReviewPolicy(null); }}
        onReject={(p) => { handleReject(p); setReviewPolicy(null); }}
      />
    </div>
  );
}