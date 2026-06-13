"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
    classes: "text-emerald-600 bg-emerald-50 border border-emerald-100",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  deactivated: {
    label: "Deactivated",
    classes: "text-gray-600 bg-gray-50 border border-gray-200",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  approved: {
    label: "Approved",
    classes: "text-emerald-600 bg-emerald-50 border border-emerald-100",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  pending: {
    label: "Pending",
    classes: "text-amber-500 bg-amber-50 border border-amber-100",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  flagged: {
    label: "Flagged",
    classes: "text-orange-500 bg-orange-50 border border-orange-100",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  invited: {
    label: "Invited",
    classes: "text-gray-500 bg-gray-100 border border-gray-200",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  onboarding: {
    label: "Onboarding",
    classes: "text-blue-500 bg-blue-50 border border-blue-100",
    actionLabel: "View Details",
    actionIcon: <Eye className="w-4 h-4" />,
  },
  rejected: {
    label: "Rejected",
    classes: "text-red-500 bg-red-50 border border-red-100",
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
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white border border-border rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] w-48 overflow-hidden">
          <button
            onClick={() => { onAction(vendor, cfg.actionLabel); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/40 transition-colors"
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
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted/40 transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[480px]">
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
            <h2 className="text-xl font-bold text-foreground mb-2">Vendor Invite Sent</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              The vendor has received an onboarding link and can now begin verification.
            </p>
            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="p-8">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-xl font-bold text-foreground">Invite Vendor</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Provide basic vendor information and invite them.</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted/40 hover:bg-muted/80 flex items-center justify-center transition-colors border border-border/50 ml-4 shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="w-full h-px bg-border/60 my-5" />

            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 pb-2">
              {/* Legal Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Legal Name</label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => { setLegalName(e.target.value); setErrors(err => ({ ...err, legalName: "" })); }}
                  placeholder="e.g. Acme Supplies Limited"
                  className={`w-full h-12 px-4 rounded-xl border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors ${
                    errors.legalName ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.legalName && <p className="text-xs text-destructive">{errors.legalName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(err => ({ ...err, email: "" })); }}
                  placeholder="e.g. vendor@acme.com"
                  className={`w-full h-12 px-4 rounded-xl border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors ${
                    errors.email ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contact First Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Contact First Name</label>
                  <input
                    type="text"
                    value={contactFirstName}
                    onChange={(e) => { setContactFirstName(e.target.value); setErrors(err => ({ ...err, contactFirstName: "" })); }}
                    placeholder="e.g. Jane"
                    className={`w-full h-12 px-4 rounded-xl border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors ${
                      errors.contactFirstName ? "border-destructive" : "border-border"
                    }`}
                  />
                  {errors.contactFirstName && <p className="text-xs text-destructive">{errors.contactFirstName}</p>}
                </div>

                {/* Contact Last Name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Contact Last Name</label>
                  <input
                    type="text"
                    value={contactLastName}
                    onChange={(e) => { setContactLastName(e.target.value); setErrors(err => ({ ...err, contactLastName: "" })); }}
                    placeholder="e.g. Doe"
                    className={`w-full h-12 px-4 rounded-xl border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors ${
                      errors.contactLastName ? "border-destructive" : "border-border"
                    }`}
                  />
                  {errors.contactLastName && <p className="text-xs text-destructive">{errors.contactLastName}</p>}
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1.5" ref={countryRef}>
                <label className="text-sm font-medium text-foreground">Country</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCountryOpen(v => !v)}
                    className={`w-full h-12 px-4 rounded-xl border text-sm text-left flex items-center justify-between transition-colors border-border hover:border-border/80 text-foreground`}
                  >
                    {country}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${countryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {countryOpen && (
                    <div className="absolute left-0 right-0 top-13 z-50 bg-white border border-border rounded-xl shadow-lg overflow-y-auto max-h-64 mt-1">
                      {SUPPORTED_COUNTRIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleCountryChange(c)}
                          className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/40 transition-colors border-b last:border-0 border-border/50"
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
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors(err => ({ ...err, phone: "" })); }}
                  placeholder="e.g. +2348000000000"
                  className={`w-full h-12 px-4 rounded-xl border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors ${
                    errors.phone ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Primary stationery vendor"
                  rows={3}
                  className="w-full p-4 rounded-xl border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-8 w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
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

  return (
    <div className="space-y-4 mt-4">
      {/* Search + Filter row */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button className="h-10 px-4 rounded-xl border border-border bg-white text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filter
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <VendorEmptyState filtered={vendors.length > 0} />
      ) : (
        <div className="rounded-xl border border-border overflow-visible">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {["VENDOR NAME", "REG NO.", "EMAIL", "INVITED ON", "STATUS", "LAST UPDATED", "ACTION"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedData.map((v) => (
                <tr key={v.id} onClick={() => onAction(v, "View Details")} className="hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-4 py-4 font-semibold text-foreground">{v.vendorName}</td>
                  <td className="px-4 py-4 text-muted-foreground">{v.regNo}</td>
                  <td className="px-4 py-4 text-muted-foreground">{v.email}</td>
                  <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{v.invitedOn}</td>
                  <td className="px-4 py-4"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{v.lastUpdated}</td>
                  <td className="px-4 py-4">
                    <ActionMenu vendor={v} onAction={onAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination row */}
          <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
            <span>Showing {paginatedData.length} entries on page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentPage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/60 text-muted-foreground"
                }`}
              >
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-lg transition-colors bg-primary text-primary-foreground font-semibold">
                {currentPage}
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/60 text-muted-foreground"
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
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    router.replace(`?${params.toString()}`, { scroll: false });
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
      icon: <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0 bg-[#384A57]"><Users className="w-4 h-4" /></div>,
      subtitle: <span className="text-xs leading-[125%]">All vendors added</span>,
    },
    {
      title: "Approved Vendors",
      value: stats.verified.toString(),
      icon: <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0 bg-[#5A67D8]"><BadgeCheck className="w-4 h-4" /></div>,
      subtitle: <span className="text-xs leading-[125%]">Vendors fully approved</span>,
    },
    {
      title: "Approval Pending",
      value: stats.pending.toString(),
      icon: <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0 bg-[#F45B69]"><Clock className="w-4 h-4" /></div>,
      subtitle: <span className="text-xs leading-[125%]">Vendors who submitted onboarding</span>,
    },
    {
      title: "Rejected Vendors",
      value: stats.rejected.toString(),
      icon: <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0 bg-[#38B2AC]"><XCircle className="w-4 h-4" /></div>,
      subtitle: <span className="text-xs leading-[125%]">Total number of vendors rejected</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <InviteVendorModal open={showInviteModal} onClose={() => setShowInviteModal(false)} onSuccess={() => fetchVendors()} />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {statCards.map((s) => (
          <StatsCard
            key={s.title}
            isLoading={isLoading}
            title={s.title}
            value={s.value}
            icon={s.icon}
            subtitle={s.subtitle}
          />
        ))}
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 h-auto rounded-lg">
          <TabsTrigger value="all"          className="data-[state=active]:bg-background rounded-md px-5">All Vendors</TabsTrigger>
          <TabsTrigger value="verified"     className="data-[state=active]:bg-background rounded-md px-5">Approved</TabsTrigger>
          <TabsTrigger value="invited"      className="data-[state=active]:bg-background rounded-md px-5">Invited</TabsTrigger>
          <TabsTrigger value="under_review" className="data-[state=active]:bg-background rounded-md px-5">Pending</TabsTrigger>
          <TabsTrigger value="rejected"     className="data-[state=active]:bg-background rounded-md px-5">Rejected</TabsTrigger>
        </TabsList>

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