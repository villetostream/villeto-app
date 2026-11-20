"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Building2,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Receipt,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Ban,
  RotateCw,
  Mail,
  Phone,
  Landmark,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { DemoBankVerificationModal } from "./DemoBankVerificationModal";
import type { DemoVendor, DemoVendorCredit } from "./demo-data";

function getDisplayTin(vendor: DemoVendor): string {
  if (vendor.taxId && vendor.taxId !== "TIN-99418290") {
    return vendor.taxId;
  }
  switch (vendor.id) {
    case "vnd_ekedc":
      return "10492811-0001";
    case "vnd_mainone":
      return "08923419-0001";
    case "vnd_dell":
      return "22094188-0001";
    case "vnd_vi_landlord":
      return "19482014-0001";
    case "vnd_lawma":
      return "01928471-0001";
    default:
      return "10492811-0001";
  }
}

export function DemoVendorDirectoryTab() {
  const {
    vendors = [],
    bills = [],
    schedules = [],
    subscriptionCards = [],
    vendorCredits = [],
    createVendorCredit,
    updateVendorStatus,
    approveVendorBankChange,
    onboardVendor,
  } = useBillPayDemoStore();

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  // Modals state
  const [verifyingVendor, setVerifyingVendor] = useState<DemoVendor | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNumber, setCreditNumber] = useState(`CRN-${Date.now().toString().slice(-5)}`);
  const [creditReason, setCreditReason] = useState("");

  // Onboard Supplier Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardCategory, setOnboardCategory] = useState("Industrial Supplies");
  const [onboardBank, setOnboardBank] = useState("Access Bank PLC");
  const [onboardAccount, setOnboardAccount] = useState("");
  const [onboardTaxId, setOnboardTaxId] = useState("");
  const [onboardEmail, setOnboardEmail] = useState("");

  const selectedVendor = useMemo(() => {
    return vendors.find((v) => v.id === selectedVendorId) || null;
  }, [vendors, selectedVendorId]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  // Wire header back button for full-page takeover
  useEffect(() => {
    if (selectedVendor) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedVendorId(null);
      }, selectedVendor.name);
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [selectedVendor]);

  // Vendor statistics - mathematically consistent
  const totalVendors = vendors.length;
  const pausedVendors = vendors.filter((v) => v.pendingBankChange !== null).length;
  const inactiveVendors = vendors.filter((v) => v.status === "inactive").length;
  const activeVendors = vendors.filter(
    (v) => (v.status === "approved" || v.status === "active") && v.pendingBankChange === null
  ).length;
  const totalCreditBalance = vendorCredits.reduce((sum, c) => sum + c.remainingBalance, 0);

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const tin = getDisplayTin(v).toLowerCase();
      const matchesSearch =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        tin.includes(q) ||
        (v.verifiedAccountNumber && v.verifiedAccountNumber.includes(q));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAUSED" && v.pendingBankChange !== null) ||
        (statusFilter === "ACTIVE" && (v.status === "approved" || v.status === "active") && !v.pendingBankChange) ||
        (statusFilter === "INACTIVE" && v.status === "inactive");

      const matchesCat = categoryFilter === "ALL" || v.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [vendors, searchQuery, statusFilter, categoryFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PAGE_SIZE));
  const paginatedVendors = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredVendors.slice(start, start + PAGE_SIZE);
  }, [filteredVendors, currentPage]);
  const startRecord = filteredVendors.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(currentPage * PAGE_SIZE, filteredVendors.length);

  function handleQuickFillSupplier() {
    setOnboardName("Dangote Cement PLC");
    setOnboardCategory("Industrial Supplies");
    setOnboardBank("Access Bank PLC");
    setOnboardAccount("0128491029");
    setOnboardTaxId("24194012-0001");
    setOnboardEmail("treasury@dangotecement.com");
  }

  function handleSaveNewSupplier() {
    if (!onboardName.trim()) {
      toast.error("Please enter the supplier company name.");
      return;
    }
    if (!onboardAccount.trim() || onboardAccount.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit NUBAN account number.");
      return;
    }

    const res = onboardVendor({
      name: onboardName.trim(),
      category: onboardCategory,
      verifiedBankName: onboardBank,
      verifiedAccountNumber: onboardAccount.trim(),
      taxId: onboardTaxId.trim() || `TIN-${Math.floor(10000000 + Math.random() * 89999999)}-0001`,
      contactEmail: onboardEmail.trim() || `billing@${onboardName.toLowerCase().replace(/[^a-z]/g, "")}.ng`,
    });

    if (res.ok) {
      toast.success(`Supplier ${onboardName} onboarded and verified with ${onboardBank}!`);
      setShowOnboardModal(false);
      setOnboardName("");
      setOnboardAccount("");
      setOnboardTaxId("");
      setOnboardEmail("");
    }
  }

  // Data related to the selected vendor
  const vendorBills = useMemo(() => {
    if (!selectedVendor) return [];
    return bills.filter((b) => b.vendorId === selectedVendor.id);
  }, [bills, selectedVendor]);

  const vendorSchedules = useMemo(() => {
    if (!selectedVendor) return [];
    return schedules.filter((s) => s.vendorId === selectedVendor.id);
  }, [schedules, selectedVendor]);

  const vendorCardSubs = useMemo(() => {
    if (!selectedVendor) return [];
    return subscriptionCards.filter((c) => c.vendorName.toLowerCase() === selectedVendor.name.toLowerCase());
  }, [subscriptionCards, selectedVendor]);

  const vendorCreditNotes = useMemo(() => {
    if (!selectedVendor) return [];
    return vendorCredits.filter((c) => c.vendorId === selectedVendor.id);
  }, [vendorCredits, selectedVendor]);

  const totalSpendYtd = useMemo(() => {
    return vendorBills
      .filter((b) => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + b.originalAmount, 0);
  }, [vendorBills]);

  function handleCreateCreditNote() {
    if (!selectedVendor) return;
    const amountNum = parseFloat(creditAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid credit note amount.");
      return;
    }
    if (!creditReason.trim()) {
      toast.error("Please enter a reason for this credit note.");
      return;
    }

    createVendorCredit({
      vendorId: selectedVendor.id,
      creditNoteNumber: creditNumber,
      amount: amountNum,
      reason: creditReason.trim(),
    });

    toast.success(`Credit Note ${creditNumber} of ₦${amountNum.toLocaleString()} issued for ${selectedVendor.name}.`);
    setShowCreditModal(false);
    setCreditAmount("");
    setCreditReason("");
    setCreditNumber(`CRN-${Date.now().toString().slice(-5)}`);
  }

  function handleToggleVendorActive() {
    if (!selectedVendor) return;
    const nextStatus = selectedVendor.status === "inactive" ? "approved" : "inactive";
    updateVendorStatus(selectedVendor.id, nextStatus);
    toast.success(
      `Vendor ${selectedVendor.name} is now ${nextStatus === "inactive" ? "Inactive (bills blocked)" : "Active"}.`
    );
  }

  // ─────────────────────────────────────────────────────────
  // FULL-PAGE DETAIL TAKEOVER (WHEN VENDOR IS SELECTED)
  // ─────────────────────────────────────────────────────────
  if (selectedVendor) {
    const isPaused = selectedVendor.pendingBankChange !== null;
    const isInactive = selectedVendor.status === "inactive";

    return (
      <div className="w-full space-y-6">
        {/* Detail Header Banner */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#087f70]/15 to-[#087f70]/5 border border-[#c8ece4] flex items-center justify-center text-[#087f70] font-bold text-xl">
                {selectedVendor.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-[#10231d]">{selectedVendor.name}</h1>
                  {isPaused ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5" /> Payouts Paused (Bank Change)
                    </span>
                  ) : isInactive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <Ban className="w-3.5 h-3.5" /> Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified &amp; Active
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                    {selectedVendor.category}
                  </span>
                </div>
                <p className="text-xs text-[#68726d] mt-1 flex items-center gap-3 flex-wrap">
                  <span>TIN: <strong>{selectedVendor.taxId || "TIN-99418290-001"}</strong></span>
                  <span>&bull;</span>
                  <span>Compliance Grade: <strong className="text-emerald-700 font-bold">{selectedVendor.complianceRating || "A"}</strong></span>
                  <span>&bull;</span>
                  <span>Portal Access: <strong>{selectedVendor.portalStatus === "portal_registered" ? "Active Supplier Portal" : "Offline / Email"}</strong></span>
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {isPaused && (
                <Button
                  type="button"
                  onClick={() => setVerifyingVendor(selectedVendor)}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-9 px-3.5 gap-1.5 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" /> Verify &amp; Unfreeze Bank
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreditModal(true)}
                className="rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 border-black/[0.08]"
              >
                <Plus className="w-3.5 h-3.5 text-[#087f70]" /> + Issue Credit Note
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleVendorActive}
                className={`rounded-xl text-xs font-semibold h-9 px-3.5 gap-1.5 border-black/[0.08] ${
                  isInactive ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                {isInactive ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5" /> Reactivate Vendor
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" /> Deactivate Vendor
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Bank Change Alert Banner (if pending) */}
        {isPaused && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-900">
                  Bank Account Change Detected — Payout Freeze Enforced
                </p>
                <p className="text-amber-800 leading-relaxed">
                  The supplier requested an account change from{" "}
                  <strong>{selectedVendor.verifiedBankName} ({selectedVendor.verifiedAccountNumber})</strong>{" "}
                  to <strong>{selectedVendor.pendingBankChange?.newBankName} ({selectedVendor.pendingBankChange?.newAccountNumber})</strong>.
                  All automated and manual payouts to this vendor are blocked until dual-control callback sign-off is completed.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setVerifyingVendor(selectedVendor)}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8.5 px-3 shrink-0"
            >
              Dual-Control Review
            </Button>
          </div>
        )}

        {/* Vendor Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Total Settled (YTD)</p>
            <p className="text-xl font-bold text-[#10231d]">₦{totalSpendYtd.toLocaleString()}</p>
            <p className="text-[11px] text-[#68726d]">{vendorBills.filter((b) => b.paymentStatus === "PAID").length} settled bills</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Open AP Obligations</p>
            <p className="text-xl font-bold text-[#087f70]">
              ₦{vendorBills.filter((b) => b.paymentStatus !== "PAID").reduce((sum, b) => sum + b.outstandingAmount, 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-[#68726d]">
              {vendorBills.filter((b) => b.paymentStatus !== "PAID").length} outstanding bill(s)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Available Credit Notes</p>
            <p className="text-xl font-bold text-purple-700">
              ₦{vendorCreditNotes.reduce((sum, c) => sum + c.remainingBalance, 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-[#68726d]">{vendorCreditNotes.length} credit note(s)</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Active Commitments</p>
            <p className="text-xl font-bold text-gray-900">{vendorSchedules.length + vendorCardSubs.length}</p>
            <p className="text-[11px] text-[#68726d]">
              {vendorSchedules.length} recurring schedules &middot; {vendorCardSubs.length} virtual cards
            </p>
          </div>
        </div>

        {/* Financial & Bank Details Card */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#087f70]" />
              <h3 className="font-bold text-sm text-[#10231d]">
                Settlement Banking &amp; Identity Controls
              </h3>
            </div>
            <span className="text-[11px] text-[#68726d] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> CBN / NIBSS Validated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
              <p className="text-[11px] text-[#68726d]">Verified Settlement Bank</p>
              <p className="font-bold text-[#10231d] text-sm">{selectedVendor.verifiedBankName}</p>
              <p className="font-mono text-gray-600">{selectedVendor.verifiedAccountNumber}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
              <p className="text-[11px] text-[#68726d]">Beneficiary Account Name</p>
              <p className="font-bold text-[#10231d] text-sm">{selectedVendor.name.toUpperCase()} LTD</p>
              <p className="text-emerald-700 text-[10px] font-semibold">100% NUBAN Match (Verified)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
              <p className="text-[11px] text-[#68726d]">Primary Contact &amp; Invoicing</p>
              <p className="font-bold text-[#10231d]">{selectedVendor.contactEmail || `billing@${selectedVendor.name.toLowerCase().replace(/[^a-z]/g, "")}.com`}</p>
              <p className="text-gray-500 text-[11px]">+234 (0) 1 234 5678</p>
            </div>
          </div>
        </div>

        {/* Associated Bills Section */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#087f70]" />
              <h3 className="font-bold text-sm text-[#10231d]">
                Accounts Payable Bills ({vendorBills.length})
              </h3>
            </div>
          </div>

          {vendorBills.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#68726d]">
              No bills recorded for this vendor yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[11px] font-semibold text-[#68726d] border-b border-black/[0.06]">
                  <tr>
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Remaining</th>
                    <th className="py-2.5 px-3">Approval</th>
                    <th className="py-2.5 px-3 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {vendorBills.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 font-semibold text-[#10231d]">{b.billNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{b.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-[#68726d]">{b.dueDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#10231d]">₦{b.originalAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-bold text-[#087f70]">₦{b.outstandingAmount.toLocaleString()}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-800">
                          {b.approvalStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {b.paymentStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vendor Credit Notes Section */}
        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-[#10231d]">
                Vendor Credit Notes &amp; Adjustments ({vendorCreditNotes.length})
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreditModal(true)}
              className="rounded-xl text-xs font-semibold h-7.5 px-3 gap-1 border-black/[0.08]"
            >
              <Plus className="w-3 h-3 text-[#087f70]" /> New Credit Note
            </Button>
          </div>

          {vendorCreditNotes.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#68726d]">
              No credit notes on record for this vendor.
            </div>
          ) : (
            <div className="space-y-2">
              {vendorCreditNotes.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-black/[0.06] bg-gray-50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#10231d]">{c.creditNoteNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#68726d]">{c.reason} &middot; Issued {c.issuedDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-800 text-sm">₦{c.remainingBalance.toLocaleString()} available</p>
                    <p className="text-[10px] text-[#68726d]">Original: ₦{c.originalAmount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Modal */}
        {verifyingVendor && (
          <DemoBankVerificationModal
            open={Boolean(verifyingVendor)}
            onOpenChange={(open) => {
              if (!open) setVerifyingVendor(null);
            }}
            vendorId={verifyingVendor.id}
            vendorName={verifyingVendor.name}
            onApproved={() => {
              setVerifyingVendor(null);
            }}
          />
        )}

        {/* Credit Note Creation Modal */}
        <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-[#10231d]">
                Issue Vendor Credit Note
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Record a credit memo issued by {selectedVendor.name} to offset future or current bills.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Credit Note Number</label>
                <Input
                  type="text"
                  value={creditNumber}
                  onChange={(e) => setCreditNumber(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Credit Amount (NGN)</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Reason / Memo</label>
                <Input
                  type="text"
                  placeholder="e.g. Service SLA rebate / damaged goods credit"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreditModal(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateCreditNote}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9"
              >
                Create Credit Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // DIRECTORY LIST VIEW (WHEN NO VENDOR IS SELECTED)
  // ─────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Total Suppliers</p>
          <p className="text-2xl font-bold text-[#10231d]">{totalVendors}</p>
          <p className="text-[11px] text-[#68726d]">
            {activeVendors} active · {pausedVendors} paused
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Active &amp; Approved</p>
          <p className="text-2xl font-bold text-[#087f70]">{activeVendors}</p>
          <p className="text-[11px] text-emerald-700 font-medium">Ready for automated payout</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Bank Change Paused</p>
          <p className="text-2xl font-bold text-amber-600">{pausedVendors}</p>
          <p className="text-[11px] text-amber-700 font-medium">Dual-control callback pending</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Available Vendor Credits</p>
          <p className="text-2xl font-bold text-purple-700">₦{totalCreditBalance.toLocaleString()}</p>
          <p className="text-[11px] text-purple-700 font-medium">
            {vendorCredits.length} {vendorCredits.length === 1 ? "credit note" : "credit notes"} ready to offset
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            {(
              [
                { key: "ALL", label: "All Suppliers" },
                { key: "ACTIVE", label: "Active & Verified" },
                { key: "PAUSED", label: "Payouts Paused" },
                { key: "INACTIVE", label: "Inactive" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  statusFilter === filter.key
                    ? "bg-[#087f70] text-white font-semibold shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
                {filter.key === "PAUSED" && pausedVendors > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    {pausedVendors}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Category Select */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-8.5 text-xs rounded-xl border-black/[0.08]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Internet & Telecom">Internet &amp; Telecom</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Facilities & Rent">Facilities &amp; Rent</SelectItem>
                <SelectItem value="IT Hardware">IT Hardware</SelectItem>
                <SelectItem value="Industrial Supplies">Industrial Supplies</SelectItem>
                <SelectItem value="Government & Regulatory">Government &amp; Regulatory</SelectItem>
                <SelectItem value="Cloud Services">Cloud Services</SelectItem>
              </SelectContent>
            </Select>

            {/* Search input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search vendor, TIN, NUBAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8.5 text-xs rounded-xl border-black/[0.08]"
              />
            </div>

            {/* Onboard Supplier Button */}
            <Button
              type="button"
              onClick={() => setShowOnboardModal(true)}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Onboard Supplier
            </Button>
          </div>
        </div>

        {/* Directory Table - No action buttons per user rule */}
        <div className="overflow-x-auto border border-black/[0.06] rounded-xl">
          <table className="w-full text-left text-xs table-fixed min-w-[780px]">
            <thead className="bg-gray-50/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-black/[0.06]">
              <tr>
                <th className="py-3 px-4 w-[28%]">Supplier Entity</th>
                <th className="py-3 px-4 w-[16%]">Category</th>
                <th className="py-3 px-4 w-[18%]">Settlement Bank</th>
                <th className="py-3 px-4 w-[14%]">NUBAN Account #</th>
                <th className="py-3 px-4 w-[14%]">Compliance Status</th>
                <th className="py-3 px-4 w-[10%] text-right pr-6">Available Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {paginatedVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#68726d]">
                    No suppliers match your search filters.
                  </td>
                </tr>
              ) : (
                paginatedVendors.map((vendor) => {
                  const isPaused = vendor.pendingBankChange !== null;
                  const isInactive = vendor.status === "inactive";
                  const creditsForVendor = vendorCredits.filter((c) => c.vendorId === vendor.id);
                  const creditSum = creditsForVendor.reduce((sum, c) => sum + c.remainingBalance, 0);
                  const displayTin = getDisplayTin(vendor);

                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => setSelectedVendorId(vendor.id)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#f0faf8] text-[#087f70] border border-[#c8ece4] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#e0f4f0] transition-colors">
                            {vendor.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 group-hover:text-[#087f70] transition-colors truncate">
                              {vendor.name}
                            </p>
                            <p className="text-[11px] text-[#68726d] font-mono">
                              TIN: {displayTin}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#68726d]">{vendor.category}</td>
                      <td className="py-3 px-4 font-medium text-[#10231d]">
                        {vendor.verifiedBankName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 inline-block">
                          {vendor.verifiedAccountNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isPaused ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <ShieldAlert className="w-3 h-3 text-amber-700" /> Payouts Paused (Bank Change)
                          </span>
                        ) : isInactive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Ban className="w-3 h-3 text-rose-600" /> Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Grade {vendor.complianceRating || "A"} · Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right pr-6">
                        {creditSum > 0 ? (
                          <span className="font-bold text-purple-700 font-mono tabular-nums text-xs">₦{creditSum.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300 font-mono pr-2">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Client-side Pagination Footer */}
        {filteredVendors.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/[0.06] text-xs text-[#68726d]">
            <div>
              Showing <span className="font-semibold text-[#10231d]">{startRecord}</span> to{" "}
              <span className="font-semibold text-[#10231d]">{endRecord}</span> of{" "}
              <span className="font-semibold text-[#10231d]">{filteredVendors.length}</span> suppliers
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 rounded-xl border-black/[0.08] text-xs font-semibold gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <Button
                    key={pageNum}
                    type="button"
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 p-0 rounded-xl text-xs font-semibold ${
                      currentPage === pageNum
                        ? "bg-[#087f70] text-white hover:bg-[#076a5e]"
                        : "border-black/[0.08] hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 rounded-xl border-black/[0.08] text-xs font-semibold gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard Supplier Modal */}
      <Dialog open={showOnboardModal} onOpenChange={setShowOnboardModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#087f70]/10 flex items-center justify-center text-[#087f70]">
                  <Building2 className="w-4 h-4" />
                </div>
                <DialogTitle className="text-base font-bold text-[#10231d]">
                  Onboard Verified Supplier
                </DialogTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleQuickFillSupplier}
                className="text-[11px] text-[#087f70] hover:text-[#076a5e] hover:bg-[#087f70]/10 h-7 px-2 gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-fill Dangote
              </Button>
            </div>
            <DialogDescription className="text-xs text-[#68726d]">
              Register an authorized corporate vendor with verified CBN / NIBSS NUBAN settlement banking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#68726d]">Supplier Legal Entity Name *</label>
              <Input
                type="text"
                placeholder="e.g. Dangote Cement PLC"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Category</label>
                <Select value={onboardCategory} onValueChange={setOnboardCategory}>
                  <SelectTrigger className="rounded-xl h-9 text-xs border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="Industrial Supplies">Industrial Supplies</SelectItem>
                    <SelectItem value="IT Hardware">IT Hardware</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Internet & Telecom">Internet &amp; Telecom</SelectItem>
                    <SelectItem value="Facilities & Rent">Facilities &amp; Rent</SelectItem>
                    <SelectItem value="Legal & Professional">Legal &amp; Professional</SelectItem>
                    <SelectItem value="Logistics & Fleet">Logistics &amp; Fleet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Settlement Bank *</label>
                <Select value={onboardBank} onValueChange={setOnboardBank}>
                  <SelectTrigger className="rounded-xl h-9 text-xs border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="Access Bank PLC">Access Bank PLC</SelectItem>
                    <SelectItem value="Zenith Bank PLC">Zenith Bank PLC</SelectItem>
                    <SelectItem value="Guaranty Trust Bank">Guaranty Trust Bank</SelectItem>
                    <SelectItem value="Providus Bank">Providus Bank</SelectItem>
                    <SelectItem value="Stanbic IBTC Bank">Stanbic IBTC Bank</SelectItem>
                    <SelectItem value="First Bank of Nigeria">First Bank of Nigeria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">10-Digit NUBAN Account # *</label>
                <Input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0128491029"
                  value={onboardAccount}
                  onChange={(e) => setOnboardAccount(e.target.value.replace(/[^0-9]/g, ""))}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#68726d]">Federal Tax ID (TIN)</label>
                <Input
                  type="text"
                  placeholder="e.g. 24194012-0001"
                  value={onboardTaxId}
                  onChange={(e) => setOnboardTaxId(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#68726d]">Official Remittance Email</label>
              <Input
                type="email"
                placeholder="e.g. billing@dangotecement.com"
                value={onboardEmail}
                onChange={(e) => setOnboardEmail(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOnboardModal(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveNewSupplier}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save &amp; Verify Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
