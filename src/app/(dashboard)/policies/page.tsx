"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  PlusCircle, ShieldCheck, MoreHorizontal, Pencil, Shield, Trash2,
  Search, RefreshCcw,
  Eye, Archive, X, UserCircle, FileText, Clock, Tag, Loader2
} from "lucide-react";
import PolicyCreationModal, { type CreatedPolicyData } from "@/components/policies/PolicyCreationModal";
import SimpleAddExpenseCategoryDialog from "@/components/policies/SimpleAddExpenseCategoryDialog";
import { ProcurementPolicySection } from "@/components/policies/procurement/ProcurementPolicySection";
import { ProcurementPolicyWizard } from "@/components/policies/procurement/ProcurementPolicyWizard";
import { PolicySummaryStrip, PolicyWorkspaceHeader, type PolicySummaryItem } from "@/components/policies/PolicyWorkspace";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { DataTable } from "@/components/datatable";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useGetExpenseCategoriesApi } from "@/queries/companies/get-expense-categories";
import { useDeleteCategoryApi } from "@/queries/companies/delete-category";
import { useGetPoliciesApi } from "@/queries/companies/get-policies";
import { useGetPolicyDetailsApi } from "@/queries/companies/get-policy-details";
import { useDeleteExpensePolicyDraft } from "@/queries/companies/expense-policy-drafts";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetCompanyRolesApi } from "@/queries/role/get-all-roles";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { useDataTable } from "@/components/datatable/useDataTable";
import { EmptyState } from "@/components/ui/empty-state";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import { useAuthStore } from "@/stores/auth-stores";
import {
  asArray,
  asRecord,
  getApiErrorMessage,
  getOptionalString,
  getString,
  isRecord,
  pickString,
} from "@/lib/types/api-error";

/* ─── Types ─────────────────────────────────────────────────────────────────── */


type PolicyStatus = "active" | "pending" | "draft" | "inactive";

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
  approversRaw: unknown[];
  approverIds?: string[];
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

// Live data logic below

function _todayStr() {
  const d = new Date();
  return [String(d.getDate()).padStart(2,"0"), String(d.getMonth()+1).padStart(2,"0"), d.getFullYear()].join("-");
}

/* ─── Status Badge ───────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:   "bg-success/10 text-success",
    pending:  "bg-pending/10 text-pending",
    draft:    "bg-draft/10 text-draft",
    inactive: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold capitalize ${map[status.toLowerCase()] ?? "bg-[#f9faf9] text-[#68726d]"}`}>
      {status}
    </span>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function formatUser(userObj: unknown, fallbackStr?: string) {
  if (!userObj) return fallbackStr || "—";
  if (typeof userObj === "string") return userObj || fallbackStr || "—";
  const user = asRecord(userObj);
  const fullName = `${pickString(user, "firstName")} ${pickString(user, "lastName")}`.trim();
  return fullName || pickString(user, "email") || fallbackStr || "Unknown User";
}

/* ─── Expense Category Action Menu ───────────────────────────────────────────── */

function ActionMenu({
  onView,
  onCreatePolicy,
  onEdit,
  onDelete,
  onArchive,
  onDeleteDraft,
}: {
  onView?: () => void;
  onCreatePolicy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onDeleteDraft?: () => void;
}) {
  const canDelete = useAuthStore(s => s.can)('expense.category', 'manage');
  const canCreatePolicy = useAuthStore(s => s.can)('policy', 'create');
  const canArchivePolicy = useAuthStore(s => s.can)('policy', 'deactivate');

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#f9faf9]/60 transition-colors cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[210px] bg-white rounded-[20px] border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 overflow-hidden">
          {onView && (
            <DropdownMenuItem onClick={onView} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer">
              <Eye className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} /> View Details
            </DropdownMenuItem>
          )}
          {onCreatePolicy && canCreatePolicy && (
            <DropdownMenuItem onClick={onCreatePolicy} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer">
              <Shield className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} /> Create policy
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer">
              <Pencil className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} /> Edit
            </DropdownMenuItem>
          )}
          {onArchive && canArchivePolicy && (
            <DropdownMenuItem onClick={onArchive} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-foreground hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer">
              <Archive className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} /> Archive Policy
            </DropdownMenuItem>
          )}
          {onDeleteDraft && (
            <DropdownMenuItem onClick={onDeleteDraft} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-destructive">
              <Trash2 className="w-[17px] h-[17px] text-destructive shrink-0" strokeWidth={1.5} /> Delete Draft
            </DropdownMenuItem>
          )}
          {onDelete && canDelete && (
            <DropdownMenuItem onClick={onDelete} className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-destructive">
              <Trash2 className="w-[17px] h-[17px] text-destructive shrink-0" strokeWidth={1.5} /> Delete Category
            </DropdownMenuItem>
          )}
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
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#f9faf9]/40 hover:bg-[#f9faf9]/80 flex items-center justify-center transition-all border border-black/[0.06]/50">
              <X className="w-5 h-5 text-[#68726d]" />
            </button>
          </div>
          <div className="h-px bg-border w-full my-6 opacity-60" />
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[#68726d] gap-2">
              <RefreshCcw className="w-4 h-4 animate-spin" />
              Loading category details...
            </div>
          ) : category ? (
            <div className="rounded-[1.5rem] border border-black/[0.06]/60 bg-[#f9faf9]/10 p-7 space-y-6">
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
                        : "bg-[#f9faf9] text-[#68726d]"
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
                  {category.description ?? <span className="italic text-[#68726d]">No description provided</span>}
                </p>
              </div>
              <div className="h-px bg-border/60" />
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Created By</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatUser(category.createdBy)}
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
                      {category.policies.map((pol, i: number) => {
                        const policy = asRecord(pol);
                        return (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-primary/10 text-sm font-medium text-foreground">
                          <Shield className="w-4 h-4 text-primary opacity-60" />{pickString(policy, "name") || `Policy ${i + 1}`}
                        </div>
                      );})}
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

function PolicyDetailsModal({ policy, onClose, onEdit, onArchive, onDeleteDraft }: {
  policy: Policy | null; onClose: () => void;
  onEdit: (p: Policy) => void; onArchive: (p: Policy) => void;
  onDeleteDraft: (draftId: string) => void;
}) {
  const canDeactivate = useAuthStore(s => s.can)('policy', 'deactivate');
  const canUpdate = useAuthStore(s => s.can)('policy', 'update');
  const { data: detailData, isLoading } = useGetPolicyDetailsApi(policy?.id || null);
  const fullPolicy = detailData?.data;

  const rolesApi = useGetCompanyRolesApi({}, { enabled: !!policy });
  const departmentsApi = useGetAllDepartmentsApi({ enabled: !!policy });

  if (!policy) return null;

  const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

  const formatUserRole = (userObj: unknown) => {
    if (!userObj || typeof userObj === "string") return "";
    const user = asRecord(userObj);
    const villetoRole = asRecord(user.villetoRole);
    const role = asRecord(user.role);
    const roleName =
      pickString(villetoRole, "name") ||
      pickString(role, "name") ||
      pickString(user, "jobTitle", "position");
    return roleName.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
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
    const sType = getString(asRecord(fullPolicy).scopeType) || fullPolicy?.scope?.type;
    if (sType === "all" || sType === "all_employees") return "All Employees";
    
    if (!fullPolicy?.scope) return policy.appliedTo;
    const scope = fullPolicy.scope;
    const deptIds = scope.type === "specific" ? scope.departments || [] : [];
    const roleIds = scope.type === "specific" ? scope.userRoles || fullPolicy.applicableRoles || [] : [];
    const depts = deptIds.map((d: string) => {
      const dept = asArray(departmentsApi.data?.data).filter(isRecord).find((o) => String(o.departmentId) === String(d));
      return dept ? pickString(dept, "departmentName") || d : d;
    });
    const roles = roleIds.map((r: string) => {
      const role = asArray(rolesApi.data?.data).filter(isRecord).find((o) => String(o.roleId) === String(r));
      const roleName = role ? pickString(role, "name") : r;
      return roleName.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    });
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
                <h2 className="text-lg font-bold text-[#0b100e] leading-tight">
                  {capitalizeName(policyName)}
                </h2>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={policyStatus} />
                  {policyStatus === "draft" && canUpdate && (
                    <button
                      onClick={() => onDeleteDraft(policy.id)}
                      className="ml-1 p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                      title="Delete Draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#68726d] mt-0.5">v{policyVersion}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f9faf9]/40 hover:bg-[#f9faf9]/70 flex items-center justify-center transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-[#68726d]" />
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-[#68726d]">
              <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
              <p>Loading policy details…</p>
            </div>
          ) : (
            <>
              {/* APPLIES TO */}
              <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
                <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
                  Applies To
                </p>
                <p className="text-sm text-[#0b100e]/80 leading-relaxed">{getScopeText()}</p>
              </div>

              {/* EXPENSE CATEGORY */}
              <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
                <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
                  Expense Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {(fullPolicy?.expenseCategories || []).length > 0 ? (
                    (fullPolicy?.expenseCategories || []).map((cat, i: number) => {
                      const category = isRecord(cat) ? cat : asRecord({ value: cat });
                      const label =
                        typeof cat === "string"
                          ? cat
                          : pickString(category, "name", "category") || String(cat);
                      return (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full border border-black/[0.06]/60 bg-[#f9faf9]/30 text-foreground/70 text-xs font-medium"
                      >
                        {label}
                      </span>
                    );})
                  ) : (
                    <p className="text-sm text-[#68726d] italic">No specific categories attached.</p>
                  )}
                </div>
              </div>

              {/* ENFORCEMENT RULES */}
              <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
                <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
                  Enforcement Rules
                </p>
                <div className="space-y-2">
                  {(fullPolicy?.rules ?? []).length > 0 ? (
                    (fullPolicy?.rules ?? []).map((rawRule, i: number) => {
                      const r = asRecord(rawRule);
                      const isLimit = getString(r.type) === "spend_limit";
                      const isBlock = getString(r.enforcementAction) === "block";
                      const enforcement = isBlock ? "Hard Block" : "Soft Warning";
                      const description = isLimit
                        ? `Must not exceed ${pickString(r, "currency") || "NGN"} ${Number(r.amount || 0).toLocaleString()}/${mapTimeframe(getOptionalString(r.timeUnit) || getOptionalString(r.time_unit) || getOptionalString(r.timeframe) || fullPolicy?.spendLimitPeriod)}`
                        : (r.receiptAmountThreshold || r.threshold)
                          ? `For transactions above ${pickString(r, "currency") || "NGN"} ${Number(r.receiptAmountThreshold || r.threshold).toLocaleString()}`
                          : "Required for all transactions";
                      return (
                        <div key={i} className="rounded-[14px] border border-black/[0.06] p-3.5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-[#0b100e]">
                              {isLimit ? "Spend Limit" : "Receipts requirement"}
                            </span>
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
                          <p className="text-xs text-[#68726d]">{description}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[#68726d] italic text-center py-3">
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
                <p className="text-[11px] text-[#68726d] mb-1.5">Created by</p>
                <p className="text-sm font-semibold text-[#0b100e] leading-tight">
                  {formatUser(fullPolicy?.createdBy, policy.createdBy)}
                </p>
                <p className="text-xs text-[#68726d] mt-0.5">{formatDate(createdAt, policy.date)}</p>
              </div>
              {/* Approved by */}
              {approvers.length > 0 && (
                <div className="text-right">
                  <p className="text-[11px] text-[#68726d] mb-1.5">Approved by</p>
                  <div className="space-y-2">
                    {approvers.map((a: unknown, i: number) => {
                      const roleLabel = formatUserRole(a);
                      return (
                        <div key={i}>
                          <p className="text-sm font-semibold text-[#0b100e] leading-tight">
                            {formatUser(a)}
                            {roleLabel && (
                              <span className="text-[#68726d] font-normal"> ({roleLabel})</span>
                            )}
                          </p>
                          <p className="text-xs text-[#68726d] mt-0.5">{formatDate(createdAt, policy.date)}</p>
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
          {canDeactivate && (
            <button
              onClick={() => { onArchive(policy); onClose(); }}
              className="flex-1 h-11 rounded-full border border-[#087f70] text-[#087f70] text-sm font-semibold hover:bg-[#087f70]/5 transition-colors"
            >
              Move to Archive
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => { onEdit(policy); onClose(); }}
              className="flex-1 h-11 rounded-full bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Edit
            </button>
          )}
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
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#f9faf9]/40 hover:bg-[#f9faf9]/80 flex items-center justify-center transition-all border border-black/[0.06]/50">
              <X className="w-5 h-5 text-[#68726d]" />
            </button>
          </div>
          <div className="h-px bg-border w-full my-6 opacity-60" />
          <div className="rounded-[1.5rem] border border-black/[0.06]/60 bg-[#f9faf9]/10 p-7 space-y-6">
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
                  const name = typeof a === "string" ? a : String(a);
                  return (
                    <div key={`${name}-${i}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-primary/10 text-sm font-medium text-foreground">
                      <UserCircle className="w-4 h-4 text-primary opacity-60" />{name}
                    </div>
                  );
                }) : <p className="text-sm text-[#68726d] italic">None assigned</p>}
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

function PoliciesPage() {
  const axios = useAxios();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const tabFromUrl = searchParams.get("tab");
  const activeTab: "policies" | "expense" | "archived" =
    tabFromUrl === "expense" || tabFromUrl === "policies" || tabFromUrl === "archived"
      ? tabFromUrl
      : "policies";

  const switchTab = useCallback((tab: "policies" | "expense" | "archived") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/policies?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Top-level policy type toggle (Expenses Policy vs Procurement Policy).
  // Procurement policies are UI-only for now — no backend/endpoints exist
  // for them yet, so their data lives in local state below.
  const policyType: "expense" | "procurement" =
    searchParams.get("type") === "procurement" ? "procurement" : "expense";

  const [procurementView, setProcurementView] = useState<"list" | "create">("list");

  const switchPolicyType = useCallback((type: "expense" | "procurement") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    router.replace(`/policies?${params.toString()}`, { scroll: false });
    setProcurementView("list");
  }, [router, searchParams]);

  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen]   = useState(false);
  const [detailPolicy, setDetailPolicy]     = useState<Policy | null>(null);
  const [reviewPolicy, setReviewPolicy]     = useState<Policy | null>(null);
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<ExpenseCategoryDetails | null>(null);
  const [isCategoryDetailsLoading, setIsCategoryDetailsLoading] = useState(false);
  const [search, setSearch]                 = useState("");
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);

  const can = useAuthStore(s => s.can);
  const canReadExpenseCategories = can('expense.category', 'read') || can('expense.category', 'manage');
  const canReadPolicies = can('policy', 'read') || can('policy', 'manage') || can('policy', 'create');

  const expCatApi = useGetExpenseCategoriesApi({ enabled: canReadExpenseCategories });
  const canManageCategories = can('expense.category', 'manage');
  const canCreatePolicy = can('policy', 'create');

  const liveExpenseCategories = useMemo<ExpenseCategory[]>(() => {
    return asArray(expCatApi.data?.data).filter(isRecord).map((c) => ({
      id: pickString(c, "categoryId", "id"),
      category: getString(c.name),
      description: getString(c.description),
      createdBy: formatUser(c.createdBy),
      date: c.createdAt ? new Date(getString(c.createdAt)).toLocaleDateString() : "—",
      isPolicyAttached: Boolean(c.isPolicyAttached),
    }));
  }, [expCatApi.data?.data]);

  const queryClient = useQueryClient();

  // Pagination state for the policies table
  const policyTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 20,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: true,
  });
  const setPolicyTotalItems = policyTableProps.setTotalItems;

  const policiesApi = useGetPoliciesApi({ 
    page: policyTableProps.page, 
    limit: policyTableProps.pageSize, 
    excludeDrafts: false 
  }, { enabled: canReadPolicies });


  const expenseTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 5,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const archivedTableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 5,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

  const policies = useMemo<Policy[]>(() => {
    const rawPolicies = policiesApi.data?.data || [];
    const sortedPolicies = [...asArray(rawPolicies).filter(isRecord)].sort((a, b) =>
       new Date(getString(b.createdAt) || 0).getTime() - new Date(getString(a.createdAt) || 0).getTime()
    );

    return sortedPolicies.map((p) => {
      const getCatNames = (cats: unknown[]) => {
        if (!cats || !cats.length) return "General";
        const names = cats.map((rawCat) => {
          if (typeof rawCat === 'string') {
            return liveExpenseCategories.find(lc => lc.id === rawCat)?.category || rawCat;
          }
          const c = asRecord(rawCat);
          return pickString(c, "name", "category") || 'Category';
        });
        return names.join(", ");
      };

      const createdByObj = p.createdBy;
      const createdByName = isRecord(createdByObj)
        ? `${pickString(createdByObj, "firstName")} ${pickString(createdByObj, "lastName")}`.trim() || pickString(createdByObj, "email") || "Admin"
        : typeof createdByObj === 'string' ? createdByObj : "Admin";
      const scope = asRecord(p.scope);
      const rules = asArray(p.rules).filter(isRecord);

      return {
        id: pickString(p, "policyId", "id") || Math.random().toString(),
        name: getString(p.name),
        version: Number(p.version) || 1,
        category: getCatNames(asArray(p.expenseCategories)),
        appliedTo: getString(p.scopeType) === "all" || getString(p.scopeType) === "all_employees" || getString(scope.type) === "all" || getString(scope.type) === "all_employees" ? "All Employees" : "Specific Employees",
        createdBy: createdByName,
        date: p.createdAt ? new Date(getString(p.createdAt)).toLocaleDateString() : "—",
        status: (getString(p.status).toLowerCase() as PolicyStatus) || "inactive",
        approvers: asArray(p.approvers).map((rawApprover) => {
          if (typeof rawApprover === 'string') return rawApprover;
          const a = asRecord(rawApprover);
          return pickString(a, "firstName")
            ? `${pickString(a, "firstName")} ${pickString(a, "lastName")}`.trim()
            : pickString(a, "email") || 'User';
        }),
        approversRaw: asArray(p.approvers),
        approverIds: asArray(p.approverIds).map(String),
        dailyLimit: getString(rules.find((r) => getString(r.type) === "spend_limit")?.amount) || "0",
        receiptRequired: !!rules.find((r) => getString(r.type) === "receipt_requirement")?.amount,
        archivedOn: p.deletedAt ? new Date(getString(p.deletedAt)).toLocaleDateString() : undefined,
      };
    });
  }, [policiesApi.data?.data, liveExpenseCategories]);

  useEffect(() => {
    if (policiesApi.data?.meta?.totalCount !== undefined) {
      setPolicyTotalItems(policiesApi.data.meta.totalCount);
    } else if (policiesApi.data?.data) {
      setPolicyTotalItems(policiesApi.data.data.length);
    }
  }, [policiesApi.data, setPolicyTotalItems]);

  // Register dynamic header CTA button
  const { setAction, clearAction } = useHeaderActionStore();

  useEffect(() => {
    if (procurementView === "create") {
      clearAction();
      return;
    }
    if (policyType === "procurement") {
      if (canCreatePolicy) {
        setAction({
          label: "New Procurement Policy",
          dataTourId: "new-procurement-policy-button",
          onClick: () => setProcurementView("create"),
        });
      } else {
        clearAction();
      }
    } else { // policyType === "expense"
      if (activeTab === "policies") {
        if (canCreatePolicy) {
          setAction({ label: "New Expense Policy", dataTourId: "new-policy-button", onClick: () => setIsCreatePolicyOpen(true) });
        } else {
          clearAction();
        }
      } else if (activeTab === "expense") {
        if (canManageCategories) {
          setAction({ label: "New Expense Category", dataTourId: "new-expense-category-button", onClick: () => setIsAddCategoryOpen(true) });
        } else {
          clearAction();
        }
      } else {
        // Archived tab — no button
        clearAction();
      }
    }
    // Cleanup on unmount
    return () => clearAction();
  }, [activeTab, policyType, procurementView, setAction, clearAction, canCreatePolicy, canManageCategories]);

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

  const handleViewCategory = useCallback(async (categoryId: string) => {
    setIsCategoryDetailsLoading(true);
    setSelectedCategoryDetails(null);
    try {
      const response = await axios.get(API_KEYS.EXPENSE.CATEGORY_DETAIL(categoryId));
      const payload = response?.data?.data ?? response?.data;
      setSelectedCategoryDetails(payload as ExpenseCategoryDetails);
    } catch {
      toast.error("Failed to load expense category details");
    } finally {
      setIsCategoryDetailsLoading(false);
    }
  }, [axios]);

  const deleteCategoryMutation = useDeleteCategoryApi();
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const executeDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategoryMutation.mutateAsync({ categoryId: categoryToDelete });
      toast.success("Expense category deleted successfully");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete expense category"));
    } finally {
      setCategoryToDelete(null);
    }
  };

  const deleteDraftMutation = useDeleteExpensePolicyDraft();
  
  const executeDeleteDraft = async () => {
    if (!draftToDelete) return;
    try {
      await deleteDraftMutation.mutateAsync(draftToDelete);
      toast.success("Draft deleted successfully");
      if (detailPolicy?.id === draftToDelete) {
        setDetailPolicy(null);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to delete draft"));
    } finally {
      setDraftToDelete(null);
    }
  };

  /* handlers */
  const handleCreated = (_data: CreatedPolicyData) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    notifySetupGuide("policy");
    switchTab("policies");
  };

  const handleEdit = useCallback((policy: Policy) => {
    if (policy.status === "draft") {
      setEditingDraftId(policy.id);
      setEditingPolicyId(null);
    } else {
      setEditingPolicyId(policy.id);
      setEditingDraftId(null);
    }
    setIsCreatePolicyOpen(true);
  }, []);
  const handleArchive = useCallback((_policy: Policy) => toast.info("Archive policy API not integrated yet."), []);

  const handleReviewAction = async (policy: Policy, action: "approve" | "reject") => {
    try {
      await axios.patch(API_KEYS.EXPENSE.POLICY_ACTION(policy.id, action));
      toast.success(`Policy ${action === "approve" ? "approved" : "rejected"} successfully`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
      setReviewPolicy(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, `Failed to ${action === "approve" ? "approve" : "reject"} policy`));
    }
  };

  const handleApprove = (policy: Policy) => handleReviewAction(policy, "approve");
  const handleReject  = (policy: Policy) => handleReviewAction(policy, "reject");

  /**
   * Re-validates approver status against fresh server data before opening
   * the Review modal. `approversRaw` on the row may be stale (loaded when
   * the table was fetched) — if the user was removed as an approver since
   * then, the button should not have appeared, but as a defense-in-depth
   * check we re-fetch and confirm before allowing the action to surface.
   */
  const handleOpenReview = useCallback(async (policy: Policy) => {
    try {
      const res = await axios.get(API_KEYS.EXPENSE.POLICY_BY_ID(policy.id));
      const freshPolicy = asRecord(res.data?.data);
      const freshApprovers = asArray(freshPolicy.approversRaw ?? freshPolicy.approvers);
      const stillApprover = freshApprovers.some((rawApprover) => {
        const a = asRecord(rawApprover);
        return pickString(a, "userId", "id") === user?.userId;
      });

      if (!stillApprover) {
        toast.error("You are no longer an approver for this policy.");
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
        return;
      }
      setReviewPolicy(policy);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to load policy details. Please try again."));
    }
  }, [axios, queryClient, user?.userId]);

  const policySummary: PolicySummaryItem[] = [
    { label: "Active", value: approvedCount, detail: "Policies currently enforced", icon: ShieldCheck, tone: "teal" },
    { label: "Pending", value: pendingCount, detail: "Waiting for an approver", icon: Clock, tone: "amber" },
    { label: "Drafts", value: draftedCount, detail: "Still being configured", icon: FileText, tone: "slate" },
    { label: "Categories", value: liveExpenseCategories.length, detail: "Expense classifications", icon: Tag, tone: "blue" },
  ];

  /* DataTable columns for Policy tab */
  const policyColumns = useMemo<ColumnDef<Policy>[]>(() => [
    {
      accessorKey: "name",
      header: "Policy Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-foreground">{capitalizeName(row.original.name)}</p>
          <p className="text-xs text-[#68726d]">v{row.original.version}</p>
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
           <p className="text-xs text-[#68726d] tabular-nums">{row.original.date}</p>
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
        const isApprover = policy.approversRaw.some((rawApprover) => {
          const a = asRecord(rawApprover);
          return pickString(a, "userId") === user?.userId;
        }) || (user?.userId ? policy.approverIds?.includes(user.userId) : false);
        
        const { can } = useAuthStore.getState();
        const canUpdate = can('policy', 'update');
        const canDeactivate = can('policy', 'deactivate');
        
        const showReviewOnly = policy.status === "inactive" && isApprover;

        return (
          <div className="flex items-center justify-end gap-2">
            {showReviewOnly ? (
              <button
                onClick={() => handleOpenReview(policy)}
                className="h-8 px-4 rounded-[12px] bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Review
              </button>
            ) : (
              <ActionMenu
                onView={() => setDetailPolicy(policy)}
                onEdit={canUpdate ? () => handleEdit(policy) : undefined}
                onArchive={policy.status !== "draft" && canDeactivate ? () => handleArchive(policy) : undefined}
                onDeleteDraft={policy.status === "draft" && canUpdate ? () => setDraftToDelete(policy.id) : undefined}
              />
            )}
          </div>
        );
      },
    },
  ], [handleOpenReview, user?.userId, handleEdit, handleArchive]);

  /* DataTable columns for Archived tab */
  const archivedColumns = useMemo<ColumnDef<Policy>[]>(() => [
    {
      accessorKey: "name",
      header: "Policy Name",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-foreground">{capitalizeName(row.original.name)}</p>
          <p className="text-xs text-[#68726d]">v{row.original.version}</p>
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
           <p className="text-xs text-[#68726d] tabular-nums">{row.original.date}</p>
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
            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#68726d] hover:text-foreground hover:bg-[#f9faf9]/60 transition-colors ml-auto cursor-pointer"
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
      cell: ({ row }) => (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[280px] cursor-default">
                <span className="text-[#68726d] block truncate">
                  {row.original.description || "—"}
                </span>
              </div>
            </TooltipTrigger>
            {row.original.description && (
              <TooltipContent align="start" className="max-w-[300px] break-words">
                <p>{row.original.description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ),
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
              : "bg-[#f9faf9] text-[#68726d]"
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
            onDelete={() => setCategoryToDelete(row.original.id)}
          />
        </div>
      ),
    },
  ], [handleViewCategory]);

  const policyTypeToggle = (
    <PolicyWorkspaceHeader policyType={policyType} onPolicyTypeChange={switchPolicyType} />
  );

  if (policyType === "procurement" && procurementView === "create") {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white rounded-[1.25rem] flex-1 flex flex-col min-h-0 overflow-hidden">
          <ProcurementPolicyWizard
            onCancel={() => setProcurementView("list")}
            onComplete={() => setProcurementView("list")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full pb-8">
      <>
      {policyTypeToggle}

      {policyType === "procurement" ? (
        <ProcurementPolicySection
          canCreate={canCreatePolicy}
          onCreateClick={() => setProcurementView("create")}
        />
      ) : (
      <>
      <PolicySummaryStrip items={policySummary} isLoading={policiesApi.isLoading || expCatApi.isLoading} />

      {/* ── Main card ── */}
      <div className="bg-white rounded-[15px] border border-black/[0.07] shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] overflow-hidden flex flex-col">

        {/* Tab row */}
        <div className="flex items-center justify-between px-4 md:px-5 py-4 shrink-0 flex-wrap gap-3 border-b border-black/[0.055]">
          {/* Pill tabs */}
          <div className="flex max-w-full overflow-x-auto bg-[#eaf0ed] rounded-[10px] p-1">
            <button
              data-tour="policies-tab"
              onClick={() => { switchTab("policies"); setSearch(""); }}
              className={`h-8 px-4 text-[10px] rounded-[7px] transition-all whitespace-nowrap ${
                activeTab === "policies" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-medium hover:text-[#0b100e]"
              }`}
            >
              Policies
            </button>
            {canManageCategories && (
              <button
                data-tour="expense-category-tab"
                onClick={() => { switchTab("expense"); setSearch(""); }}
                className={`h-8 px-4 text-[10px] rounded-[7px] transition-all whitespace-nowrap ${
                  activeTab === "expense" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-medium hover:text-[#0b100e]"
                }`}
              >
                Expense Category
              </button>
            )}
            <button
              onClick={() => { switchTab("archived"); setSearch(""); }}
              className={`h-8 px-4 text-[10px] rounded-[7px] transition-all whitespace-nowrap ${
                activeTab === "archived" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-medium hover:text-[#0b100e]"
              }`}
            >
              Archived
            </button>
          </div>

          {/* Search + Filter + Refresh */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68726d]" />
              <input
                placeholder={activeTab === "expense" ? "Search categories" : "Search policies"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[9px] border border-black/[0.07] bg-white pl-9 pr-4 text-[10px] placeholder:text-[#929c97] focus:outline-none focus:border-[#0ea894] transition-colors sm:w-[220px]"
              />
            </div>
            <button
              type="button"
              onClick={() => activeTab === "expense" ? expCatApi.refetch() : policiesApi.refetch()}
              disabled={activeTab === "expense" ? expCatApi.isRefetching : policiesApi.isRefetching}
              className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-black/[0.07] bg-white text-[#68726d] hover:bg-[#f4f8f6] hover:text-[#087f70] transition-colors"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${(activeTab === "expense" ? expCatApi.isRefetching : policiesApi.isRefetching) ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh policy data</span>
            </button>
          </div>
        </div>

        {/* ════ POLICIES TAB ════ */}
        {activeTab === "policies" && (
          <>
            {policiesApi.isLoading ? (
              <div className="border-t border-black/[0.06] flex justify-center items-center py-20 px-6">
                <div className="flex flex-col items-center gap-4 text-[#68726d]">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                  <p className="text-sm font-medium">Fetching policies...</p>
                </div>
              </div>
            ) : activePolicies.length === 0 ? (
              <div className="border-t border-black/[0.06] flex justify-center items-center py-10 px-6">
                <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-black/[0.06] bg-[#087f70]/[0.02] py-10 px-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-[24px] bg-[#087f70]/[0.06] flex items-center justify-center mb-7">
                    <ShieldCheck className="w-7 h-7 text-[#68726d]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-[#0b100e] mb-2">No policies created yet</h2>
                  <p className="text-sm text-[#68726d] max-w-xs leading-relaxed mb-9">
                    Policies help you automate expense approvals and enforce spending limits.
                  </p>
                  {canCreatePolicy && (
                    <button
                      onClick={() => setIsCreatePolicyOpen(true)}
                      className="h-12 px-7 rounded-full bg-[#087f70] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                      Create First Policy
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 border-t border-black/[0.06] overflow-hidden flex flex-col">
                <DataTable
                  data={filteredPolicies}
                  columns={policyColumns}
                  height="auto"
                  emptyState={
                    <EmptyState 
                      icon={<Search className="w-6 h-6" />}
                      title="No policies found"
                      description="Try adjusting your search query to find what you're looking for."
                    />
                  }
                  onRowClick={(row) => setDetailPolicy(row)}
                  paginationProps={{ ...policyTableProps.paginationProps, total: filteredPolicies.length }}
                />
              </div>
            )}
          </>
        )}

        {/* ════ EXPENSE CATEGORY TAB ════ */}
        {activeTab === "expense" && (
          <>
            {expCatApi.isLoading ? (
              <div className="border-t border-black/[0.06] flex justify-center items-center py-20 px-6">
                <div className="flex flex-col items-center gap-4 text-[#68726d]">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
                  <p className="text-sm font-medium">Fetching categories...</p>
                </div>
              </div>
            ) : liveExpenseCategories.length === 0 ? (
              <div className="border-t border-black/[0.06] flex justify-center items-center py-10 px-6">
                <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-black/[0.06] bg-[#087f70]/[0.02] py-10 px-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-[24px] bg-[#087f70]/[0.06] flex items-center justify-center mb-7">
                    <Tag className="w-7 h-7 text-[#68726d]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-[#0b100e] mb-2">No expense categories</h2>
                  <p className="text-sm text-[#68726d] max-w-xs leading-relaxed mb-9">
                    Expense categories help you organize and control spending across your company.
                  </p>
                  {canManageCategories && (
                    <button
                      onClick={() => setIsAddCategoryOpen(true)}
                      className="h-12 px-7 rounded-full bg-[#087f70] text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                      Create First Category
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 border-t border-black/[0.06] overflow-hidden flex flex-col">
                <DataTable
                  data={filteredCategories}
                  columns={columns}
                  height="auto"
                  emptyState={
                    <EmptyState 
                      icon={<Search className="w-6 h-6" />}
                      title="No expense categories found"
                      description="Try adjusting your search query to find what you're looking for."
                    />
                  }
                  onRowClick={(row) => handleViewCategory(row.id)}
                  paginationProps={{ ...expenseTableProps.paginationProps, total: filteredCategories.length }}
                />
              </div>
            )}
          </>
        )}

        {/* ════ ARCHIVED TAB ════ */}
        {activeTab === "archived" && (
          <>
            {archivedPolicies.length === 0 ? (
              <div className="border-t border-black/[0.06] flex justify-center items-center py-10 px-6">
                <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-black/[0.06] bg-primary/[0.02] py-10 px-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-[24px] bg-primary/[0.06] flex items-center justify-center mb-7">
                    <Archive className="w-7 h-7 text-[#68726d]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">No archived policies</h2>
                  <p className="text-sm text-[#68726d] max-w-xs leading-relaxed">
                    Policies that you archive will appear here for future reference.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 border-t border-black/[0.06] overflow-hidden flex flex-col">
                <DataTable
                  data={archivedPolicies}
                  columns={archivedColumns}
                  height="auto"
                  emptyState={
                    <EmptyState 
                      icon={<Search className="w-6 h-6" />}
                      title="No archived policies found"
                      description="Try adjusting your search query to find what you're looking for."
                    />
                  }
                  onRowClick={(row) => setDetailPolicy(row)}
                  paginationProps={{ ...archivedTableProps.paginationProps, total: archivedPolicies.length }}
                />
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}
      </>

      {/* ── Modals ── */}
      <PolicyCreationModal
        open={isCreatePolicyOpen}
        onOpenChange={(open) => {
          setIsCreatePolicyOpen(open);
          if (!open) {
            setEditingPolicyId(null);
            setEditingDraftId(null);
          }
        }}
        onSuccess={handleCreated}
        policyId={editingPolicyId}
        initialDraftId={editingDraftId}
      />

      <AlertDialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="rounded-[14px] border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. This action cannot be undone. 
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteCategory} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={draftToDelete !== null} onOpenChange={(open) => !open && setDraftToDelete(null)}>
        <AlertDialogContent className="rounded-[14px] border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this drafted policy. This action cannot be undone. 
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteDraft} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteDraftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SimpleAddExpenseCategoryDialog
        open={isAddCategoryOpen}
        onOpenChange={setIsAddCategoryOpen}
        onSuccess={() => { notifySetupGuide("expense-category"); }}
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
        onDeleteDraft={(draftId) => setDraftToDelete(draftId)}
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

export default withPermissions(PoliciesPage, [
  { resource: "policy", action: "read_company" }
]);
