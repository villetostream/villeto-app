"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { POLICY_GROUPS, getActionDef, getConditionDef } from "../constants";
import { PRIORITY_OPTIONS, type ExceptionCategory, type PolicyDraft, type PolicyRule } from "../types";

// ─── Rule evaluation ──────────────────────────────────────────────────────────

interface SimInputs {
  amount: number;
  currency: string;
  vendorId: string;
  roleId: string;
  hasContract: boolean;
  hasJustification: boolean;
  hasAttachments: boolean;
  quotesProvided: number;
  isAccountingResolved: boolean;
  prCountThisPeriod: number;
  isPrCreationPaused: boolean;
}

interface RuleResult {
  rule: PolicyRule;
  triggered: boolean;
  reason: string;
}

function evaluateRule(rule: PolicyRule, inputs: SimInputs): RuleResult {
  const action = getActionDef(rule.enforcementAction);
  const actionLabel = action?.label ?? rule.enforcementAction;

  const notTriggered = (reason: string): RuleResult => ({ rule, triggered: false, reason });
  const triggered = (reason: string): RuleResult => ({ rule, triggered: true, reason });

  switch (rule.condition) {
    case "amount_greater_than":
      return inputs.amount > (rule.amount ?? 0)
        ? triggered(`Amount ${inputs.currency} ${inputs.amount.toLocaleString()} exceeds threshold of ${inputs.currency} ${(rule.amount ?? 0).toLocaleString()} → ${actionLabel}`)
        : notTriggered(`Amount ${inputs.currency} ${inputs.amount.toLocaleString()} is within the threshold of ${inputs.currency} ${(rule.amount ?? 0).toLocaleString()}.`);

    case "amount_less_than":
      return inputs.amount < (rule.amount ?? 0)
        ? triggered(`Amount ${inputs.currency} ${inputs.amount.toLocaleString()} is below threshold of ${inputs.currency} ${(rule.amount ?? 0).toLocaleString()} → ${actionLabel}`)
        : notTriggered(`Amount ${inputs.currency} ${inputs.amount.toLocaleString()} meets or exceeds the threshold.`);

    case "unit_price_greater_than":
      return inputs.amount > (rule.amount ?? 0)
        ? triggered(`Unit price ${inputs.currency} ${inputs.amount.toLocaleString()} exceeds threshold → ${actionLabel}`)
        : notTriggered(`Unit price is within the threshold.`);

    case "line_total_greater_than":
      return inputs.amount > (rule.amount ?? 0)
        ? triggered(`Line total ${inputs.currency} ${inputs.amount.toLocaleString()} exceeds threshold → ${actionLabel}`)
        : notTriggered(`Line total is within the threshold.`);

    case "vendor_not_in_allowed_list": {
      const allowed = rule.allowedVendorIds ?? [];
      return allowed.length > 0 && inputs.vendorId && !allowed.includes(inputs.vendorId)
        ? triggered(`Selected vendor is not in the approved vendor list → ${actionLabel}`)
        : notTriggered("Selected vendor is on the approved list.");
    }

    case "requester_role_not_allowed": {
      const allowed = rule.allowedRoleIds ?? [];
      return allowed.length > 0 && inputs.roleId && !allowed.includes(inputs.roleId)
        ? triggered(`Requester role is not in the permitted roles → ${actionLabel}`)
        : notTriggered("Requester role is permitted.");
    }

    case "requester_role_requires_manager_approval": {
      const target = rule.allowedRoleIds ?? [];
      return target.length > 0 && inputs.roleId && target.includes(inputs.roleId)
        ? triggered(`Requester role requires manager approval → ${actionLabel}`)
        : notTriggered("Requester role does not require escalated approval.");
    }

    case "active_contract_missing":
    case "contract_not_active":
      return !inputs.hasContract
        ? triggered(`No active contract exists with the vendor → ${actionLabel}`)
        : notTriggered("Active contract is in place.");

    case "quotations_required":
      return inputs.quotesProvided < (rule.minimumQuotes ?? 1)
        ? triggered(`Only ${inputs.quotesProvided} quote(s) provided; ${rule.minimumQuotes ?? 1} required → ${actionLabel}`)
        : notTriggered(`${inputs.quotesProvided} quote(s) provided; requirement of ${rule.minimumQuotes ?? 1} met.`);

    case "business_justification_required":
      return !inputs.hasJustification
        ? triggered(`No business justification provided → ${actionLabel}`)
        : notTriggered("Business justification is present.");

    case "required_attachments_missing":
      return !inputs.hasAttachments
        ? triggered(`Required supporting documents are missing → ${actionLabel}`)
        : notTriggered("Required documents are attached.");

    case "accounting_unresolved":
      return !inputs.isAccountingResolved
        ? triggered(`Accounting / budget information is unresolved → ${actionLabel}`)
        : notTriggered("Accounting and budget are resolved.");

    case "pr_count_exceeds_limit":
      return inputs.prCountThisPeriod > (rule.maxCount ?? 0)
        ? triggered(`${inputs.prCountThisPeriod} PRs submitted this period exceeds limit of ${rule.maxCount ?? 0} → ${actionLabel}`)
        : notTriggered(`${inputs.prCountThisPeriod} PRs submitted; within the limit of ${rule.maxCount ?? 0}.`);

    case "pr_creation_paused":
      return inputs.isPrCreationPaused
        ? triggered(`PR creation is currently paused → ${actionLabel}`)
        : notTriggered("PR creation is not paused.");

    default:
      return notTriggered("Condition not evaluated in simulation.");
  }
}

// ─── Simulator inputs derived from rules ──────────────────────────────────────

function useSimulatorFields(rules: PolicyRule[]) {
  const conditions = new Set(rules.map((r) => r.condition).filter(Boolean));
  return {
    needsAmount: conditions.has("amount_greater_than") || conditions.has("amount_less_than") ||
      conditions.has("unit_price_greater_than") || conditions.has("line_total_greater_than"),
    needsVendor: conditions.has("vendor_not_in_allowed_list"),
    needsRole: conditions.has("requester_role_not_allowed") || conditions.has("requester_role_requires_manager_approval"),
    needsContract: conditions.has("active_contract_missing") || conditions.has("contract_not_active"),
    needsQuotes: conditions.has("quotations_required"),
    needsJustification: conditions.has("business_justification_required"),
    needsAttachments: conditions.has("required_attachments_missing"),
    needsAccounting: conditions.has("accounting_unresolved"),
    needsPrCount: conditions.has("pr_count_exceeds_limit"),
    needsPrPause: conditions.has("pr_creation_paused"),
  };
}

// ─── Summary helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── StepReview ───────────────────────────────────────────────────────────────

export function StepReview({ draft }: { draft: PolicyDraft }) {
  const fields = useSimulatorFields(draft.rules);

  // Simulator state
  const [simAmount, setSimAmount] = useState("500000");
  const [simCurrency, setSimCurrency] = useState("NGN");
  const [simVendorId, setSimVendorId] = useState("");
  const [simRoleId, setSimRoleId] = useState("");
  const [simHasContract, setSimHasContract] = useState(true);
  const [simHasJustification, setSimHasJustification] = useState(true);
  const [simHasAttachments, setSimHasAttachments] = useState(true);
  const [simQuotes, setSimQuotes] = useState("0");
  const [simAccountingOk, setSimAccountingOk] = useState(true);
  const [simPrCount, setSimPrCount] = useState("0");
  const [simPrPaused, setSimPrPaused] = useState(false);
  const [results, setResults] = useState<RuleResult[] | null>(null);

  const vendorsQ = useGetVendors({ enabled: fields.needsVendor });
  const rolesQ = useGetAllRolesApi({ limit: 100 }, { enabled: fields.needsRole });
  const vendors: { vendorId: string; displayName: string }[] = vendorsQ.data?.data ?? [];
  const roles: { roleId: string; name: string }[] = rolesQ.data?.data ?? [];

  // Gather unique vendor/role IDs from rules for display
  const allAllowedVendorIds = useMemo(() =>
    [...new Set(draft.rules.flatMap((r) => r.allowedVendorIds ?? []))], [draft.rules]);
  const allAllowedRoleIds = useMemo(() =>
    [...new Set(draft.rules.flatMap((r) => r.allowedRoleIds ?? []))], [draft.rules]);

  const runSim = () => {
    const inputs: SimInputs = {
      amount: Number(simAmount) || 0,
      currency: simCurrency,
      vendorId: simVendorId,
      roleId: simRoleId,
      hasContract: simHasContract,
      hasJustification: simHasJustification,
      hasAttachments: simHasAttachments,
      quotesProvided: Number(simQuotes) || 0,
      isAccountingResolved: simAccountingOk,
      prCountThisPeriod: Number(simPrCount) || 0,
      isPrCreationPaused: simPrPaused,
    };
    setResults(draft.rules.map((r) => evaluateRule(r, inputs)));
  };

  const triggeredResults = results?.filter((r) => r.triggered) ?? [];
  const hardBlocked = triggeredResults.some((r) => {
    const a = getActionDef(r.rule.enforcementAction);
    return a?.severity === "hard";
  });
  const anyTriggered = triggeredResults.length > 0;

  const groupLabel = POLICY_GROUPS.find((g) => g.value === draft.policyGroup)?.title ?? "Policy";

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Review &amp; Simulate</h2>
      <p className="text-sm text-[#68726d] mb-6">
        Review your policy configuration and run the simulator to preview how rules will behave.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">

        {/* ── Policy summary ────────────────────────────────────────── */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#68726d] uppercase tracking-widest">
            {groupLabel} — Policy Summary
          </h3>

          {/* Name & description */}
          <div className="rounded-[24px] border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold text-[#68726d] uppercase tracking-wide mb-2">Name &amp; Description</p>
            <p className="text-sm font-bold text-foreground">{draft.name || "Untitled Policy"}</p>
            <p className="text-xs text-[#68726d] mt-1">{draft.description || "No description provided."}</p>
          </div>

          {/* Scope */}
          <div className="rounded-[24px] border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold text-[#68726d] uppercase tracking-wide mb-2">Scope</p>
            <p className="text-sm text-foreground">
              {draft.scopeType === "company" ? "Entire Company" : "Specific scope"}
            </p>
            {draft.scopeType === "specific" && (
              <div className="mt-2 space-y-1 text-xs text-[#68726d]">
                {draft.categoryIds.length > 0 && <p>{draft.categoryIds.length} categor{draft.categoryIds.length === 1 ? "y" : "ies"} selected</p>}
                {draft.departmentIds.length > 0 && <p>{draft.departmentIds.length} department{draft.departmentIds.length === 1 ? "" : "s"} selected</p>}
                {draft.jobGradeIds.length > 0 && <p>{draft.jobGradeIds.length} job grade{draft.jobGradeIds.length === 1 ? "" : "s"} selected</p>}
                {draft.managementLevelIds.length > 0 && <p>{draft.managementLevelIds.length} management level{draft.managementLevelIds.length === 1 ? "" : "s"} selected</p>}
                {draft.vendorIds.length > 0 && <p>{draft.vendorIds.length} vendor{draft.vendorIds.length === 1 ? "" : "s"} selected</p>}
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="rounded-[24px] border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold text-[#68726d] uppercase tracking-wide mb-3">Enforcement Rules</p>
            {draft.rules.length === 0 ? (
              <p className="text-xs text-[#68726d]">No rules configured.</p>
            ) : (
              <div className="space-y-3">
                {draft.rules.map((r, i) => {
                  const cond = getConditionDef(r.condition);
                  const action = getActionDef(r.enforcementAction);
                  return (
                    <div key={r.id} className="flex gap-3 text-sm">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded h-fit mt-0.5 shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-foreground font-medium leading-snug">
                          {r.criteriaLabel || cond?.label || r.condition}
                        </p>
                        <p className="text-xs text-[#68726d] mt-0.5">
                          <span className="font-semibold">Then:</span>{" "}
                          <span className={cn(
                            "font-medium",
                            action?.severity === "hard" ? "text-destructive" : "text-blue-600"
                          )}>
                            {action?.label ?? r.enforcementAction}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Schedule & settings */}
          <div className="rounded-[24px] border border-black/[0.06] p-4">
            <p className="text-[10px] font-semibold text-[#68726d] uppercase tracking-wide mb-3">Settings</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-[#68726d]">Effective from</p>
                <p className="text-foreground font-medium">{formatDate(draft.effectiveAt)}</p>
              </div>
              <div>
                <p className="text-[#68726d]">Expires on</p>
                <p className="text-foreground font-medium">{formatDate(draft.expiresAt)}</p>
              </div>
              <div>
                <p className="text-[#68726d]">Priority</p>
                <p className="text-foreground font-medium">
                  {PRIORITY_OPTIONS.find((p) => p.value === draft.priority)?.label ?? draft.priority}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Adaptive Simulator ────────────────────────────────────── */}
        <div className="rounded-[24px] border-x-[2px] border-b-[2px] border-t-[4px] border-primary bg-white p-5 lg:sticky lg:top-4 shadow-sm">
          <p className="text-sm font-bold text-foreground mb-0.5">Policy Simulator</p>
          <p className="text-xs text-[#68726d] mb-4">
            Enter scenario values to preview how your rules will respond.
          </p>

          {draft.rules.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Info className="w-8 h-8 text-[#68726d] mb-2" strokeWidth={1.5} />
              <p className="text-xs text-[#68726d]">Add at least one rule to run a simulation.</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Amount */}
              {fields.needsAmount && (
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <div>
                    <label className="block text-[11px] text-[#68726d] mb-1">Amount</label>
                    <Input
                      type="number"
                      min={0}
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      className="h-10 rounded-[14px] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#68726d] mb-1">Currency</label>
                    <select
                      value={simCurrency}
                      onChange={(e) => setSimCurrency(e.target.value)}
                      className="h-10 w-full rounded-[14px] border border-black/[0.06] text-sm px-2 bg-white focus:outline-none focus:border-primary"
                    >
                      {["NGN", "USD", "GBP", "EUR", "KES", "GHS"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Vendor */}
              {fields.needsVendor && (
                <div>
                  <label className="block text-[11px] text-[#68726d] mb-1">
                    Select vendor
                    {allAllowedVendorIds.length > 0 && (
                      <span className="ml-1 text-[#68726d]">
                        ({allAllowedVendorIds.length} allowed in rules)
                      </span>
                    )}
                  </label>
                  <Select value={simVendorId || "none"} onValueChange={(v) => setSimVendorId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-[14px] text-sm">
                      <SelectValue placeholder="No vendor selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No vendor —</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.vendorId} value={v.vendorId}>
                          {v.displayName}
                          {allAllowedVendorIds.includes(v.vendorId) && " ✓"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role */}
              {fields.needsRole && (
                <div>
                  <label className="block text-[11px] text-[#68726d] mb-1">
                    Requester role
                    {allAllowedRoleIds.length > 0 && (
                      <span className="ml-1 text-[#68726d]">
                        ({allAllowedRoleIds.length} targeted in rules)
                      </span>
                    )}
                  </label>
                  <Select value={simRoleId || "none"} onValueChange={(v) => setSimRoleId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-10 rounded-[14px] text-sm">
                      <SelectValue placeholder="No role selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No role —</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.roleId} value={r.roleId}>
                          {r.name}
                          {allAllowedRoleIds.includes(r.roleId) && " ✓"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Contract */}
              {fields.needsContract && (
                <div className="flex items-center justify-between rounded-[14px] border border-black/[0.06] px-4 py-2.5">
                  <label className="text-xs font-medium text-foreground">Active contract exists</label>
                  <Switch checked={simHasContract} onCheckedChange={setSimHasContract} />
                </div>
              )}

              {/* Justification */}
              {fields.needsJustification && (
                <div className="flex items-center justify-between rounded-[14px] border border-black/[0.06] px-4 py-2.5">
                  <label className="text-xs font-medium text-foreground">Business justification provided</label>
                  <Switch checked={simHasJustification} onCheckedChange={setSimHasJustification} />
                </div>
              )}

              {/* Attachments */}
              {fields.needsAttachments && (
                <div className="flex items-center justify-between rounded-[14px] border border-black/[0.06] px-4 py-2.5">
                  <label className="text-xs font-medium text-foreground">Required documents attached</label>
                  <Switch checked={simHasAttachments} onCheckedChange={setSimHasAttachments} />
                </div>
              )}

              {/* Quotes */}
              {fields.needsQuotes && (
                <div>
                  <label className="block text-[11px] text-[#68726d] mb-1">Vendor quotes provided</label>
                  <Input
                    type="number"
                    min={0}
                    value={simQuotes}
                    onChange={(e) => setSimQuotes(e.target.value)}
                    className="h-10 rounded-[14px] text-sm"
                  />
                </div>
              )}

              {/* Accounting */}
              {fields.needsAccounting && (
                <div className="flex items-center justify-between rounded-[14px] border border-black/[0.06] px-4 py-2.5">
                  <label className="text-xs font-medium text-foreground">Accounting / budget resolved</label>
                  <Switch checked={simAccountingOk} onCheckedChange={setSimAccountingOk} />
                </div>
              )}

              {/* PR count */}
              {fields.needsPrCount && (
                <div>
                  <label className="block text-[11px] text-[#68726d] mb-1">PRs submitted this period</label>
                  <Input
                    type="number"
                    min={0}
                    value={simPrCount}
                    onChange={(e) => setSimPrCount(e.target.value)}
                    className="h-10 rounded-[14px] text-sm"
                  />
                </div>
              )}

              {/* PR paused */}
              {fields.needsPrPause && (
                <div className="flex items-center justify-between rounded-[14px] border border-black/[0.06] px-4 py-2.5">
                  <label className="text-xs font-medium text-foreground">PR creation currently paused</label>
                  <Switch checked={simPrPaused} onCheckedChange={setSimPrPaused} />
                </div>
              )}

              <Button onClick={runSim} className="w-full h-11 rounded-[14px]">
                <PlayCircle className="w-4 h-4 mr-1.5" /> Run Simulation
              </Button>

              {/* Results */}
              {results && (
                <div className={cn(
                  "rounded-[14px] border p-4 space-y-3",
                  hardBlocked
                    ? "border-destructive/30 bg-destructive/5"
                    : anyTriggered
                    ? "border-amber-300/50 bg-amber-50/60"
                    : "border-success/30 bg-success/5"
                )}>
                  {/* Overall outcome */}
                  <div className="flex items-center gap-2">
                    {hardBlocked ? (
                      <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
                    ) : anyTriggered ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                    )}
                    <p className="text-sm font-bold text-foreground">
                      {hardBlocked
                        ? "Transaction would be BLOCKED"
                        : anyTriggered
                        ? `${triggeredResults.length} rule${triggeredResults.length > 1 ? "s" : ""} triggered`
                        : "No rules triggered — transaction proceeds"}
                    </p>
                  </div>

                  {/* Per-rule results */}
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <div key={r.rule.id} className={cn(
                        "flex gap-2.5 text-xs rounded-[12px] px-3 py-2",
                        r.triggered ? "bg-white border border-destructive/20" : "bg-white border border-black/[0.06]"
                      )}>
                        {r.triggered ? (
                          <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold text-foreground">Rule {i + 1}:</span>{" "}
                          <span className="text-[#68726d]">{r.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hardBlocked && (
                    <div className="flex items-start gap-2 rounded-[12px] bg-destructive/10 px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[11px] text-destructive font-medium">
                        One or more hard blocks are active. This transaction would be stopped from proceeding.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
