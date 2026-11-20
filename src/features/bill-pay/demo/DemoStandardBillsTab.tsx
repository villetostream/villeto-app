"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { Receipt2 } from "iconsax-reactjs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DemoMatchingValidationEngine } from "./DemoMatchingValidationEngine";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { type DemoBill } from "./demo-data";
import { formatNgn } from "./demo-utils";

function formatShortDate(dateStr: string) {
  try {
    return format(parseISO(dateStr.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function resolveHumanBillStatus(bill: DemoBill): { status: string; label: string } {
  if (bill.approvalStatus === "DRAFT") {
    return { status: "pending", label: "Draft (Unposted)" };
  }
  if (bill.approvalStatus === "CORRECTION_REQUESTED") {
    return { status: "rejected", label: "Correction Requested" };
  }
  if (bill.approvalStatus === "REJECTED") {
    return { status: "rejected", label: "Rejected" };
  }
  if (bill.isOverdue || (bill.dueDate && new Date(bill.dueDate) < new Date() && bill.outstandingAmount > 0)) {
    return { status: "rejected", label: "Overdue" };
  }
  if (bill.duplicateWarning && bill.matchingStatus === "EXCEPTION_HOLD") {
    return { status: "rejected", label: "Duplicate Flagged" };
  }
  if (bill.matchingStatus === "EXCEPTION_HOLD" && bill.poReference) {
    return { status: "rejected", label: "PO Match Issue" };
  }
  if (bill.matchingStatus === "EXCEPTION_HOLD") {
    return { status: "pending", label: "Price Variance Hold" };
  }
  if (bill.approvalStatus === "PENDING_APPROVAL") {
    return { status: "pending", label: "Awaiting Approval" };
  }
  if (bill.paymentStatus === "AWAITING_RELEASE") {
    return { status: "issued", label: "Approved · Awaiting Release" };
  }
  if (bill.paymentStatus === "AWAITING_CONFIRMATION") {
    return { status: "issued", label: "Bank Confirming" };
  }
  if (bill.paymentStatus === "FAILED") {
    return { status: "rejected", label: "Payment Failed" };
  }
  if (bill.paymentStatus === "PARTIALLY_PAID") {
    return { status: "pending", label: "Partially Paid" };
  }
  if (bill.paymentStatus === "PAID") {
    return {
      status: "paid",
      label: bill.reconciliationStatus === "RECONCILED" ? "Paid & Reconciled" : "Paid",
    };
  }
  return { status: "ready_for_delivery", label: "Ready to Pay" };
}

function getBillTypeMeta(bill: DemoBill): {
  key: "standard_non_po" | "po_backed" | "no_invoice_voucher" | "recurring";
  label: string;
  pillClass: string;
} {
  if (bill.supportType === "no_invoice_voucher" || bill.invoiceAttached === false) {
    return {
      key: "no_invoice_voucher",
      label: "No Invoice · Voucher",
      pillClass: "bg-[#f5f3ff] text-[#6d28d9]",
    };
  }
  if (bill.recurringScheduleId || bill.source === "recurring_schedule") {
    return {
      key: "recurring",
      label: "Recurring Cycle",
      pillClass: "bg-[#fef3c7] text-[#92400e]",
    };
  }
  if (bill.supportType === "po_backed") {
    return {
      key: "po_backed",
      label: "PO-Backed (3-Way)",
      pillClass: "bg-[#f0f9ff] text-[#0369a1]",
    };
  }
  return {
    key: "standard_non_po",
    label: "Standard · Non-PO",
    pillClass: "bg-[#f0faf8] text-[#087f70]",
  };
}

function getShortChannelLabel(bill: DemoBill): string {
  if (bill.sourceChannelLabel) return bill.sourceChannelLabel;
  switch (bill.source) {
    case "vendor_portal":
      return "Vendor Portal";
    case "whatsapp":
      return "WhatsApp Bot";
    case "email_ocr":
      return "Email Inbox (ap@villeto.ng)";
    case "pdf_upload":
      return "PDF Upload";
    case "manual":
      return "Manual Entry";
    case "recurring_schedule":
      return "Recurring Contract";
  }
}

export function AddBillModal({
  open,
  onOpenChange,
  onCreated,
  onOpenRecurring,
  onOpenVendorPortal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (billId: string) => void;
  onOpenRecurring?: () => void;
  onOpenVendorPortal?: () => void;
}) {
  const router = useRouter();
  const { vendors, intakeBillFromOcr } = useBillPayDemoStore();

  const [billCategory, setBillCategory] = useState<
    "standard_invoice" | "no_invoice_voucher"
  >("standard_invoice");
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("upload");

  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [voucherRef, setVoucherRef] = useState("");
  const [voucherType, setVoucherType] = useState<
    "statutory_fee" | "contract_lease" | "advance_deposit" | "payment_voucher"
  >("statutory_fee");
  const [amount, setAmount] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [glAccount, setGlAccount] = useState("");
  const [hasPo, setHasPo] = useState<"no" | "yes">("no");
  const [poNumber, setPoNumber] = useState("");
  const [voucherNotes, setVoucherNotes] = useState("");

  function handlePrefill() {
    if (billCategory === "standard_invoice") {
      setVendorId(vendors[0]?.id || "vnd_ekedc");
      setInvoiceNumber("ELEC-2026-1244");
      setAmount("450000");
      setDepartment("Administration");
      setCategory("Utilities");
      setGlAccount("6100 · Electricity Expense");
      setHasPo("no");
      setPoNumber("");
    } else {
      const lawma = vendors.find((v) => v.id === "vnd_lawma");
      setVendorId(lawma?.id || vendors[0]?.id || "vnd_lawma");
      setVoucherRef("PV-2026-081");
      setVoucherType("statutory_fee");
      setAmount("85000");
      setDepartment("Administration");
      setCategory("Government & Regulatory");
      setGlAccount("6410 · Statutory & Regulatory Levies");
      setVoucherNotes(
        "Approved statutory payment obligation under payment voucher policy",
      );
    }
    toast.info("Sample details prefilled into form");
  }

  function handleSubmit() {
    const num = Number(amount);
    const isNoInvoice = billCategory === "no_invoice_voucher";
    const ref = isNoInvoice ? voucherRef.trim() : invoiceNumber.trim();
    if (!ref || Number.isNaN(num) || num <= 0) {
      toast.error(
        `Please enter a valid ${isNoInvoice ? "voucher reference" : "invoice number"} and amount.`,
      );
      return;
    }

    const res = intakeBillFromOcr({
      vendorId: vendorId || vendors[0]?.id || "vnd_generic",
      invoiceNumber: ref,
      amount: num,
      department: department || "General",
      category: category || "Operating Expense",
      glAccount: glAccount || "6000 · General Expense",
      dueDate: "2026-11-30",
      source: "manual",
      sourceChannelLabel: isNoInvoice
        ? `Payment Voucher (${voucherType.replace(/_/g, " ")})`
        : entryMode === "upload"
        ? "PDF Upload"
        : "Manual Entry",
      supportType: isNoInvoice ? "no_invoice_voucher" : hasPo === "yes" ? "po_backed" : "non_po",
      invoiceAttached: !isNoInvoice,
      voucherType: isNoInvoice ? voucherType : undefined,
      voucherReference: isNoInvoice ? ref : undefined,
      poNumber: !isNoInvoice && hasPo === "yes" ? poNumber : undefined,
    });

    if (res.duplicate) {
      toast.warning(res.message);
    } else if (res.ok) {
      toast.success(res.message);
    }
    onOpenChange(false);
    if (res.billId && onCreated) onCreated(res.billId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header with 1-click Prefill Sample Details */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="space-y-1">
            <DialogTitle className="text-base font-bold text-[#10231d]">
              Add a Payment Obligation / Bill
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d] leading-relaxed">
              Record an offline supplier invoice or create an approved non-invoiced payment voucher.
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={handlePrefill}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#c8ece4] bg-[#f0faf8] hover:bg-[#e2f5f1] text-[#087f70] text-xs font-semibold shrink-0 transition-colors shadow-2xs"
            title="Populate realistic demo values with 1 click"
          >
            <Sparkles className="w-3.5 h-3.5" /> Prefill Sample Details
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Does this bill have a supplier invoice attached? */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[#087f70]">
              1. Invoice Documentation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setBillCategory("standard_invoice")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  billCategory === "standard_invoice"
                    ? "border-[#087f70] bg-[#f0faf8] ring-1 ring-[#087f70]"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#10231d]">
                  <FileText className="w-4 h-4 text-[#087f70]" /> Supplier Invoice Attached
                </div>
                <p className="text-[11px] text-[#68726d] mt-1">
                  You have a paper or PDF invoice document from the vendor.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setBillCategory("no_invoice_voucher")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  billCategory === "no_invoice_voucher"
                    ? "border-[#087f70] bg-[#f0faf8] ring-1 ring-[#087f70]"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#10231d]">
                  <ShieldCheck className="w-4 h-4 text-[#087f70]" /> No Invoice Attached (Voucher)
                </div>
                <p className="text-[11px] text-[#68726d] mt-1">
                  Contractual lease, statutory levy, advance deposit, or payment voucher.
                </p>
              </button>
            </div>
          </div>

          {billCategory === "standard_invoice" ? (
            <div className="space-y-3.5 py-1">
              {/* Input Method */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEntryMode("upload")}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    entryMode === "upload"
                      ? "border-[#087f70] bg-[#f0faf8] text-[#10231d] font-bold"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-[#087f70]" />
                  <span className="text-xs">Upload Invoice (OCR Scan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMode("manual")}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    entryMode === "manual"
                      ? "border-[#087f70] bg-[#f0faf8] text-[#10231d] font-bold"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#087f70]" />
                  <span className="text-xs">Type Invoice Manually</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Vendor / Supplier</label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select vendor / supplier" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Supplier Invoice #</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. ELEC-2026-1244"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Total Amount (NGN)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Department</label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select department" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Administration" className="text-xs">Administration</SelectItem>
                      <SelectItem value="Engineering" className="text-xs">Engineering</SelectItem>
                      <SelectItem value="Operations" className="text-xs">Operations</SelectItem>
                      <SelectItem value="Marketing" className="text-xs">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Expense Category</label>
                  <Select
                    value={category}
                    onValueChange={(v) => {
                      setCategory(v);
                      if (v === "Utilities") setGlAccount("6100 · Electricity Expense");
                      if (v === "IT Equipment") setGlAccount("1520 · Computer Hardware");
                      if (v === "Internet & Telecom") setGlAccount("6210 · Bandwidth & Fiber");
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select expense category" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Utilities" className="text-xs">Utilities</SelectItem>
                      <SelectItem value="IT Equipment" className="text-xs">IT Equipment</SelectItem>
                      <SelectItem value="Internet & Telecom" className="text-xs">Internet &amp; Telecom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">
                    Linked to a Purchase Order?
                  </label>
                  <Select value={hasPo} onValueChange={(v) => setHasPo(v as "yes" | "no")}>
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="no" className="text-xs">
                        No — Direct Standard Bill (Non-PO)
                      </SelectItem>
                      <SelectItem value="yes" className="text-xs">
                        Yes — PO-Backed (3-Way Match)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasPo === "yes" && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-700">Purchase Order Number</label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-2026-991"
                      className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Non-Invoiced Payment Obligation (Payment Voucher) */
            <div className="space-y-3.5 py-1">
              <div className="p-3 rounded-xl bg-[#f5f3ff] border border-purple-200/70 text-xs text-purple-950">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" /> Authorized Non-Invoiced Processing
                </p>
                <p className="text-[11px] text-purple-900 mt-0.5">
                  Processed under organization Payment Voucher rules without a supplier invoice.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Obligation Type</label>
                  <Select
                    value={voucherType}
                    onValueChange={(v) => setVoucherType(v as typeof voucherType)}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select obligation type" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-w-sm">
                      <SelectItem value="statutory_fee" className="text-xs">
                        Statutory Levy / Taxes
                      </SelectItem>
                      <SelectItem value="contract_lease" className="text-xs">
                        Contractual Lease / Rent
                      </SelectItem>
                      <SelectItem value="advance_deposit" className="text-xs">
                        Supplier Advance Deposit
                      </SelectItem>
                      <SelectItem value="payment_voucher" className="text-xs">
                        Internal Payment Voucher
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Payee / Beneficiary</label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select payee" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-w-sm">
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          <span className="truncate">{v.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">
                    Voucher / Contract Reference
                  </label>
                  <input
                    type="text"
                    value={voucherRef}
                    onChange={(e) => setVoucherRef(e.target.value)}
                    placeholder="e.g. PV-2026-081"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Payment Amount (NGN)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Department</label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="h-9 rounded-xl text-xs w-full min-w-0 overflow-hidden">
                      <span className="truncate text-left block flex-1">
                        <SelectValue placeholder="Select department" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Administration" className="text-xs">Administration</SelectItem>
                      <SelectItem value="Operations" className="text-xs">Operations</SelectItem>
                      <SelectItem value="Finance" className="text-xs">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-gray-700">Expense GL Account</label>
                  <input
                    type="text"
                    value={glAccount}
                    onChange={(e) => setGlAccount(e.target.value)}
                    placeholder="e.g. 6410 · Statutory Levies"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-700">
                    Authorization Justification / Note
                  </label>
                  <input
                    type="text"
                    value={voucherNotes}
                    onChange={(e) => setVoucherNotes(e.target.value)}
                    placeholder="e.g. Assessment Notice Ref or Signed Lease Clause 4.2"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Helpful Footnote Linking Out to Automated Flows */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#68726d]">
            <span>
              Repeating lease or utility?{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  if (onOpenRecurring) onOpenRecurring();
                  else router.push("/bill-pay/demo?tab=recurring");
                }}
                className="text-[#087f70] font-semibold hover:underline"
              >
                Set up Recurring Schedule &rarr;
              </button>
            </span>
            <span>
              Testing supplier portal submission?{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  if (onOpenVendorPortal) onOpenVendorPortal();
                  else router.push("/bill-pay/demo/intake");
                }}
                className="text-[#087f70] font-semibold hover:underline"
              >
                Open Intake &amp; Vendor Portal &rarr;
              </button>
            </span>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/70 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-5 shadow-xs"
          >
            {billCategory === "no_invoice_voucher"
              ? "Create Payment Voucher"
              : "Create Standard Bill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DemoStandardBillsTab({
  onLoadSampleData,
  selectedBillId: externalSelectedBillId,
  onSelectBillId: externalOnSelectBillId,
}: {
  onLoadSampleData?: () => void;
  selectedBillId?: string | null;
  onSelectBillId?: (id: string | null) => void;
}) {
  const {
    bills,
    vendors,
    vendorCredits,
    approveBill,
    rejectBill,
    submitBillForApproval,
    approveBillStep,
    requestBillCorrection,
    createVendorCredit,
    applyVendorCredit,
    recordExternalPayment,
    applyVendorCreditNote,
    initiateBillPayment,
  } = useBillPayDemoStore();

  const [filter, setFilter] = useState<
    "all" | "drafts" | "pending" | "exceptions" | "payable" | "overdue" | "paid"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "standard_non_po" | "po_backed" | "no_invoice_voucher" | "recurring"
  >("all");
  const [channelFilter, setChannelFilter] = useState<
    "all" | DemoBill["source"]
  >("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;
  const [internalSelectedBillId, setInternalSelectedBillId] = useState<string | null>(null);

  const selectedBillId =
    externalSelectedBillId !== undefined
      ? externalSelectedBillId
      : internalSelectedBillId;

  const setSelectedBillId = useCallback((id: string | null) => {
    if (externalOnSelectBillId) externalOnSelectBillId(id);
    setInternalSelectedBillId(id);
  }, [externalOnSelectBillId]);

  const [showAddBill, setShowAddBill] = useState(false);

  // Payment Modal State
  const [payBillTarget, setPayBillTarget] = useState<DemoBill | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<
    "complete" | "awaiting_webhook" | "simulate_failure"
  >("complete");

  // Correction Request Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReasonInput, setCorrectionReasonInput] = useState("");

  // Vendor Credit Note Modal State
  const [showApplyCreditModal, setShowApplyCreditModal] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState("");
  const [applyCreditAmount, setApplyCreditAmount] = useState("");

  // Create Credit Note Modal State
  const [showNewCreditModal, setShowNewCreditModal] = useState(false);
  const [newCreditNumber, setNewCreditNumber] = useState("");
  const [newCreditAmount, setNewCreditAmount] = useState("");
  const [newCreditReason, setNewCreditReason] = useState("");

  // External Payment Modal State
  const [showExternalPaymentModal, setShowExternalPaymentModal] = useState(false);
  const [externalPaymentMethod, setExternalPaymentMethod] = useState("Direct Bank Wire");
  const [externalRef, setExternalRef] = useState("");
  const [externalAmount, setExternalAmount] = useState("");
  const [externalProofName, setExternalProofName] = useState("");
  const [externalNotes, setExternalNotes] = useState("");

  // Filter counts
  const filterCounts = useMemo(() => {
    return {
      all: bills.length,
      drafts: bills.filter((b) => b.approvalStatus === "DRAFT").length,
      pending: bills.filter(
        (b) =>
          b.approvalStatus === "PENDING_APPROVAL" ||
          b.approvalStatus === "CORRECTION_REQUESTED",
      ).length,
      exceptions: bills.filter((b) => b.matchingStatus === "EXCEPTION_HOLD").length,
      payable: bills.filter(
        (b) => b.approvalStatus === "APPROVED" && b.outstandingAmount > 0,
      ).length,
      overdue: bills.filter(
        (b) =>
          b.isOverdue ||
          (b.dueDate && new Date(b.dueDate) < new Date() && b.outstandingAmount > 0),
      ).length,
      paid: bills.filter((b) => b.paymentStatus === "PAID").length,
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (filter === "drafts" && bill.approvalStatus !== "DRAFT") return false;
      if (
        filter === "pending" &&
        bill.approvalStatus !== "PENDING_APPROVAL" &&
        bill.approvalStatus !== "CORRECTION_REQUESTED"
      )
        return false;
      if (filter === "exceptions" && bill.matchingStatus !== "EXCEPTION_HOLD")
        return false;
      if (
        filter === "payable" &&
        !(bill.approvalStatus === "APPROVED" && bill.outstandingAmount > 0)
      )
        return false;
      if (
        filter === "overdue" &&
        !bill.isOverdue &&
        !(bill.dueDate && new Date(bill.dueDate) < new Date() && bill.outstandingAmount > 0)
      )
        return false;
      if (filter === "paid" && bill.paymentStatus !== "PAID") return false;

      if (typeFilter !== "all" && getBillTypeMeta(bill).key !== typeFilter) {
        return false;
      }
      if (channelFilter !== "all" && bill.source !== channelFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          bill.billNumber.toLowerCase().includes(q) ||
          bill.invoiceNumber.toLowerCase().includes(q) ||
          bill.vendorName.toLowerCase().includes(q) ||
          getShortChannelLabel(bill).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bills, filter, typeFilter, channelFilter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, typeFilter, channelFilter, search]);

  const totalPages = Math.ceil(filteredBills.length / PAGE_SIZE) || 1;
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, currentPage]);

  const selectedBill = bills.find((b) => b.id === selectedBillId) || null;

  useEffect(() => {
    if (selectedBillId) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedBillId(null);
      }, "All Bills");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [selectedBillId, setSelectedBillId]);

  function handleExecutePayment() {
    if (!payBillTarget) return;
    const amt = Number(payAmount);
    const res = initiateBillPayment({
      billId: payBillTarget.id,
      amount: amt,
      fundingAccount: "Zenith Operating NGN · *8821",
      mode: payMode,
    });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    if (payMode === "simulate_failure") {
      toast.error("Transfer rejected by receiving bank — bill balance kept open for retry");
    } else if (payMode === "awaiting_webhook") {
      toast.warning("Transfer initiated — awaiting bank confirmation before marking Paid");
    } else {
      toast.success("Payment completed and ledger updated");
    }
    setPayBillTarget(null);
  }

  // ── Modal Render Helpers ──────────────────────────────────────────────────────
  const renderCorrectionModal = () => (
    <Dialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Request Bill Correction
          </DialogTitle>
          <DialogDescription className="text-xs text-[#68726d]">
            Return this bill to the invoice submitter with specific revision notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Revision Reason / Instructions
            </label>
            <textarea
              rows={3}
              value={correctionReasonInput}
              onChange={(e) => setCorrectionReasonInput(e.target.value)}
              placeholder="e.g. Please verify WHT rate or attach signed proof of delivery note"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#087f70]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCorrectionModal(false)}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!selectedBill) return;
              if (!correctionReasonInput.trim()) {
                toast.error("Please provide instructions for the revision.");
                return;
              }
              const res = requestBillCorrection(
                selectedBill.id,
                correctionReasonInput.trim(),
                "Financial Reviewer",
              );
              if (res.ok) {
                toast.warning(res.message);
                setShowCorrectionModal(false);
                setCorrectionReasonInput("");
              } else {
                toast.error(res.message);
              }
            }}
            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
          >
            Send Revision Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderApplyCreditModal = () => {
    if (!selectedBill) return null;
    const availableVendorCredits = vendorCredits.filter(
      (c) =>
        c.vendorId === selectedBill.vendorId &&
        c.status !== "FULLY_EXHAUSTED" &&
        c.remainingBalance > 0,
    );
    const chosenCredit =
      availableVendorCredits.find((c) => c.id === selectedCreditId) ||
      availableVendorCredits[0];

    return (
      <Dialog open={showApplyCreditModal} onOpenChange={setShowApplyCreditModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#087f70]" />
              Apply Vendor Credit Note
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Offset invoice balance with verified credit memos from {selectedBill.vendorName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Choose Available Credit Note
              </label>
              <Select
                value={selectedCreditId || chosenCredit?.id || ""}
                onValueChange={(val) => {
                  setSelectedCreditId(val);
                  const cr = availableVendorCredits.find((c) => c.id === val);
                  if (cr) {
                    setApplyCreditAmount(
                      String(Math.min(cr.remainingBalance, selectedBill.outstandingAmount)),
                    );
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                  <SelectValue placeholder="Select credit note" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableVendorCredits.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.creditNoteNumber} · Available: {formatNgn(c.remainingBalance)} ({c.reason})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Amount to Apply (₦)</label>
              <input
                type="number"
                max={
                  chosenCredit
                    ? Math.min(chosenCredit.remainingBalance, selectedBill.outstandingAmount)
                    : 0
                }
                value={applyCreditAmount}
                onChange={(e) => setApplyCreditAmount(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
              />
              <p className="text-[11px] text-[#68726d]">
                Current bill balance: <strong>{formatNgn(selectedBill.outstandingAmount)}</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApplyCreditModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const creditToUse = selectedCreditId || chosenCredit?.id;
                const amt = Number(applyCreditAmount);
                if (!creditToUse || amt <= 0) {
                  toast.error("Please specify a valid credit amount.");
                  return;
                }
                const res = applyVendorCredit(creditToUse, selectedBill.id, amt);
                if (res.ok) {
                  toast.success(res.message);
                  setShowApplyCreditModal(false);
                } else {
                  toast.error(res.message);
                }
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Apply to Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderNewCreditModal = () => {
    if (!selectedBill) return null;
    return (
      <Dialog open={showNewCreditModal} onOpenChange={setShowNewCreditModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#087f70]" />
              Issue Vendor Credit Note
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Record a credit memorandum issued by {selectedBill.vendorName} for damaged goods, price variance, or rebate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Credit Note Number</label>
              <input
                type="text"
                value={newCreditNumber}
                onChange={(e) => setNewCreditNumber(e.target.value)}
                placeholder="e.g. CN-2026-081"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Credit Amount (₦)</label>
              <input
                type="number"
                value={newCreditAmount}
                onChange={(e) => setNewCreditAmount(e.target.value)}
                placeholder="50000"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Reason / Description</label>
              <input
                type="text"
                value={newCreditReason}
                onChange={(e) => setNewCreditReason(e.target.value)}
                placeholder="e.g. Defective hardware return / billing discount"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewCreditModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const amt = Number(newCreditAmount);
                if (!newCreditNumber.trim() || amt <= 0) {
                  toast.error("Please enter a valid credit note number and positive amount.");
                  return;
                }
                const res = createVendorCredit({
                  vendorId: selectedBill.vendorId,
                  creditNoteNumber: newCreditNumber.trim(),
                  amount: amt,
                  reason: newCreditReason.trim() || "Vendor commercial adjustment",
                });
                if (res.ok) {
                  toast.success(res.message);
                  setShowNewCreditModal(false);
                  setApplyCreditAmount(String(Math.min(amt, selectedBill.outstandingAmount)));
                  setShowApplyCreditModal(true);
                } else {
                  toast.error(res.message);
                }
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Create Credit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderExternalPaymentModal = () => {
    if (!selectedBill) return null;
    return (
      <Dialog open={showExternalPaymentModal} onOpenChange={setShowExternalPaymentModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#087f70]" />
              Record External Settlement
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Record off-platform payment (direct bank portal wire, corporate cheque, or cash voucher) and close AP liability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Payment Method</label>
              <Select
                value={externalPaymentMethod}
                onValueChange={setExternalPaymentMethod}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Direct Bank Wire" className="text-xs">
                    Direct Bank Wire (Internet Banking Portal)
                  </SelectItem>
                  <SelectItem value="Corporate Bank Cheque" className="text-xs">
                    Corporate Bank Cheque
                  </SelectItem>
                  <SelectItem value="Petty Cash Voucher" className="text-xs">
                    Corporate Cash Voucher
                  </SelectItem>
                  <SelectItem value="POS Terminal" className="text-xs">
                    POS / Debit Card Terminal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Amount Paid (₦)</label>
              <input
                type="number"
                max={selectedBill.outstandingAmount}
                value={externalAmount}
                onChange={(e) => setExternalAmount(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                External Bank Reference / Slip #
              </label>
              <input
                type="text"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="e.g. CBN-NIBSS-TRX-829103"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Proof of Payment Document (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={externalProofName}
                  onChange={(e) => setExternalProofName(e.target.value)}
                  placeholder="e.g. providus_wire_receipt_84920.pdf"
                  className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setExternalProofName("zenith_wire_receipt_84920.pdf")}
                  className="rounded-xl text-xs h-9"
                >
                  Attach Mock Slip
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Auditor Notes</label>
              <input
                type="text"
                value={externalNotes}
                onChange={(e) => setExternalNotes(e.target.value)}
                placeholder="e.g. Paid via CFO corporate token outside Villeto"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExternalPaymentModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const amt = Number(externalAmount);
                if (amt <= 0 || !externalRef.trim()) {
                  toast.error("Please enter a valid amount and external reference.");
                  return;
                }
                const res = recordExternalPayment({
                  billId: selectedBill.id,
                  amount: amt,
                  paymentDate: new Date().toISOString().slice(0, 10),
                  reference: externalRef.trim(),
                  proofFileName: externalProofName.trim() || undefined,
                  memo: `${externalPaymentMethod} · ${externalNotes.trim() || "External settlement"}`,
                });
                if (res.ok) {
                  toast.success(res.message);
                  setShowExternalPaymentModal(false);
                } else {
                  toast.error(res.message);
                }
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Record External Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ── Full-Page Inline Bill Details View ─────────────────────────────────────────
  if (selectedBill) {
    const statusBadge = resolveHumanBillStatus(selectedBill);
    const stepReceivedDone = true;
    const stepVerifiedDone = selectedBill.matchingStatus !== "EXCEPTION_HOLD";
    const stepApprovedDone = selectedBill.approvalStatus === "APPROVED";
    const stepPaidDone = selectedBill.paymentStatus === "PAID";
    const stepReconDone = selectedBill.reconciliationStatus === "RECONCILED";

    return (
      <div className="space-y-6">
        {/* Top Navigation + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {selectedBill.invoiceNumber}
              </h2>
              <StatusBadge status={statusBadge.status} label={statusBadge.label} />
              <span className="text-xs text-[#68726d]">
                · {selectedBill.vendorName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedBill.approvalStatus === "DRAFT" && (
              <Button
                type="button"
                onClick={() => {
                  const res = submitBillForApproval(selectedBill.id);
                  if (res.ok) toast.success(res.message);
                  else toast.error(res.message);
                }}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Submit for Approval
              </Button>
            )}

            {selectedBill.approvalStatus === "CORRECTION_REQUESTED" && (
              <Button
                type="button"
                onClick={() => {
                  const res = submitBillForApproval(selectedBill.id);
                  if (res.ok) toast.success("Revised bill re-submitted for approval");
                  else toast.error(res.message);
                }}
                className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold h-9 px-4 gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Re-submit for Approval
              </Button>
            )}

            {selectedBill.approvalStatus === "PENDING_APPROVAL" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    rejectBill(selectedBill.id, "Returned during review");
                    toast.error("Bill rejected");
                  }}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold h-9 px-4"
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCorrectionModal(true)}
                  className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 text-xs font-semibold h-9 px-4"
                >
                  Request Correction
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const res = approveBill(selectedBill.id);
                    if (!res.ok) toast.error(res.message);
                    else toast.success(res.message);
                  }}
                  className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-5 gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve Bill
                </Button>
              </>
            )}

            {selectedBill.approvalStatus === "APPROVED" &&
              selectedBill.outstandingAmount > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setExternalAmount(String(selectedBill.outstandingAmount));
                      setExternalRef(`EXT-${Date.now().toString().slice(-6)}`);
                      setShowExternalPaymentModal(true);
                    }}
                    className="rounded-xl border-gray-200 hover:bg-gray-50 text-[#10231d] text-xs font-semibold h-9 px-4 gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-gray-600" /> Record External Settlement
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setPayBillTarget(selectedBill);
                      setPayAmount(String(selectedBill.outstandingAmount));
                    }}
                    className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-5 gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Pay{" "}
                    {formatNgn(selectedBill.outstandingAmount)}
                  </Button>
                </>
              )}

            {selectedBill.approvalStatus === "APPROVED" &&
              selectedBill.paymentStatus === "AWAITING_RELEASE" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-xs font-semibold text-purple-700 border border-purple-200">
                  <Clock className="w-3.5 h-3.5" /> Queued for Dual-Control Release
                </span>
              )}
          </div>
        </div>

        {/* Operational Status Banners */}
        {selectedBill.approvalStatus === "DRAFT" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Unposted Draft Bill</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  This bill is in Draft mode. It will not route to approvers, generate GL accruals, or appear in the payment release queue until submitted.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                const res = submitBillForApproval(selectedBill.id);
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8.5 px-4 shrink-0 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit for Approval
            </Button>
          </div>
        )}

        {selectedBill.approvalStatus === "CORRECTION_REQUESTED" && (
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-900">Correction Requested by Reviewer</h4>
                <p className="text-xs text-orange-800 mt-0.5">
                  Reviewer Note: <strong>&quot;{selectedBill.correctionReason || 'Please verify tax invoice TIN and delivery note quantity.'}&quot;</strong>
                </p>
                <p className="text-[11px] text-orange-700 mt-1">
                  Revise the necessary documentation and click Re-submit to return this bill to the approval chain.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                const res = submitBillForApproval(selectedBill.id);
                if (res.ok) toast.success("Revised bill re-submitted for approval");
                else toast.error(res.message);
              }}
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold h-8.5 px-4 shrink-0 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-submit for Approval
            </Button>
          </div>
        )}

        {(selectedBill.isOverdue ||
          (selectedBill.dueDate &&
            new Date(selectedBill.dueDate) < new Date() &&
            selectedBill.outstandingAmount > 0)) && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-950">
              <h4 className="font-bold">Payment Overdue Notice</h4>
              <p className="text-red-800 mt-0.5">
                This bill was due on <strong>{formatShortDate(selectedBill.dueDate)}</strong> and has an open balance of <strong>{formatNgn(selectedBill.outstandingAmount)}</strong>. Vendor credit terms or service availability may be impacted. Escalated to Accounts Payable manager.
              </p>
            </div>
          </div>
        )}

        {/* Multi-Tier Approval Chain Stepper */}
        {selectedBill.approvalSteps && selectedBill.approvalSteps.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#10231d] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#087f70]" />
                  Multi-Tier Approval Policy Chain
                </h3>
                <p className="text-xs text-[#68726d] mt-0.5">
                  Dynamic routing rules: &lt;₦100k Dept Head · ₦100k-₦1M Financial Controller · &gt;₦1M CFO · Bank change verification gate
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#087f70] bg-[#f0faf8] px-2.5 py-1 rounded-full border border-[#c8ece4]">
                Step {Math.min((selectedBill.currentApprovalStepIndex || 0) + 1, selectedBill.approvalSteps.length)} of {selectedBill.approvalSteps.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {selectedBill.approvalSteps.map((step, idx) => {
                const isCompleted = step.status === "APPROVED";
                const isCurrent =
                  idx === selectedBill.currentApprovalStepIndex &&
                  selectedBill.approvalStatus === "PENDING_APPROVAL";
                const isCorrection = step.status === "CORRECTION_REQUESTED";

                return (
                  <div
                    key={step.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? "bg-emerald-50/50 border-emerald-200"
                        : isCurrent
                        ? "bg-[#f0faf8] border-[#087f70] ring-1 ring-[#087f70]"
                        : isCorrection
                        ? "bg-orange-50/60 border-orange-200"
                        : "bg-gray-50/50 border-gray-200 text-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-[#087f70] text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : isCurrent
                            ? "bg-[#087f70] text-white"
                            : isCorrection
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {isCompleted
                          ? "Approved"
                          : isCurrent
                          ? "Active Tier"
                          : isCorrection
                          ? "Correction"
                          : "Queued"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-0.5">
                      <p className="text-xs font-bold text-[#10231d]">{step.roleTitle}</p>
                      <p className="text-[11px] text-[#68726d]">{step.assignedToName}</p>
                    </div>

                    {step.decidedAt && (
                      <p className="text-[10px] text-emerald-800 mt-2 font-medium">
                        ✓ Signed off by {step.assignedToName} ({step.decidedAt})
                      </p>
                    )}

                    {step.comments && (
                      <p className="text-[11px] text-gray-600 italic mt-1 bg-white/70 p-1.5 rounded border border-gray-100">
                        &quot;{step.comments}&quot;
                      </p>
                    )}

                    {/* Active Action Controls on Current Step */}
                    {isCurrent && (
                      <div className="mt-3 pt-3 border-t border-[#c8ece4] flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const res = approveBillStep(
                              selectedBill.id,
                              step.id,
                              step.assignedToName,
                              `Approved by ${step.roleTitle}`,
                            );
                            if (res.ok) toast.success(res.message);
                            else toast.error(res.message);
                          }}
                          className="flex-1 rounded-lg bg-[#087f70] hover:bg-[#076a5e] text-white text-[11px] font-semibold h-7.5 gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve Step
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCorrectionModal(true)}
                          className="rounded-lg border-orange-200 text-orange-700 hover:bg-orange-50 text-[11px] font-semibold h-7.5 px-2"
                          title="Request modifications from invoice creator"
                        >
                          Revise
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Core 2-Way vs 3-Way Matching & Validation Engine */}
        <DemoMatchingValidationEngine bill={selectedBill} />

        {/* Two-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#10231d]">Bill Overview</h3>
                {selectedBill.outstandingAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const vendorCr = vendorCredits.filter(
                          (c) =>
                            c.vendorId === selectedBill.vendorId &&
                            c.status !== "FULLY_EXHAUSTED" &&
                            c.remainingBalance > 0,
                        );
                        if (vendorCr.length > 0) {
                          setSelectedCreditId(vendorCr[0].id);
                          setApplyCreditAmount(
                            String(Math.min(vendorCr[0].remainingBalance, selectedBill.outstandingAmount)),
                          );
                          setShowApplyCreditModal(true);
                        } else {
                          setNewCreditNumber(`CN-${Date.now().toString().slice(-6)}`);
                          setNewCreditAmount("50000");
                          setShowNewCreditModal(true);
                        }
                      }}
                      className="text-xs font-semibold text-[#087f70] hover:underline"
                    >
                      + Apply / Issue Vendor Credit
                    </button>
                  </div>
                )}
              </div>

              {/* Origin & Classification Strip */}
              <div className="p-3.5 rounded-xl bg-[#f7faf9] border border-black/[0.05] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-[#68726d]">Bill Type</p>
                  <span
                    className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getBillTypeMeta(selectedBill).pillClass}`}
                  >
                    {getBillTypeMeta(selectedBill).label}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Intake Channel</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {getShortChannelLabel(selectedBill)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Linked Record</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {selectedBill.poReference
                      ? selectedBill.poReference.poNumber
                      : selectedBill.recurringScheduleId
                      ? "Recurring Schedule"
                      : "Standalone Bill"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Duplicate Check</p>
                  <p
                    className={`font-semibold mt-1 ${
                      selectedBill.duplicateWarning ? "text-red-600" : "text-[#087f70]"
                    }`}
                  >
                    {selectedBill.duplicateWarning ? "Flagged Duplicate" : "Passed (Unique)"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-[#68726d]">Vendor</p>
                  <p className="font-bold text-[#10231d] mt-1">{selectedBill.vendorName}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Department</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedBill.department}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Expense Category</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedBill.category}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Due Date</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {formatShortDate(selectedBill.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Invoice Total</p>
                  <p className="font-bold text-[#10231d] mt-1">
                    {formatNgn(selectedBill.originalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Credit Notes</p>
                  <p className="font-bold text-[#087f70] mt-1">
                    -{formatNgn(selectedBill.creditApplied)}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Amount Paid</p>
                  <p className="font-bold text-[#10231d] mt-1">
                    {formatNgn(selectedBill.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Balance Due</p>
                  <p className="font-extrabold text-[#087f70] mt-1">
                    {formatNgn(selectedBill.outstandingAmount)}
                  </p>
                </div>
              </div>

              {/* Vendor Credits Available Banner */}
              {(() => {
                const credits = vendorCredits.filter(
                  (c) =>
                    c.vendorId === selectedBill.vendorId &&
                    c.status !== "FULLY_EXHAUSTED" &&
                    c.remainingBalance > 0,
                );
                if (credits.length === 0) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-[#f0faf8] border border-[#c8ece4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#087f70] flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-[#087f70]" />
                        {credits.length} Vendor Credit Note{credits.length > 1 ? "s" : ""} Available
                      </p>
                      <p className="text-[#065f55]">
                        Total available balance: <strong>{formatNgn(credits.reduce((s, c) => s + c.remainingBalance, 0))}</strong>. Apply to offset this bill before payment.
                      </p>
                    </div>
                    {selectedBill.outstandingAmount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedCreditId(credits[0].id);
                          setApplyCreditAmount(
                            String(Math.min(credits[0].remainingBalance, selectedBill.outstandingAmount)),
                          );
                          setShowApplyCreditModal(true);
                        }}
                        className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8 px-3.5 shrink-0"
                      >
                        Apply Credit Note
                      </Button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Purchase Order Comparison Table (only when PO-backed) */}
            {selectedBill.poReference && (
              <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#10231d]">
                      Purchase Order &amp; Delivery Check
                    </h3>
                    <p className="text-xs text-[#68726d]">
                      {selectedBill.poReference.poNumber} · Receipt:{" "}
                      {selectedBill.poReference.grNumber}
                    </p>
                  </div>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#f9faf9] text-[10px] font-semibold uppercase text-gray-500">
                      <th className="py-3 px-6">Item</th>
                      <th className="py-3 px-3">Ordered</th>
                      <th className="py-3 px-3">Received</th>
                      <th className="py-3 px-3">Billed</th>
                      <th className="py-3 px-6 text-right">Approved Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBill.poReference.lines.map((line) => (
                      <tr key={line.id} className="border-b border-gray-50">
                        <td className="py-3.5 px-6 font-semibold text-[#10231d]">
                          {line.itemName}
                          <span className="block text-[11px] font-normal text-[#68726d]">
                            {formatNgn(line.unitPrice)} / unit
                          </span>
                        </td>
                        <td className="py-3.5 px-3">{line.poOrderedQty}</td>
                        <td className="py-3.5 px-3 font-semibold text-[#087f70]">
                          {line.grAcceptedQty}
                        </td>
                        <td
                          className={`py-3.5 px-3 font-bold ${
                            line.invoicedQty > line.grAcceptedQty
                              ? "text-red-600"
                              : "text-[#10231d]"
                          }`}
                        >
                          {line.invoicedQty}
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-[#10231d]">
                          {formatNgn(line.grAcceptedQty * line.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Sidebar: Progress, Budget & Timeline */}
          <div className="space-y-6">
            {/* Department Budget Meter Card */}
            {selectedBill.departmentBudget && (
              <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#087f70]" />
                    Budget Impact ({selectedBill.department})
                  </h4>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[#68726d]">Monthly Allocation</span>
                    <span className="font-bold text-[#10231d]">
                      {formatNgn(selectedBill.departmentBudget.monthlyBudget)}
                    </span>
                  </div>

                  {(() => {
                    const total = selectedBill.departmentBudget.monthlyBudget || 1;
                    const mtd = selectedBill.departmentBudget.currentMonthSpend || 0;
                    const thisBill = selectedBill.originalAmount;
                    const mtdPct = Math.min(100, Math.round((mtd / total) * 100));
                    const thisBillPct = Math.min(100 - mtdPct, Math.round((thisBill / total) * 100));
                    const remaining = total - (mtd + thisBill);
                    const isOverBudget = remaining < 0;

                    return (
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${mtdPct}%` }}
                            className="bg-[#10231d] h-full"
                            title={`MTD Spend: ${formatNgn(mtd)} (${mtdPct}%)`}
                          />
                          <div
                            style={{ width: `${thisBillPct}%` }}
                            className={isOverBudget ? "bg-red-500 h-full" : "bg-[#087f70] h-full"}
                            title={`This Bill: ${formatNgn(thisBill)} (${thisBillPct}%)`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-[#68726d]">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#10231d]" /> MTD ({mtdPct}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${isOverBudget ? "bg-red-500" : "bg-[#087f70]"}`} /> This Bill ({thisBillPct}%)
                          </span>
                          <span className="font-semibold text-gray-800">
                            {isOverBudget ? `Over by ${formatNgn(Math.abs(remaining))}` : `${formatNgn(remaining)} free`}
                          </span>
                        </div>

                        <div
                          className={`p-2.5 rounded-xl border text-[11px] font-semibold ${
                            isOverBudget
                              ? "bg-red-50 border-red-200 text-red-900"
                              : "bg-[#f0faf8] border-[#c8ece4] text-[#065f55]"
                          }`}
                        >
                          {isOverBudget
                            ? "Exceeds monthly department budget ceiling. Requires executive override."
                            : `Within budget (${Math.max(0, Math.round((remaining / total) * 100))}% headroom remaining after this bill).`}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="bg-[#10231d] rounded-2xl p-5 text-white space-y-4">
              <h3 className="text-sm font-bold">Bill Progress</h3>
              <div className="space-y-3.5 text-xs">
                {[
                  { label: "Bill Received", done: stepReceivedDone },
                  { label: "Verified & Matched", done: stepVerifiedDone },
                  { label: "Approved", done: stepApprovedDone },
                  { label: "Paid", done: stepPaidDone },
                  { label: "Reconciled with Bank", done: stepReconDone },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        step.done
                          ? "bg-[#087f70] text-white"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className={step.done ? "font-semibold text-white" : "text-gray-400"}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Timeline
              </h4>
              <div className="space-y-3 border-l-2 border-[#087f70]/25 pl-3">
                {selectedBill.timeline.map((ev) => (
                  <div key={ev.id} className="text-xs">
                    <p className="font-semibold text-[#10231d]">{ev.action}</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">{ev.detail}</p>
                    <p className="text-[10px] text-[#84908a] mt-0.5">
                      {ev.timestamp} · {ev.actor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pay Modal */}
        <Dialog
          open={Boolean(payBillTarget)}
          onOpenChange={(open) => !open && setPayBillTarget(null)}
        >
          <DialogContent className="max-w-md rounded-2xl">
            {payBillTarget && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Pay {payBillTarget.vendorName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Invoice {payBillTarget.invoiceNumber} · Balance due:{" "}
                    <strong>{formatNgn(payBillTarget.outstandingAmount)}</strong>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Amount to Pay Now (Partial or Full)
                    </label>
                    <input
                      type="number"
                      max={payBillTarget.outstandingAmount}
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Bank Transfer Outcome
                    </label>
                    <Select
                      value={payMode}
                      onValueChange={(v) => setPayMode(v as typeof payMode)}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="complete" className="text-xs">
                          Complete Transfer Now
                        </SelectItem>
                        <SelectItem value="awaiting_webhook" className="text-xs">
                          Delayed Bank Confirmation
                        </SelectItem>
                        <SelectItem value="simulate_failure" className="text-xs">
                          Transfer Rejected by Bank (Keep Balance Open)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayBillTarget(null)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleExecutePayment}
                    className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
                  >
                    Send Payment
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {renderCorrectionModal()}
        {renderApplyCreditModal()}
        {renderNewCreditModal()}
        {renderExternalPaymentModal()}
      </div>
    );
  }

  // ── Clean 7-Column Standard Bills Table ───────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl w-fit max-w-full overflow-x-auto">
          {[
            { key: "all", label: "All Bills", count: filterCounts.all },
            { key: "drafts", label: "Drafts", count: filterCounts.drafts },
            { key: "pending", label: "Awaiting Approval", count: filterCounts.pending },
            { key: "exceptions", label: "Needs Attention", count: filterCounts.exceptions },
            { key: "payable", label: "For Payment", count: filterCounts.payable },
            { key: "overdue", label: "Overdue", count: filterCounts.overdue },
            { key: "paid", label: "Paid", count: filterCounts.paid },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === tab.key
                  ? "bg-white text-[#10231d] font-semibold shadow-sm"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filter === tab.key
                    ? "bg-[#f0faf8] text-[#087f70] font-bold"
                    : "bg-gray-200/70 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
          <div className="relative w-full sm:flex-1 sm:order-first">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor, invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#087f70] bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
          >
            <SelectTrigger className="h-9 w-40 rounded-xl border-gray-200 text-xs font-medium bg-white">
              <SelectValue placeholder="All Bill Types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">All Bill Types</SelectItem>
              <SelectItem value="standard_non_po" className="text-xs">Standard · Non-PO</SelectItem>
              <SelectItem value="po_backed" className="text-xs">PO-Backed (3-Way)</SelectItem>
              <SelectItem value="no_invoice_voucher" className="text-xs">No Invoice · Payment Voucher</SelectItem>
              <SelectItem value="recurring" className="text-xs">Recurring Cycle</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}
          >
            <SelectTrigger className="h-9 w-40 rounded-xl border-gray-200 text-xs font-medium bg-white">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">All Channels</SelectItem>
              <SelectItem value="vendor_portal" className="text-xs">Vendor Portal</SelectItem>
              <SelectItem value="whatsapp" className="text-xs">WhatsApp Bot</SelectItem>
              <SelectItem value="email_ocr" className="text-xs">Email Inbox</SelectItem>
              <SelectItem value="pdf_upload" className="text-xs">PDF Upload</SelectItem>
              <SelectItem value="manual" className="text-xs">Manual Entry</SelectItem>
              <SelectItem value="recurring_schedule" className="text-xs">Recurring Contract</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={() => setShowAddBill(true)}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Bill
          </Button>
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center">
            <Receipt2 variant="Bulk" className="w-6 h-6 text-[#087f70]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#10231d]">No bills yet</p>
            <p className="text-xs text-[#68726d] mt-1 max-w-sm mx-auto">
              Add a supplier invoice manually or via upload, or load sample data to explore common
              billing scenarios.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setShowAddBill(true)}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Your First Bill
            </Button>
            {onLoadSampleData && (
              <Button
                type="button"
                variant="outline"
                onClick={onLoadSampleData}
                className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4"
              >
                Load Sample Data
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse table-fixed min-w-[780px]">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase bg-gray-50/50">
                  <th className="py-3 px-4 w-[16%] text-left">INVOICE</th>
                  <th className="py-3 px-4 w-[24%] text-left">VENDOR</th>
                  <th className="py-3 px-4 w-[22%] text-left">TYPE &amp; CHANNEL</th>
                  <th className="py-3 px-4 w-[14%] text-right">AMOUNT</th>
                  <th className="py-3 px-4 w-[12%] text-center">DUE DATE</th>
                  <th className="py-3 px-4 w-[12%] text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBills.map((bill) => {
                  const badge = resolveHumanBillStatus(bill);
                  const typeMeta = getBillTypeMeta(bill);
                  const channelText = getShortChannelLabel(bill);

                  return (
                    <tr
                      key={bill.id}
                      onClick={() => setSelectedBillId(bill.id)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-left">
                        <span className="text-xs font-bold text-[#10231d] group-hover:text-[#087f70] transition-colors">
                          {bill.invoiceNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <p className="text-xs font-bold text-[#10231d] truncate">
                          {bill.vendorName}
                        </p>
                        <p className="text-[11px] text-[#68726d] truncate">
                          {bill.department}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-left">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeMeta.pillClass}`}
                          >
                            {typeMeta.label}
                          </span>
                          <span className="text-[11px] text-[#68726d]">
                            {channelText}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right tabular-nums">
                        <p className="text-xs font-bold text-[#10231d]">
                          {formatNgn(bill.originalAmount)}
                        </p>
                        {bill.outstandingAmount > 0 &&
                          bill.outstandingAmount < bill.originalAmount && (
                            <p className="text-[11px] text-[#087f70] font-medium">
                              {formatNgn(bill.outstandingAmount)} left
                            </p>
                          )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap text-center">
                        {formatShortDate(bill.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <StatusBadge status={badge.status} label={badge.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredBills.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-[#68726d]">
              <p>
                Showing{" "}
                <strong className="text-[#10231d]">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </strong>
                –
                <strong className="text-[#10231d]">
                  {Math.min(currentPage * PAGE_SIZE, filteredBills.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-[#10231d]">{filteredBills.length}</strong> bills
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 rounded-lg border-gray-200 text-xs font-semibold disabled:opacity-40"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === pg
                        ? "bg-[#087f70] text-white shadow-2xs font-bold"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-2.5 rounded-lg border-gray-200 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AddBillModal
        open={showAddBill}
        onOpenChange={setShowAddBill}
        onCreated={(id) => setSelectedBillId(id)}
      />

      {renderCorrectionModal()}
      {renderApplyCreditModal()}
      {renderNewCreditModal()}
      {renderExternalPaymentModal()}
    </div>
  );
}
