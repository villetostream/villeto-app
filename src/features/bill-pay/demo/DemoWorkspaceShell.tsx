"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  RotateCcw,
  Trash2,
  History,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import { AddBillModal } from "./DemoStandardBillsTab";
import { DemoCentralAuditLogModal } from "./DemoCentralAuditLogModal";
import { DEMO_ROLES } from "./demo-data";

export type DemoPageKey =
  | "bills"
  | "recurring"
  | "intake"
  | "payments"
  | "company_expenses"
  | "reconciliation"
  | "vendors";

interface DemoWorkspaceShellProps {
  activePage: DemoPageKey;
  isDetailView?: boolean;
  detailTitle?: string;
  onBackFromDetail?: () => void;
  onSelectBillTab?: (tab: "standard" | "recurring") => void;
  children: ReactNode;
}

export function DemoWorkspaceShell({
  activePage,
  isDetailView = false,
  detailTitle,
  onBackFromDetail: _onBackFromDetail,
  onSelectBillTab,
  children,
}: DemoWorkspaceShellProps) {
  const router = useRouter();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const {
    isEmptyMode,
    resetDemo,
    clearToZero,
    auditLogs = [],
    currentDemoRole = "FINANCE_CONTROLLER",
    setCurrentDemoRole,
  } = useBillPayDemoStore();

  const PAGE_LABELS: Record<DemoPageKey, string> = {
    bills: "Standard Bills (AP)",
    recurring: "Recurring & Contracts",
    company_expenses: "Company Expenses (Cards)",
    payments: "Payments Queue",
    reconciliation: "Bank Reconciliation",
    intake: "Intake & Supplier Portal",
    vendors: "Vendors & Governance",
  };

  function handleLoadSampleData() {
    resetDemo();
    toast.success("Sample bills, recurring schedules, and cards loaded");
  }

  function handleClearToZero() {
    clearToZero();
    toast.info("Cleared to empty state — create records from scratch anytime");
  }

  function handleNavigate(page: DemoPageKey) {
    if (page === "bills") {
      if (onSelectBillTab) onSelectBillTab("standard");
      router.push("/bill-pay/demo?tab=standard");
    } else if (page === "recurring") {
      if (onSelectBillTab) onSelectBillTab("recurring");
      router.push("/bill-pay/demo?tab=recurring");
    } else if (page === "intake") {
      router.push("/bill-pay/demo/intake");
    } else if (page === "reconciliation") {
      router.push("/bill-pay/demo/payments?tab=reconciliation");
    } else if (page === "payments") {
      router.push("/bill-pay/demo/payments");
    } else if (page === "company_expenses") {
      router.push("/bill-pay/demo/company-expenses");
    } else if (page === "vendors") {
      router.push("/bill-pay/demo/vendors");
    }
  }

  return (
    <div className="w-full pb-12 space-y-5">
      {/* ── Top Ribbon (Full Width) - only shown in list views, hidden in full-page detail view ── */}
      {!isDetailView && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-black/[0.06] shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-[#68726d] flex-wrap">
            <span className="font-semibold text-gray-900">Bill Pay</span>
            <span>&rsaquo;</span>
            <span className="text-[#087f70] font-semibold">
              {PAGE_LABELS[activePage] || "Architecture Demo"}
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Persona Role Switcher - Compact single-line enterprise pill */}
            <div className="flex items-center gap-1.5 px-2.5 h-8.5 rounded-xl border border-black/[0.08] bg-white text-xs font-semibold text-[#10231d]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#087f70] shrink-0" />
              <span className="text-[#68726d] font-normal text-xs">Role:</span>
              <Select
                value={currentDemoRole}
                onValueChange={(val) => {
                  setCurrentDemoRole(val);
                  const role = DEMO_ROLES.find((r) => r.roleKey === val);
                  if (role) {
                    toast.info(`Acting as: ${role.name}`, {
                      description: `${role.title} · ${role.description}`,
                    });
                  }
                }}
              >
                <SelectTrigger className="h-auto p-0 border-none bg-transparent shadow-none text-xs font-bold text-[#10231d] focus:ring-0 gap-1 inline-flex items-center">
                  <SelectValue>
                    {DEMO_ROLES.find((r) => r.roleKey === currentDemoRole)?.name || "Chidi Okafor"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs max-w-sm">
                  {DEMO_ROLES.map((role) => (
                    <SelectItem key={role.roleKey} value={role.roleKey} className="text-xs py-2">
                      <div className="flex flex-col gap-0.5 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#10231d]">{role.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-medium">
                            {role.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#68726d]">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Central Audit Trail Modal Trigger */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAuditModal(true)}
              className="h-8.5 px-3 rounded-xl border-black/[0.08] bg-white hover:bg-gray-50 text-xs font-semibold text-[#10231d] gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[#087f70]" />
              <span>Audit Log</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#087f70]/10 text-[#087f70]">
                {auditLogs.length}
              </span>
            </Button>

            <div className="h-4 w-px bg-gray-200 hidden md:block" />

            <button
              type="button"
              onClick={handleLoadSampleData}
              title="Reset with sample bills and card expenses"
              className={`inline-flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                !isEmptyMode
                  ? "bg-[#f0faf8] text-[#087f70] border-[#c8ece4]"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-black/[0.08]"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Preset Data
            </button>

            <button
              type="button"
              onClick={handleClearToZero}
              title="Clear all records to start empty"
              className={`inline-flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                isEmptyMode
                  ? "bg-gray-100 text-gray-900 font-bold border-gray-300"
                  : "bg-white text-gray-500 hover:bg-gray-50 border-black/[0.08]"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Start Empty
            </button>

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8.5 rounded-xl border border-black/[0.08] bg-white hover:bg-[#f0faf8] hover:border-[#087f70]/40 text-xs font-semibold text-[#10231d] transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#087f70]" /> Architecture Guide
            </button>

            <Button
              type="button"
              onClick={() => setShowAddBillModal(true)}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add a Vendor Bill
            </Button>
          </div>
        </div>
      )}

      {/* ── Content Body (Full Width) ── */}
      <main className="w-full min-w-0 space-y-5">
        {children}
      </main>

      {/* ── Add Bill Modal ── */}
      <AddBillModal
        open={showAddBillModal}
        onOpenChange={setShowAddBillModal}
        onCreated={() => handleNavigate("bills")}
        onOpenRecurring={() => handleNavigate("recurring")}
        onOpenVendorPortal={() => handleNavigate("intake")}
      />

      {/* ── Architecture Guide Modal (Non-intrusive) ── */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="sm:max-w-3xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-[#10231d]">
              Spend Management &amp; AP Architecture Guide
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              How top enterprise ERPs (Ramp, Brex, BILL, Oracle NetSuite) decouple business workflows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-[#f0faf8] border border-[#c8ece4] text-[#065f55] space-y-1">
              <p className="font-bold">Core Architectural Principle:</p>
              <p className="leading-relaxed">
                <strong>Never treat every corporate payment as an unpaid bill.</strong> Forcing corporate
                card subscriptions and employee swipes into the accounts payable invoice queue creates
                phantom liability and breaks bank reconciliation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Card 1 */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                  1. Recurring Schedule
                </p>
                <p className="font-bold text-[#10231d]">What do we expect regularly?</p>
                <p className="text-[11px] text-[#68726d] leading-relaxed">
                  Templates for repeating obligations (rent, internet, retainers). Evaluates variance
                  tolerances (&plusmn;10%) and generates individual bills without overwriting history.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                  2. Accounts Payable Bill
                </p>
                <p className="font-bold text-[#10231d]">What do we owe a supplier?</p>
                <p className="text-[11px] text-[#68726d] leading-relaxed">
                  Legal obligation to pay. Undergoes 2-way or 3-way matching against Purchase Orders and
                  Warehouse Goods Receipt Notes (GRN) before dual approval.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-3.5 rounded-xl bg-[#f0faf8] border border-[#c8ece4] space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                  3. Corporate Card Swipes
                </p>
                <p className="font-bold text-[#10231d]">What hit a company card?</p>
                <p className="text-[11px] text-[#065f55] leading-relaxed">
                  Transactions appear directly in <strong>Company Expenses</strong> as Pending,
                  evaluated against expense policies (receipt rules, limits). They do NOT create fake AP bills.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                  4. Payment &amp; Reconciliation
                </p>
                <p className="font-bold text-[#10231d]">What cash actually moved?</p>
                <p className="text-[11px] text-[#68726d] leading-relaxed">
                  Decoupled payment batches with Dual Control, NIBSS central switch confirmation, and
                  2-stage GL entries (DR AP &rarr; CR Cash in Transit &rarr; CR Bank).
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Central Audit Log Modal ── */}
      <DemoCentralAuditLogModal
        open={showAuditModal}
        onOpenChange={setShowAuditModal}
      />
    </div>
  );
}
