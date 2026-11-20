"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  Inbox,
  Mail,
  MessageSquare,
  PackageCheck,
  Repeat,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  FileText,
  AlertTriangle,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DemoMatchingValidationEngine } from "./DemoMatchingValidationEngine";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import { type DemoChannelIntake } from "./demo-data";
import { formatNgn } from "./demo-utils";

function ChannelBadge({ channel }: { channel: DemoChannelIntake["channel"] }) {
  if (channel === "whatsapp") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#047857]">
        <MessageSquare className="w-3 h-3" />
        WhatsApp Bot
      </span>
    );
  }
  if (channel === "email_ocr") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0f9ff] text-[#0369a1]">
        <Mail className="w-3 h-3" />
        Email (ap@villeto.ng)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f5f3ff] text-[#6d28d9]">
      <Building2 className="w-3 h-3" />
      Vendor Portal
    </span>
  );
}

export function DemoIntakeAndPortalTab({
  onLoadSampleData,
  selectedIntakeId: externalSelectedIntakeId,
  onSelectIntakeId: externalOnSelectIntakeId,
  selectedPortalBillId: externalSelectedPortalBillId,
  onSelectPortalBillId: externalOnSelectPortalBillId,
}: {
  onLoadSampleData?: () => void;
  selectedIntakeId?: string | null;
  onSelectIntakeId?: (id: string | null) => void;
  selectedPortalBillId?: string | null;
  onSelectPortalBillId?: (id: string | null) => void;
}) {
  const router = useRouter();
  const {
    vendors,
    bills,
    intakes,
    schedules,
    submitVendorPortalInvoice,
    createChannelIntake,
    convertIntakeToBill,
  } = useBillPayDemoStore();

  const [subView, setSubView] = useState<"portal" | "inbox">("portal");

  // ── Vendor Portal Form State (Starts Empty) ─────────────────────────────────
  const [vpVendorId, setVpVendorId] = useState("");
  const [vpInvoiceNum, setVpInvoiceNum] = useState("");
  const [vpAmount, setVpAmount] = useState("");
  const [vpSupportType, setVpSupportType] = useState<"po_backed" | "non_po">("po_backed");
  const [vpPoNumber, setVpPoNumber] = useState("");
  const [vpOrderedQty, setVpOrderedQty] = useState("");
  const [vpReceivedQty, setVpReceivedQty] = useState("");
  const [vpInvoicedQty, setVpInvoicedQty] = useState("");
  const [vpDepartment, setVpDepartment] = useState("");
  const [vpCategory, setVpCategory] = useState("");
  const [vpGlAccount, setVpGlAccount] = useState("");
  const [vpDueDate, setVpDueDate] = useState("");
  const [vpNotes, setVpNotes] = useState("");

  // Track inspected / validated bill from portal
  const [internalSelectedPortalBillId, setInternalSelectedPortalBillId] = useState<string | null>(null);
  const inspectedPortalBillId =
    externalSelectedPortalBillId !== undefined
      ? externalSelectedPortalBillId
      : internalSelectedPortalBillId;

  const setInspectedPortalBillId = useCallback(
    (id: string | null) => {
      if (externalOnSelectPortalBillId) externalOnSelectPortalBillId(id);
      setInternalSelectedPortalBillId(id);
    },
    [externalOnSelectPortalBillId],
  );

  // ── WhatsApp / Email Simulator Form State (Starts Empty) ────────────────────
  const [inChannel, setInChannel] = useState<"whatsapp" | "email_ocr">("whatsapp");
  const [inVendorId, setInVendorId] = useState("");
  const [inInvoiceNum, setInInvoiceNum] = useState("");
  const [inAmount, setInAmount] = useState("");
  const [inDesc, setInDesc] = useState("");

  const [internalSelectedIntakeId, setInternalSelectedIntakeId] = useState<string | null>(null);
  const selectedIntakeId =
    externalSelectedIntakeId !== undefined
      ? externalSelectedIntakeId
      : internalSelectedIntakeId;

  const setSelectedIntakeId = useCallback(
    (id: string | null) => {
      if (externalOnSelectIntakeId) externalOnSelectIntakeId(id);
      setInternalSelectedIntakeId(id);
    },
    [externalOnSelectIntakeId],
  );

  const [modalScheduleId, setModalScheduleId] = useState<string>("");

  const portalBills = useMemo(
    () => bills.filter((b) => b.source === "vendor_portal"),
    [bills],
  );
  const pendingIntakesCount = useMemo(
    () => intakes.filter((i) => i.status === "pending_review").length,
    [intakes],
  );

  const inspectedBill = useMemo(
    () => bills.find((b) => b.id === inspectedPortalBillId) || null,
    [bills, inspectedPortalBillId],
  );

  const selectedIntakeItem = useMemo(
    () => intakes.find((i) => i.id === selectedIntakeId) || null,
    [intakes, selectedIntakeId],
  );

  useEffect(() => {
    if (inspectedBill) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setInspectedPortalBillId(null);
      }, "Vendor Portal Invoices");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else if (selectedIntakeItem) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedIntakeId(null);
      }, "Intake Inbox");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [inspectedBill, selectedIntakeItem, setInspectedPortalBillId, setSelectedIntakeId]);

  // ── 1-Click Prefill: Vendor Portal Form ──────────────────────────────────────
  function handlePrefillVendorPortal() {
    const portalVendor =
      vendors.find((v) => v.portalStatus === "portal_registered") || vendors[0];
    setVpVendorId(portalVendor?.id || "vnd_dell");
    setVpInvoiceNum(`INV-DELL-2026-${Math.floor(100 + Math.random() * 899)}`);
    setVpAmount("5000000");
    setVpSupportType("po_backed");
    setVpPoNumber("PO-1794469015843-317");
    setVpOrderedQty("10");
    setVpReceivedQty("8"); // 3-way variance hold scenario
    setVpInvoicedQty("10");
    setVpDepartment("Engineering");
    setVpCategory("IT Equipment");
    setVpGlAccount("1520 · Computer Hardware");
    setVpDueDate("2026-12-05");
    setVpNotes("Invoice submitted by supplier from Villeto Vendor Portal");
    toast.success("Prefilled with PO 3-way match sample (10 ordered, 8 received, 10 billed)");
  }

  // ── 1-Click Prefill: WhatsApp / Email Form ───────────────────────────────────
  function handlePrefillChannelIntake() {
    const sampleVendor = vendors[0] || { id: "vnd_ekedc", name: "Eko Electricity" };
    setInChannel("whatsapp");
    setInVendorId(sampleVendor.id);
    setInInvoiceNum(`WA-INV-2026-${Math.floor(100 + Math.random() * 899)}`);
    setInAmount("145000");
    setInDesc("Diesel delivery receipt photo sent via WhatsApp bot by contractor");
    toast.success("Prefilled with WhatsApp channel invoice sample");
  }

  function handleVendorPortalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vpVendorId) {
      toast.error("Please select a supplier account.");
      return;
    }
    const numericAmount = Number(vpAmount);
    if (!vpInvoiceNum.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid invoice reference and amount.");
      return;
    }

    const res = submitVendorPortalInvoice({
      vendorId: vpVendorId,
      invoiceNumber: vpInvoiceNum,
      amount: numericAmount,
      supportType: vpSupportType,
      poNumber: vpSupportType === "po_backed" ? vpPoNumber : undefined,
      orderedQty: Number(vpOrderedQty) || 10,
      receivedQty: Number(vpReceivedQty) || 0,
      invoicedQty: Number(vpInvoicedQty) || 10,
      department: vpDepartment || "Engineering",
      category: vpCategory || "IT Equipment",
      glAccount: vpGlAccount || "1520 · Computer Hardware",
      dueDate: vpDueDate || "2026-12-05",
      notes: vpNotes,
    });

    if (res.ok) {
      if (res.billId) {
        setInspectedPortalBillId(res.billId);
      }
      if (res.exceptionHold) {
        toast.warning(res.message);
      } else {
        toast.success(res.message);
      }
    } else {
      toast.error(res.message);
    }
  }

  function handleReceiveChannelMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inVendorId) {
      toast.error("Please select a vendor.");
      return;
    }
    const numericAmount = Number(inAmount);
    if (!inInvoiceNum.trim() || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid invoice reference and amount.");
      return;
    }

    const res = createChannelIntake({
      channel: inChannel,
      vendorId: inVendorId,
      invoiceNumber: inInvoiceNum,
      amount: numericAmount,
      description: inDesc || "Scanned incoming invoice message",
    });

    if (res.ok) {
      toast.success(res.message);
      setInInvoiceNum("");
      setInAmount("");
      setInDesc("");
    } else {
      toast.error(res.message);
    }
  }

  function handleConvert(
    intake: DemoChannelIntake,
    mode: "standard_non_po" | "standard_po" | "recurring_match",
  ) {
    const schedId =
      modalScheduleId ||
      schedules.find((s) => s.vendorId === intake.vendorId)?.id ||
      schedules[0]?.id;

    if (mode === "recurring_match" && !schedId) {
      toast.error("Create a recurring schedule first under Recurring Bills.");
      return;
    }

    const res = convertIntakeToBill(intake.id, mode, {
      scheduleId: schedId,
      poNumber: intake.poNumber,
    });

    if (res.ok) {
      setSelectedIntakeId(null);
      if (res.exceptionHold) {
        toast.warning(res.message);
      } else {
        toast.success(res.message);
      }
    } else {
      toast.error(res.message);
    }
  }

  // ── Full-Page Detail Takeover: Vendor Portal Invoice ──
  if (inspectedBill) {
    const isPoException = inspectedBill.matchingStatus === "EXCEPTION_HOLD";
    return (
      <div className="space-y-6">
        {/* Top Title & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {inspectedBill.invoiceNumber}
              </h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f5f3ff] text-[#6d28d9]">
                Vendor Portal Submission
              </span>
              <StatusBadge
                status={
                  isPoException
                    ? "rejected"
                    : inspectedBill.approvalStatus === "APPROVED"
                    ? "approved"
                    : "pending"
                }
                label={
                  isPoException
                    ? inspectedBill.duplicateWarning
                      ? "Duplicate Flagged"
                      : "PO Match Exception (Hold)"
                    : inspectedBill.approvalStatus === "APPROVED"
                    ? "Approved & In AP"
                    : "Awaiting Finance Sign-off"
                }
              />
              <span className="text-xs text-[#68726d]">
                &bull; {inspectedBill.vendorName}
              </span>
            </div>
            <p className="text-xs text-[#68726d]">
              Direct supplier invoice submission with automated CBN / NIBSS bank account verification and 3-way line item matching.
            </p>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Billed Amount
            </p>
            <p className="text-lg font-bold text-[#087f70] mt-1">
              {formatNgn(inspectedBill.originalAmount)}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Due Date: {inspectedBill.dueDate}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Purchase Order
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1 font-mono">
              {inspectedBill.poReference?.poNumber || "PO-1794469015843-317"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              PO Commitment: {formatNgn(inspectedBill.originalAmount)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Warehouse Goods Receipt
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              {isPoException ? "Partial Delivery (6 / 10)" : "Complete Delivery (10 / 10)"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              GRN-843-317 &bull; Stamped Receipt
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              3-Way Match Audit
            </p>
            <p className={`text-base font-bold mt-1 ${isPoException ? "text-amber-800" : "text-emerald-700"}`}>
              {isPoException ? "Quantity Variance Flagged" : "100% Match Passed"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Automated PO &bull; GRN &bull; Invoice Check
            </p>
          </div>
        </div>

        {/* Interactive Validation Engine */}
        <DemoMatchingValidationEngine bill={inspectedBill} />

        {/* Vendor Portal Audit & Settlement Details */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
            Digital Submission Audit Trail &amp; Banking Records
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[#68726d]">Supplier Entity</p>
              <p className="font-bold text-[#10231d] mt-1">{inspectedBill.vendorName}</p>
            </div>
            <div>
              <p className="text-[#68726d]">Portal Submission ID</p>
              <p className="font-semibold text-gray-800 mt-1 font-mono">{inspectedBill.id}</p>
            </div>
            <div>
              <p className="text-[#68726d]">Verified Beneficiary Bank</p>
              <p className="font-semibold text-[#087f70] mt-1">Providus Bank &bull; 5400192837</p>
            </div>
            <div>
              <p className="text-[#68726d]">Cost Center Allocation</p>
              <p className="font-semibold text-gray-800 mt-1">{inspectedBill.department} &bull; {inspectedBill.glAccount}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full-Page Detail Takeover: WhatsApp / Email Intake ──
  if (selectedIntakeItem) {
    return (
      <div className="space-y-6">
        {/* Top Title & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {selectedIntakeItem.invoiceNumber}
              </h2>
              <ChannelBadge channel={selectedIntakeItem.channel} />
              <StatusBadge
                status={selectedIntakeItem.status === "converted" ? "approved" : "pending"}
                label={
                  selectedIntakeItem.status === "converted"
                    ? "Classified & In Standard Bills"
                    : "Needs Classification"
                }
              />
              <span className="text-xs text-[#68726d]">
                &bull; Received {selectedIntakeItem.receivedAt}
              </span>
            </div>
            <p className="text-xs text-[#68726d]">
              Inbound supplier message received via {selectedIntakeItem.channel === "whatsapp" ? "WhatsApp Business Bot" : "Email OCR Inbox (ap@villeto.ng)"}.
            </p>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Detected Amount
            </p>
            <p className="text-lg font-bold text-[#087f70] mt-1">
              {formatNgn(selectedIntakeItem.amount)}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Currency: NGN (Naira)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Detected Supplier
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              {selectedIntakeItem.vendorName}
            </p>
            <p className="text-[11px] text-[#087f70] font-medium mt-0.5">
              Verified in Directory
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              AI OCR Confidence
            </p>
            <p className="text-lg font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" /> 96% Match
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Vision Model Extraction
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Anti-Fraud Scan
            </p>
            <p className="text-base font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Passed
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Unique Invoice &bull; No Duplicate
            </p>
          </div>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          <div className="space-y-6">
            {/* Raw Message Evidence */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#087f70]" /> Inbound Message Evidence &amp; OCR Payload
              </h4>

              {selectedIntakeItem.channel === "whatsapp" ? (
                <div className="p-4 rounded-2xl bg-[#efeae2] border border-[#d1d7db] space-y-2">
                  <div className="text-[11px] font-bold text-[#075e54] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Business Bot Channel
                  </div>
                  <div className="p-3.5 rounded-xl bg-white shadow-xs text-xs space-y-2 max-w-lg">
                    <p className="font-bold text-gray-900">{selectedIntakeItem.senderLabel}</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedIntakeItem.description}</p>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Attachment: <strong>{selectedIntakeItem.invoiceNumber}.pdf</strong></span>
                      <span>{selectedIntakeItem.receivedAt}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-[#0369a1] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Inbound Email Received at ap@villeto.ng
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1.5">
                    <p><span className="text-gray-500">From:</span> <strong>{selectedIntakeItem.senderLabel}</strong></p>
                    <p><span className="text-gray-500">Subject:</span> <strong>Invoice {selectedIntakeItem.invoiceNumber} for Villeto Technologies</strong></p>
                    <p className="text-gray-700 pt-2 border-t border-gray-100">{selectedIntakeItem.description}</p>
                  </div>
                </div>
              )}

              {/* Structured Extracted Values */}
              <div className="bg-[#f7faf9] rounded-xl border border-black/[0.05] p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-[#68726d]">Invoice Number</p>
                  <p className="font-bold text-[#10231d] mt-0.5">{selectedIntakeItem.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Detected Total</p>
                  <p className="font-bold text-[#087f70] mt-0.5">{formatNgn(selectedIntakeItem.amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Detected Supplier</p>
                  <p className="font-bold text-[#10231d] mt-0.5">{selectedIntakeItem.vendorName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">VAT / Tax</p>
                  <p className="font-semibold text-gray-800 mt-0.5">7.5% Included</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">PO Reference</p>
                  <p className="font-semibold text-gray-800 mt-0.5 font-mono">{selectedIntakeItem.poNumber || "None"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d]">Settlement Bank NUBAN</p>
                  <p className="font-semibold text-gray-800 mt-0.5">Providus Bank &bull; 5400192837</p>
                </div>
              </div>
            </div>

            {/* Classification Card */}
            {selectedIntakeItem.status !== "converted" && (
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#10231d]">
                  Convert &amp; Classify into Accounts Payable
                </h4>
                <p className="text-xs text-[#68726d]">
                  Select the proper financial workflow for this obligation. It will be recorded into the ERP with complete audit history without manual data re-entry.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConvert(selectedIntakeItem, "standard_non_po")}
                    className="p-4 rounded-xl border border-black/[0.08] hover:border-[#087f70] hover:bg-[#f0faf8]/50 text-left transition-all space-y-2 group"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 group-hover:bg-[#087f70] group-hover:text-white transition-colors">
                      Standard Non-PO
                    </span>
                    <p className="text-xs font-bold text-[#10231d]">Direct AP Bill</p>
                    <p className="text-[11px] text-[#68726d]">
                      Routine one-time operational expense without a purchase order.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConvert(selectedIntakeItem, "standard_po")}
                    className="p-4 rounded-xl border border-black/[0.08] hover:border-[#087f70] hover:bg-[#f0faf8]/50 text-left transition-all space-y-2 group"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#f0faf8] text-[#087f70] group-hover:bg-[#087f70] group-hover:text-white transition-colors">
                      3-Way Matching
                    </span>
                    <p className="text-xs font-bold text-[#10231d]">PO-Backed Bill</p>
                    <p className="text-[11px] text-[#68726d]">
                      Enforces PO line matching and goods receipt verification.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConvert(selectedIntakeItem, "recurring_match")}
                    className="p-4 rounded-xl border border-black/[0.08] hover:border-[#087f70] hover:bg-[#f0faf8]/50 text-left transition-all space-y-2 group"
                  >
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      Recurring Contract
                    </span>
                    <p className="text-xs font-bold text-[#10231d]">Match Schedule</p>
                    <p className="text-[11px] text-[#68726d]">
                      Binds to repeating contract and enforces price variance limit.
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Controls & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4 text-xs">
              <h4 className="font-bold text-[#10231d] border-b border-gray-100 pb-2">
                Automated Security Screening
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#087f70] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#10231d]">Duplicate Check Passed</p>
                    <p className="text-[11px] text-[#68726d]">No matching invoice number exists in the AP ledger.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#10231d]">Verified Vendor Match</p>
                    <p className="text-[11px] text-[#68726d]">{selectedIntakeItem.vendorName} exists in supplier directory.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#10231d]">Bank NUBAN Verification</p>
                    <p className="text-[11px] text-[#68726d]">Central Bank NUBAN lookup matches vendor legal entity.</p>
                  </div>
                </div>
              </div>

              {selectedIntakeItem.status === "converted" && (
                <div className="pt-3 border-t border-gray-100">
                  <Button
                    type="button"
                    onClick={() => router.push("/bill-pay/demo?tab=standard")}
                    className="w-full rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 gap-1.5"
                  >
                    <span>View in Standard Bills</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-[#edeef0] rounded-xl border border-black/[0.04] w-fit">
          <button
            type="button"
            onClick={() => setSubView("portal")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subView === "portal"
                ? "bg-white text-[#10231d] shadow-sm"
                : "text-gray-500 hover:text-[#10231d]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#087f70]" />
            <span>Vendor Portal Submissions</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f5f3ff] text-[#6d28d9]">
              {portalBills.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView("inbox")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              subView === "inbox"
                ? "bg-white text-[#10231d] shadow-sm"
                : "text-gray-500 hover:text-[#10231d]"
            }`}
          >
            <Inbox className="w-3.5 h-3.5 text-[#087f70]" />
            <span>WhatsApp &amp; Email Inbox</span>
            {pendingIntakesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fffbeb] text-[#b45309]">
                {pendingIntakesCount} new
              </span>
            )}
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/bill-pay/demo?tab=standard")}
          className="rounded-xl text-xs font-semibold gap-1.5 self-start sm:self-auto"
        >
          <span>Open Standard Bills Table</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {subView === "portal" ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Supplier-side Portal Form */}
            <form
              onSubmit={handleVendorPortalSubmit}
              className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#087f70]">
                    <Building2 className="w-3.5 h-3.5" />
                    Supplier View · Vendor Portal
                  </span>
                  <h2 className="text-base font-bold text-[#10231d] mt-1">
                    Submit an Invoice as a Registered Supplier
                  </h2>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    Test what happens when a vendor uploads an invoice on the Vendor Portal and watch it land in your buyer Bill Pay workspace.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrefillVendorPortal}
                  className="rounded-xl border-dashed border-[#087f70]/50 text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Prefill Sample Details</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-[#10231d]">Supplier Account</label>
                  <Select value={vpVendorId} onValueChange={setVpVendorId}>
                    <SelectTrigger className="mt-1 h-9 rounded-xl border-gray-200 text-xs">
                      <SelectValue placeholder="Choose supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} ({v.portalStatus === "portal_registered" ? "Portal Enabled" : "Directory"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10231d]">
                    Supplier Invoice #
                  </label>
                  <input
                    value={vpInvoiceNum}
                    onChange={(e) => setVpInvoiceNum(e.target.value)}
                    placeholder="e.g. INV-DELL-2026-105"
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10231d]">
                    Invoice Amount (NGN)
                  </label>
                  <input
                    type="number"
                    value={vpAmount}
                    onChange={(e) => setVpAmount(e.target.value)}
                    placeholder="e.g. 5000000"
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10231d]">Due Date</label>
                  <input
                    type="date"
                    value={vpDueDate}
                    onChange={(e) => setVpDueDate(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
                  />
                </div>
              </div>

              {/* PO-Backed vs Direct Service toggle */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#10231d]">
                  Billing Against a Purchase Order?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVpSupportType("po_backed")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      vpSupportType === "po_backed"
                        ? "border-[#087f70] bg-[#f0faf8]/70"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-[#10231d]">PO-Backed (3-Way Match)</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      Checked automatically against PO &amp; warehouse delivery receipt.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVpSupportType("non_po")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      vpSupportType === "non_po"
                        ? "border-[#087f70] bg-[#f0faf8]/70"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-[#10231d]">Direct Non-PO Service</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      No PO required — goes straight to duplicate check &amp; approval.
                    </p>
                  </button>
                </div>
              </div>

              {vpSupportType === "po_backed" && (
                <div className="p-3.5 rounded-xl bg-[#fafafa] border border-gray-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-[#10231d]">PO Number</label>
                    <input
                      value={vpPoNumber}
                      onChange={(e) => setVpPoNumber(e.target.value)}
                      placeholder="PO-1794469015843-317"
                      className="mt-1 w-full h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#10231d]">Ordered Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={vpOrderedQty}
                      onChange={(e) => setVpOrderedQty(e.target.value)}
                      placeholder="10"
                      className="mt-1 w-full h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#10231d]">Received Qty</label>
                    <input
                      type="number"
                      min={0}
                      value={vpReceivedQty}
                      onChange={(e) => setVpReceivedQty(e.target.value)}
                      placeholder="8"
                      className="mt-1 w-full h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#10231d]">Vendor Billed</label>
                    <input
                      type="number"
                      min={1}
                      value={vpInvoicedQty}
                      onChange={(e) => setVpInvoicedQty(e.target.value)}
                      placeholder="10"
                      className="mt-1 w-full h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-xs"
                    />
                  </div>
                  <p className="col-span-2 sm:col-span-4 text-[11px] text-[#68726d]">
                    Tip: Set <strong>Vendor Billed &gt; Received Qty</strong> (e.g. Billed 10 vs Received 8) to trigger an Exception Hold with interactive validation resolution actions below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#10231d]">Department</label>
                  <Select value={vpDepartment} onValueChange={setVpDepartment}>
                    <SelectTrigger className="mt-1 h-9 rounded-xl border-gray-200 text-xs">
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10231d]">Category</label>
                  <input
                    value={vpCategory}
                    onChange={(e) => setVpCategory(e.target.value)}
                    placeholder="e.g. IT Equipment"
                    className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#10231d]">Expense Account</label>
                  <Select value={vpGlAccount} onValueChange={setVpGlAccount}>
                    <SelectTrigger className="mt-1 h-9 rounded-xl border-gray-200 text-xs">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1520 · Computer Hardware">
                        1520 · Computer Hardware
                      </SelectItem>
                      <SelectItem value="6100 · Electricity Expense">
                        6100 · Electricity Expense
                      </SelectItem>
                      <SelectItem value="6210 · Bandwidth & Fiber">
                        6210 · Bandwidth &amp; Fiber
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#10231d]">Supplier Note</label>
                <input
                  value={vpNotes}
                  onChange={(e) => setVpNotes(e.target.value)}
                  placeholder="Optional delivery memo or remarks"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#68726d]">
                  Submits directly into <strong>Standard Bills</strong> with automated 3-way check.
                </span>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#087f70] hover:bg-[#06695c] text-white text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Invoice as Vendor</span>
                </Button>
              </div>
            </form>

            {/* Right: How Vendor Portal Bills Flow In */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#087f70]">
                    Automated Verification Pipeline
                  </span>
                  <h3 className="text-base font-bold text-[#10231d] mt-1">
                    From Supplier Upload to Standard Bills
                  </h3>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    Every vendor-submitted invoice goes through 3 automated validation gates before release.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f7faf9] border border-black/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-[#087f70] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#10231d]">
                        Supplier Submits on Portal
                      </p>
                      <p className="text-[11px] text-[#68726d] mt-0.5">
                        Vendor enters invoice details &amp; attaches PO reference. Eliminates manual AP data entry.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f7faf9] border border-black/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-[#087f70] text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#10231d]">
                        Duplicate &amp; Bank Verification
                      </p>
                      <p className="text-[11px] text-[#68726d] mt-0.5">
                        Guards against duplicate invoice numbers and verifies beneficiary settlement bank.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f7faf9] border border-black/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-[#087f70] text-white flex items-center justify-center shrink-0">
                      <PackageCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#10231d]">
                        3-Way PO &amp; Delivery Validation
                      </p>
                      <p className="text-[11px] text-[#68726d] mt-0.5">
                        Compares PO commitments vs Warehouse Goods Receipt Note (GRN) vs Billed quantities.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/25">
                    <div className="w-7 h-7 rounded-lg bg-[#087f70] text-white flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#10231d]">
                        Lands in Standard Bills
                      </p>
                      <p className="text-[11px] text-[#68726d] mt-0.5">
                        Classified cleanly as <strong>Vendor Portal</strong>, ready for finance approval or variance resolution.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Portal Invoices Landed Table (Clean - No Action Column) */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.05] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#10231d]">
                  Invoices Received from Vendor Portal ({portalBills.length})
                </h3>
                <p className="text-xs text-[#68726d]">
                  Click any invoice row to inspect its 3-way matching validation details, warehouse delivery status, and approval controls.
                </p>
              </div>
              {portalBills.length === 0 && onLoadSampleData && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onLoadSampleData}
                  className="rounded-xl text-xs font-semibold"
                >
                  Load Sample Data
                </Button>
              )}
            </div>

            {portalBills.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#68726d]">
                No Vendor Portal bills yet. Submit one using the form above to inspect how it matches.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/[0.05] bg-[#fafafa] text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                      <th className="py-3 px-4">Bill / Invoice</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] text-xs">
                    {portalBills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => setInspectedPortalBillId(bill.id)}
                        className={`hover:bg-gray-50/80 cursor-pointer transition-colors ${
                          inspectedPortalBillId === bill.id ? "bg-[#f0faf8]/60" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#10231d]">{bill.billNumber}</div>
                          <div className="text-[11px] text-[#68726d]">{bill.invoiceNumber}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#10231d]">
                          {bill.vendorName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f5f3ff] text-[#6d28d9]">
                              Vendor Portal
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                              {bill.supportType === "po_backed"
                                ? `PO-Backed (${bill.poReference?.poNumber || "PO"})`
                                : "Standard Non-PO"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#10231d]">
                          {formatNgn(bill.originalAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status={
                              bill.matchingStatus === "EXCEPTION_HOLD"
                                ? "rejected"
                                : bill.approvalStatus === "APPROVED"
                                ? "approved"
                                : "pending"
                            }
                            label={
                              bill.matchingStatus === "EXCEPTION_HOLD"
                                ? bill.duplicateWarning
                                  ? "Duplicate Flagged"
                                  : "PO Match Issue"
                                : bill.approvalStatus === "APPROVED"
                                ? "Approved"
                                : "Awaiting Approval"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Sub-View B: WhatsApp & Email ap@villeto.ng Inbox ── */
        <div className="space-y-5">
          {/* Incoming Message Creator */}
          <form
            onSubmit={handleReceiveChannelMessage}
            className="bg-white rounded-2xl border border-black/[0.06] p-5 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#087f70]">
                  Multi-Channel Ingestion
                </span>
                <h2 className="text-base font-bold text-[#10231d] mt-0.5">
                  Receive Invoice via WhatsApp Bot or Email (`ap@villeto.ng`)
                </h2>
                <p className="text-xs text-[#68726d] mt-0.5">
                  Simulate incoming invoices from WhatsApp or Email. Invoices wait in this queue until finance reviews and classifies them.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrefillChannelIntake}
                className="rounded-xl border-dashed border-[#087f70]/50 text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prefill Sample Details</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-[#10231d]">Channel</label>
                <Select
                  value={inChannel}
                  onValueChange={(v) => setInChannel(v as "whatsapp" | "email_ocr")}
                >
                  <SelectTrigger className="mt-1 h-9 rounded-xl border-gray-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp Bot Photo/PDF</SelectItem>
                    <SelectItem value="email_ocr">Email Inbox (ap@villeto.ng)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#10231d]">Vendor</label>
                <Select value={inVendorId} onValueChange={setInVendorId}>
                  <SelectTrigger className="mt-1 h-9 rounded-xl border-gray-200 text-xs">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#10231d]">Invoice Ref</label>
                <input
                  value={inInvoiceNum}
                  onChange={(e) => setInInvoiceNum(e.target.value)}
                  placeholder="e.g. WA-INV-2026-41"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#10231d]">Amount (NGN)</label>
                <input
                  type="number"
                  value={inAmount}
                  onChange={(e) => setInAmount(e.target.value)}
                  placeholder="e.g. 145000"
                  className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full h-9 rounded-xl bg-[#087f70] hover:bg-[#06695c] text-white text-xs font-semibold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Drop into Inbox</span>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#10231d]">Message / Description</label>
              <input
                value={inDesc}
                onChange={(e) => setInDesc(e.target.value)}
                placeholder="Optional description or OCR message transcript"
                className="mt-1 w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#087f70]/20"
              />
            </div>
          </form>

          {/* Pending & Processed Intakes List (Clean - Clicking row opens Detail Inspection Modal) */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.05] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#10231d]">
                  Incoming Multi-Channel Queue ({intakes.length})
                </h3>
                <p className="text-xs text-[#68726d]">
                  Click any invoice row to view AI OCR confidence, raw transcript, duplicate check, and choose classification.
                </p>
              </div>
              {intakes.length === 0 && onLoadSampleData && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onLoadSampleData}
                  className="rounded-xl text-xs font-semibold"
                >
                  Load Sample Data
                </Button>
              )}
            </div>

            {intakes.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-[#10231d]">
                  No incoming WhatsApp or Email invoices in the queue
                </p>
                <p className="text-xs text-[#68726d]">
                  Drop a message using the form above or click Load Sample Data to test intake items.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.05]">
                {intakes.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedIntakeId(item.id);
                      setModalScheduleId(
                        schedules.find((s) => s.vendorId === item.vendorId)?.id ||
                          schedules[0]?.id ||
                          "",
                      );
                    }}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 cursor-pointer transition-colors"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChannelBadge channel={item.channel} />
                        <span className="text-xs font-bold text-[#10231d]">
                          {item.invoiceNumber}
                        </span>
                        <span className="text-xs text-[#68726d]">· {item.receivedAt}</span>
                        {item.poNumber && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f0faf8] text-[#087f70]">
                            Ref: {item.poNumber}
                          </span>
                        )}
                        <StatusBadge
                          status={item.status === "converted" ? "approved" : "pending"}
                          label={
                            item.status === "converted"
                              ? "Added to Bills"
                              : "Needs Classification"
                          }
                        />
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-bold text-[#10231d]">
                          {item.vendorName}
                        </span>
                        <span className="text-sm font-bold text-[#087f70]">
                          {formatNgn(item.amount)}
                        </span>
                      </div>

                      <p className="text-xs text-[#68726d]">
                        <strong>From:</strong> {item.senderLabel} — {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "converted" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857]">
                          <CheckCircle2 className="w-4 h-4" />
                          Classified &amp; In Bills
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-500">
                          Click to inspect &amp; convert &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
