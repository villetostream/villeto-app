"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { asRecord, getApiErrorMessage, getString, pickString } from "@/lib/types/api-error";
import { useAxios } from "@/hooks/useAxios";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/auth-stores";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  MoreHorizontal,
  Eye,
  Mail,
  X,
  ChevronDown,
  Building2,
  Users,
  Clock,
  XCircle,
  BadgeCheck,
  Search,
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type VendorStatus = "active" | "deactivated" | "pending" | "invited" | "onboarding" | "flagged" | "rejected" | "approved";

interface Vendor {
  id: string;
  vendorName: string;
  regNo: string;
  email: string;
  invitedOn: string;
  status: VendorStatus;
  lastUpdated: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  VendorStatus,
  { label: string; classes: string; actionLabel: string; actionIcon: React.ReactNode }
> = {
  active: {
    label: "Active",
    classes: "text-[#087f70] bg-[#f0faf8] border border-[#e7f6f2]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  deactivated: {
    label: "Deactivated",
    classes: "text-[#68726d] bg-[#f9faf9] border border-black/[0.08]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  approved: {
    label: "Approved",
    classes: "text-[#087f70] bg-[#f0faf8] border border-[#e7f6f2]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  pending: {
    label: "Pending",
    classes: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  flagged: {
    label: "Flagged",
    classes: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  invited: {
    label: "Invited",
    classes: "text-[#68726d] bg-[#f9faf9] border border-black/[0.08]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  onboarding: {
    label: "Onboarding",
    classes: "text-[#0066cc] bg-[#f0f6ff] border border-[#d6e7ff]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  rejected: {
    label: "Rejected",
    classes: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
};

const TAB_STATUS_MAP: Record<string, VendorStatus[] | null> = {
  all: null,
  verified: ["active", "approved"],
  invited: ["invited", "onboarding"],
  under_review: ["pending"],
  rejected: ["rejected", "flagged"],
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VendorStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// ─── Action Menu ──────────────────────────────────────────────────────────────

function ActionMenu({ vendor, onAction }: { vendor: Vendor; onAction: (v: Vendor, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[vendor.status];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#84908a] hover:bg-[#f5f7f6] hover:text-[#0b100e] transition-colors cursor-pointer border border-transparent hover:border-black/[0.08]"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] w-48 overflow-hidden p-1">
          <button
            onClick={() => { onAction(vendor, cfg.actionLabel); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#0b100e] hover:bg-[#f5f7f6] rounded-[6px] transition-colors"
          >
            {cfg.actionIcon}
            {cfg.actionLabel}
          </button>
          {vendor.status === "invited" && (
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                onAction(vendor, "Resend Invitation"); 
                setOpen(false); 
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-[#0b100e] hover:bg-[#f5f7f6] rounded-[6px] transition-colors"
            >
              <Mail className="w-4 h-4" />
              Resend Invitation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function VendorEmptyState({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-5">
        <Building2 className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {filtered ? "No vendors match this filter" : "No vendors onboarded yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {filtered
          ? "Try switching to a different tab or clearing your search."
          : "Use the Invite Vendor button to start onboarding your first vendor."}
      </p>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function InviteVendorModal({ open, onClose, onSuccess }: InviteModalProps) {
  const [legalName, setLegalName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [phone, setPhone] = useState("+234");
  const [description, setDescription] = useState("");
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");

  const [countryOpen, setCountryOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const axiosInstance = useAxios();
  const countryRef = useRef<HTMLDivElement>(null);

  const SUPPORTED_COUNTRIES = useMemo(() => [
    { name: "Nigeria", code: "+234" },
    { name: "Ghana", code: "+233" },
    { name: "South africa", code: "+27" },
    { name: "Kenya", code: "+254" }
  ], []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setLegalName(""); setEmail(""); setCountry("Nigeria"); setPhone("+234");
      setDescription(""); setContactFirstName(""); setContactLastName("");
      setErrors({}); setSuccess(false); setLoading(false);
      setCountryOpen(false);
    });
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCountryChange = (c: { name: string, code: string }) => {
    const oldCode = SUPPORTED_COUNTRIES.find(sc => sc.name === country)?.code || "+234";
    setCountry(c.name);
    setCountryOpen(false);
    setPhone(prev => {
      if (prev.startsWith(oldCode)) {
        return c.code + prev.slice(oldCode.length);
      } else if (!prev.startsWith("+")) {
        return c.code + prev.replace(/^0+/, '');
      }
      return c.code;
    });
    setErrors(e => ({ ...e, country: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!legalName.trim()) e.legalName = "Required";
    if (!email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!phone.trim()) e.phone = "Required";
    if (!contactFirstName.trim()) e.contactFirstName = "Required";
    if (!contactLastName.trim()) e.contactLastName = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    
    const payload = {
      legalName,
      displayName: legalName,
      email,
      phone,
      description,
      contactFirstName,
      contactLastName,
    };

    try {
      await axiosInstance.post("/vendors", payload);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      logger.error("Invite vendor error", err);
      
      const msg = getApiErrorMessage(err, "Failed to invite vendor");
      
      // If the backend mentions the email already exists, show it inline on the email field
      if (msg.toLowerCase().includes("already exists") && msg.toLowerCase().includes(email.toLowerCase())) {
        setErrors(prev => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] border border-black/[0.08]">
        {success ? (
          /* ── Success state ── */
          <div className="p-10 flex flex-col items-center text-center">
            <div className="relative mb-6">
              {/* Confetti dots */}
              {["top-0 left-4 bg-orange-400","top-2 right-6 bg-blue-500","bottom-4 left-2 bg-primary","bottom-0 right-4 bg-amber-400"].map((cls, i) => (
                <span key={i} className={`absolute w-2 h-2 rounded-full ${cls}`} />
              ))}
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-[18px] font-bold text-[#0b100e] mb-2">Vendor Invite Sent</h2>
            <p className="text-[13px] text-[#68726d] leading-relaxed mb-8">
              The vendor has received an onboarding link and can now begin verification.
            </p>
            <button
              onClick={onClose}
              className="w-full h-10 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-[18px] font-bold text-[#0b100e]">Invite Vendor</h2>
                <p className="text-[13px] text-[#68726d] mt-0.5">Provide basic vendor information and invite them.</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[8px] bg-[#f9faf9] hover:bg-[#f5f7f6] flex items-center justify-center transition-colors border border-black/[0.08] ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>

            <div className="w-full h-px bg-black/[0.08] my-5" />

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 pb-2">
              {/* Legal Name */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[#0b100e]">Legal Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => { setLegalName(e.target.value); setErrors(err => ({ ...err, legalName: "" })); }}
                  placeholder="e.g. Acme Supplies Limited"
                  className={`w-full h-10 px-3 rounded-[8px] border text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors ${
                    errors.legalName ? "border-[#d33d44]" : "border-black/[0.08]"
                  }`}
                />
                {errors.legalName && <p className="text-[11px] text-[#d33d44]">{errors.legalName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[#0b100e]">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(err => ({ ...err, email: "" })); }}
                  placeholder="e.g. vendor@acme.com"
                  className={`w-full h-10 px-3 rounded-[8px] border text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors ${
                    errors.email ? "border-[#d33d44]" : "border-black/[0.08]"
                  }`}
                />
                {errors.email && <p className="text-[11px] text-[#d33d44]">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[#0b100e]">First Name</label>
                  <input
                    type="text"
                    value={contactFirstName}
                    onChange={(e) => { setContactFirstName(e.target.value); setErrors(err => ({ ...err, contactFirstName: "" })); }}
                    placeholder="e.g. Jane"
                    className={`w-full h-10 px-3 rounded-[8px] border text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors ${
                      errors.contactFirstName ? "border-[#d33d44]" : "border-black/[0.08]"
                    }`}
                  />
                  {errors.contactFirstName && <p className="text-[11px] text-[#d33d44]">{errors.contactFirstName}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[#0b100e]">Last Name</label>
                  <input
                    type="text"
                    value={contactLastName}
                    onChange={(e) => { setContactLastName(e.target.value); setErrors(err => ({ ...err, contactLastName: "" })); }}
                    placeholder="e.g. Doe"
                    className={`w-full h-10 px-3 rounded-[8px] border text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors ${
                      errors.contactLastName ? "border-[#d33d44]" : "border-black/[0.08]"
                    }`}
                  />
                  {errors.contactLastName && <p className="text-[11px] text-[#d33d44]">{errors.contactLastName}</p>}
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1.5" ref={countryRef}>
                <label className="text-[13px] font-semibold text-[#0b100e]">Country</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCountryOpen(v => !v)}
                    className={`w-full h-10 px-3 rounded-[8px] border text-[13px] text-left flex items-center justify-between transition-colors border-black/[0.08] hover:border-black/[0.12] text-[#0b100e] bg-white`}
                  >
                    {country}
                    <ChevronDown className={`w-4 h-4 text-[#84908a] transition-transform ${countryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {countryOpen && (
                    <div className="absolute left-0 right-0 top-11 z-50 bg-white border border-black/[0.08] rounded-[10px] shadow-lg overflow-y-auto max-h-64 mt-1 p-1">
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleCountryChange(c)}
                          className="w-full text-left px-3 py-2 text-[13px] text-[#0b100e] hover:bg-[#f5f7f6] rounded-[6px] transition-colors"
                        >
                          {c.name} ({c.code})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[#0b100e]">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(err => ({ ...err, phone: "" })); }}
                  placeholder="e.g. +2348000000000"
                  className={`w-full h-10 px-3 rounded-[8px] border text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors ${
                    errors.phone ? "border-[#d33d44]" : "border-black/[0.08]"
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-[#d33d44]">{errors.phone}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-[#0b100e]">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Primary stationery vendor"
                  rows={3}
                  className="w-full p-3 rounded-[8px] border border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 w-full h-10 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Sending...
                </>
              ) : "Send invite"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Removed VendorDetailsModal as it's now its own page

// ─── Vendor Table ─────────────────────────────────────────────────────────────

function VendorTable({
  vendors,
  isLoading,
  onAction,
  currentPage,
  onPageChange,
}: {
  vendors: Vendor[];
  isLoading: boolean;
  onAction: (v: Vendor, label: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const [search, setSearch] = useState("");
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendorName.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.regNo.toLowerCase().includes(q),
    );
  }, [vendors, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // If search changes, reset page to 1
  useEffect(() => {
    onPageChange(1);
  }, [search, onPageChange]);

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const portalTarget =
    typeof window !== "undefined" ? document.getElementById("tab-actions") : null;

  const searchBar = (
    <div className="flex sm:flex-row flex-col items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          className="w-full h-9 pl-9 pr-4 rounded-[8px] border border-black/[0.08] bg-white text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Portal search into tab-actions slot (same as People/Policies), fallback inline */}
      {portalTarget ? createPortal(searchBar, portalTarget) : searchBar}

      {/* Table */}
      {filtered.length === 0 ? (
        <VendorEmptyState filtered={vendors.length > 0} />
      ) : (
        <div className="rounded-[14px] border border-black/[0.08] overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9faf9] border-b border-black/[0.08]">
                {["VENDOR NAME", "REG NO.", "EMAIL", "INVITED ON", "STATUS", "LAST UPDATED", "ACTION"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-bold text-[#84908a] uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {paginatedData.map((v) => (
                <tr key={v.id} onClick={() => onAction(v, "View Details")} className="hover:bg-[#f5f7f6] transition-colors cursor-pointer group">
                  <td className="px-5 py-4 font-semibold text-[#0b100e]">{v.vendorName}</td>
                  <td className="px-5 py-4 text-[#68726d]">{v.regNo}</td>
                  <td className="px-5 py-4 text-[#68726d]">{v.email}</td>
                  <td className="px-5 py-4 text-[#68726d] whitespace-nowrap">{v.invitedOn}</td>
                  <td className="px-5 py-4"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-4 text-[#68726d] whitespace-nowrap">{v.lastUpdated}</td>
                  <td className="px-5 py-4">
                    <ActionMenu vendor={v} onAction={onAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination row */}
          <div className="px-5 py-3 border-t border-black/[0.08] flex items-center justify-between text-[13px] text-[#68726d] bg-[#f9faf9]">
            <span>Showing {paginatedData.length} entries on page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={`px-3 py-1.5 rounded-[8px] transition-colors border border-transparent ${
                  currentPage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:border-black/[0.08] hover:text-[#0b100e]"
                }`}
              >
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-[8px] transition-colors bg-[#087f70] text-white font-semibold">
                {currentPage}
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className={`px-3 py-1.5 rounded-[8px] transition-colors border border-transparent ${
                  currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-white hover:border-black/[0.08] hover:text-[#0b100e]"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default withPermissions(VendorPage, [
  { resource: "vendor", action: "read_company" },
  { resource: "vendor", action: "manage" },
]);

function VendorPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { setAction, clearAction } = useHeaderActionStore();
  const can = useAuthStore(s => s.can);
  const canInviteVendor = can("vendor", "invite");

  const [isLoading, setIsLoading] = useState(true);
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [_selectedVendorId, _setSelectedVendorId] = useState<string | null>(null);

  const axiosInstance = useAxios();

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get("/vendors");
      const json = res.data;
      
      const mappedVendors: Vendor[] = (json.data || []).map((raw: unknown) => {
        const v = asRecord(raw);
        let computedStatus: VendorStatus = "invited";
        
        const status = getString(v.status);
        const onboardingStatus = getString(v.onboardingStatus);
        const approvalStatus = getString(v.approvalStatus);
        const normalizedStatus = status.toLowerCase();

        if (approvalStatus === "rejected") {
          computedStatus = "rejected";
        } else if (approvalStatus === "approved") {
          if (normalizedStatus === "active") {
            computedStatus = "active";
          } else if (v.deactivatedAt) {
            computedStatus = "deactivated"; // Stage 6
          } else {
            computedStatus = "approved"; // Stage 4
          }
        } else {
          // approvalStatus === "pending" — use onboardingStatus to distinguish
          if (!onboardingStatus || onboardingStatus === "invited") {
            // null/undefined onboardingStatus means just invited, not yet started
            computedStatus = "invited";
          } else if (onboardingStatus === "submitted") {
            computedStatus = "pending";          // ready for admin review
          } else {
            computedStatus = "onboarding";       // in_progress states
          }
        }
        
        return {
          id: getString(v.vendorId),
          vendorName: pickString(v, "legalName", "displayName") || "Unknown",
          regNo: getString(v.taxId) || "N/A",
          email: getString(v.email),
          invitedOn: v.invitationSentAt ? new Date(getString(v.invitationSentAt)).toLocaleDateString() : "N/A",
          status: computedStatus,
          lastUpdated: v.updatedAt ? new Date(getString(v.updatedAt)).toLocaleDateString() : "N/A"
        };
      });
      
      setVendors(mappedVendors);
    } catch (err) {
      logger.error("Error fetching vendors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchVendors();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync tab to URL
  useEffect(() => {
    const currentTab = searchParams.get("tab") || "all";
    if (currentTab !== activeTab) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", activeTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, router, searchParams]);

  // Header CTA — only show "Invite Vendor" to users who can actually invite.
  // Without this, a read-only vendor viewer would see a button whose click
  // opens a modal that POSTs to an endpoint they don't have permission to call.
  useEffect(() => {
    if (!canInviteVendor) {
      clearAction();
      return;
    }
    setAction({
      label: "Invite Vendor",
      items: [
        { label: "Single invite", onClick: () => setShowInviteModal(true) },
        { label: "Bulk invite",   onClick: () => router.push("/vendors/bulk-invite-page") },
      ],
    });
    return () => clearAction();
  }, [setAction, clearAction, router, canInviteVendor]);

  // Stats
  const stats = useMemo(() => ({
    total:    vendors.length,
    verified: vendors.filter((v) => v.status === "active" || v.status === "approved").length,
    pending:  vendors.filter((v) => v.status === "pending").length,
    rejected: vendors.filter((v) => v.status === "rejected" || v.status === "flagged").length,
  }), [vendors]);

  // Filter vendors by tab
  const filteredByTab = useMemo(() => {
    const statuses = TAB_STATUS_MAP[activeTab];
    if (!statuses) return vendors;
    return vendors.filter((v) => statuses.includes(v.status));
  }, [vendors, activeTab]);

  const handleAction = async (vendor: Vendor, actionLabel: string) => {
    if (actionLabel === "Resend Invitation") {
      try {
        await axiosInstance.post(`/vendors/${vendor.id}/invitations/resend`);
        toast.success("Invitation resent successfully");
      } catch (err) {
        logger.error("Failed to resend invitation", err);
        toast.error("Failed to resend invitation. Please try again.");
      }
      return;
    }
    router.push(`/vendors/${vendor.id}`);
  };

  const statCards = [
    {
      title: "Total Vendors",
      value: stats.total.toString(),
      accent: "#0b100e",
      icon: Users,
      subtitle: <span className="text-[11px] text-[#68726d]">All vendors added</span>,
    },
    {
      title: "Approved Vendors",
      value: stats.verified.toString(),
      accent: "#087f70",
      icon: BadgeCheck,
      subtitle: <span className="text-[11px] text-[#68726d]">Vendors fully approved</span>,
    },
    {
      title: "Approval Pending",
      value: stats.pending.toString(),
      accent: "#f0b132",
      icon: Clock,
      subtitle: <span className="text-[11px] text-[#68726d]">Vendors who submitted onboarding</span>,
    },
    {
      title: "Rejected Vendors",
      value: stats.rejected.toString(),
      accent: "#d33d44",
      icon: XCircle,
      subtitle: <span className="text-[11px] text-[#68726d]">Total number of vendors rejected</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <InviteVendorModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onSuccess={() => fetchVendors()} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <StatsCard
            key={s.title}
            isLoading={isLoading}
            title={s.title}
            value={s.value}
            accentColor={s.accent}
            icon={<s.icon className="w-4 h-4" style={{ color: s.accent }} />}
            subtitle={s.subtitle}
          />
        ))}
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex">
            <TabsTrigger value="all"          className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full">All Vendors</TabsTrigger>
            <TabsTrigger value="verified"     className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full">Approved</TabsTrigger>
            <TabsTrigger value="invited"      className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full">Invited</TabsTrigger>
            <TabsTrigger value="under_review" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full">Pending</TabsTrigger>
            <TabsTrigger value="rejected"     className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full">Rejected</TabsTrigger>
          </TabsList>

          {/* Search bar portals here */}
          <div id="tab-actions" className="flex items-center gap-2" />
        </div>

        {["all", "verified", "invited", "under_review", "rejected"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <VendorTable
              vendors={tab === activeTab ? filteredByTab : []}
              isLoading={isLoading}
              onAction={handleAction}
              currentPage={page}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}