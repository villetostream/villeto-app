"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pencil, Camera, Trash2, Loader2, CheckCircle2, Users, ShieldCheck } from "lucide-react";
import { HugeiconsIcon } from '@hugeicons/react';
import { CreditCardIcon, Invoice04Icon, Store01Icon, ShoppingCart01Icon, Invoice03Icon } from '@hugeicons/core-free-icons';
import { useAuthStore } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProcurementPageHeader, ProcurementSection, ProcurementWorkspaceHeader, ProcurementMetric } from "@/components/procurement/ProcurementWorkspace";
import { UserProfileModal } from "@/components/dashboard/people/modals/UserProfileModal";
import { useUpdateCompanyDetailsApi } from "@/queries/companies/update-company-details";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { getCurrencyConfig } from "@/lib/utils/currency";
import { asArray, asRecord, getNumber, getOptionalString, getString, pickString } from "@/lib/types/api-error";

function parseCompanyData(value: unknown): CompanyData {
  const record = asRecord(value);
  const spendLimitRaw = asRecord(record.spendLimit);
  const spendLimit =
    typeof spendLimitRaw.lower === "number" && typeof spendLimitRaw.upper === "number"
      ? { lower: spendLimitRaw.lower, upper: spendLimitRaw.upper }
      : undefined;
  return {
    companyId: getOptionalString(record.companyId),
    companyName: getOptionalString(record.companyName),
    businessName: getOptionalString(record.businessName),
    countryOfRegistration: getOptionalString(record.countryOfRegistration),
    contactPhone: getOptionalString(record.contactPhone),
    contactNumber: getOptionalString(record.contactNumber),
    website: getOptionalString(record.website),
    websiteUrl: getOptionalString(record.websiteUrl),
    industry: getOptionalString(record.industry),
    companySize: getOptionalString(record.companySize),
    logo: getOptionalString(record.logo),
    logoUrl: getOptionalString(record.logoUrl),
    bankStatus: getOptionalString(record.bankStatus),
    primaryCurrency: getOptionalString(record.primaryCurrency),
    currency: getOptionalString(record.currency),
    spendLimit,
    expectedMonthlySpend: getOptionalString(record.expectedMonthlySpend),
    accountType: getOptionalString(record.accountType),
    productModules: asArray(record.productModules).map(v => getString(v)).filter(Boolean),
    status: getOptionalString(record.status),
    address: getOptionalString(record.address),
    registrationId: getOptionalString(record.registrationId),
    taxId: getOptionalString(record.taxId),
  };
}

function parseAdminEntry(value: unknown): AdminEntry | null {
  const record = asRecord(value);
  const userId = getOptionalString(record.userId);
  if (!userId) return null;
  const villetoRoleRaw = asRecord(record.villetoRole);
  return {
    userId,
    firstName: getString(record.firstName),
    lastName: getString(record.lastName),
    position: getOptionalString(record.position),
    villetoRole: pickString(villetoRoleRaw, "name") ? { name: pickString(villetoRoleRaw, "name") } : undefined,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
}

// ─── Notification toggle row ──────────────────────────────────────────────────
function NotifRow({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3 border-b border-black/[0.06] last:border-0">
      <span className="text-[13px] text-[#0b100e]">{label}</span>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}

// ─── Nigerian banks list ──────────────────────────────────────────────────────
const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];

// ─── Bank Details Modal ───────────────────────────────────────────────────────
function BankDetailsModal({
  open,
  onClose,
  onConfirm,
  accountHolderName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (bankName: string, accountNumber: string) => void;
  accountHolderName?: string;
}) {
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const handleConfirm = () => {
    if (!bankName || !accountNumber) return;
    onConfirm(bankName, accountNumber);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4 z-10">
        <h2 className="text-lg font-semibold text-foreground mb-6">Bank Details</h2>

        {/* Bank Name */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-foreground mb-2">Bank Name</label>
          <Select value={bankName} onValueChange={setBankName}>
            <SelectTrigger className="h-11 border-border bg-white text-sm">
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_BANKS.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Account Number */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-foreground mb-2">Account Number</label>
          <Input
            value={accountNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              setAccountNumber(val);
            }}
            placeholder="Enter your 10 digits"
            className={cn(
              "h-11 border-border text-sm",
              accountNumber.length === 10 ? "border-primary" : ""
            )}
            maxLength={10}
          />
          {/* Account holder name preview */}
          {accountNumber.length === 10 && accountHolderName && (
            <p className="text-sm font-medium text-primary mt-1.5">{accountHolderName}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!bankName || accountNumber.length < 10}
            className="bg-primary text-white hover:bg-primary/90 h-10 px-6 text-sm disabled:opacity-50"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── My Profile tab ───────────────────────────────────────────────────────────
function MyProfileTab() {
  const user = useAuthStore((s) => s.user);
  const axios = useAxios();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Bank details state
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankDetails, setBankDetails] = useState<{ bankName: string; accountNumber: string } | null>(null);

  const [form, setForm] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
  });

  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        setForm({
          firstName: user.firstName || "",
          lastName: String(user.lastName || ""),
          email: user.email || "",
          phone: String(user.phone || ""),
          country: user.company?.countryOfRegistration || "",
          city: "",
        });
      });
    }
  }, [user?.userId]); // Use userId to prevent form reset on object reference changes

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.patch(API_KEYS.USER.ME, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        city: form.city,
      });
      toast.success("Profile updated successfully");
      notifySetupGuide("account-details");
      setIsEditing(false);
    } catch (err) {
      logger.error("Profile update error:", err);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBankConfirm = (bankName: string, accountNumber: string) => {
    setBankDetails({ bankName, accountNumber });
    toast.success("Bank details updated successfully");
    notifySetupGuide("account-details");
  };

  const accountHolderName = `${form.firstName} ${form.lastName}`.trim() || user?.email;
  const roleName = String(user?.villetoRole?.name || user?.position || "—");
  const formattedRole = roleName !== "—" ? roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase().replace(/_/g, ' ') : "—";

  return (
    <div className="space-y-5" data-tour="account-details-section">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProcurementMetric 
          label="Active Profile" 
          value={user?.firstName || "—"} 
          detail={user?.email || "—"} 
          icon={<CheckCircle2 className="size-4" />} 
          tone="teal" 
        />
        <ProcurementMetric 
          label="Role" 
          value={formattedRole} 
          detail={user?.jobTitle || user?.position || "No title"} 
          icon={<ShieldCheck className="size-4" />} 
          tone="blue" 
        />
        <ProcurementMetric 
          label="Account Status" 
          value="Active" 
          detail="Good standing" 
          icon={<CheckCircle2 className="size-4" />} 
          tone="amber" 
        />
        <ProcurementMetric 
          label="Last Active" 
          value="Just now" 
          detail="Online" 
          icon={<CheckCircle2 className="size-4" />} 
          tone="rose" 
        />
      </div>

      <ProcurementSection 
        title="Personal Details"
        description="Manage your profile information and contact details."
        action={!isEditing ? { label: "Edit details", onClick: () => setIsEditing(true) } : undefined}
      >
        <div className="p-5">
          {isEditing && (
            <div className="flex items-center justify-end gap-2 mb-6 border-b border-black/[0.04] pb-5">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="h-8 px-4 text-[12px] font-medium text-[#68726d] border-black/[0.12] rounded-[8px] hover:bg-[#f9faf9]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#087f70] text-white hover:bg-[#076b5e] h-8 px-4 text-[12px] font-semibold rounded-[8px]"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null} 
                Save Changes
              </Button>
            </div>
          )}

          {/* Avatar */}
          <div className="mb-6 relative w-20">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[#f9faf9] border border-black/[0.08]">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-[#087f70] bg-[#f0faf8]">
                  {(user?.firstName?.[0] || "U").toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-[#087f70] flex items-center justify-center border-2 border-white transition-transform hover:scale-105"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">First Name</p>
              {isEditing ? (
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="h-9 text-[13px] border-black/[0.12] bg-[#f9faf9] rounded-[8px]"
                />
              ) : (
                <p className="text-[13px] font-semibold text-[#0b100e]">{form.firstName || "—"}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Last Name</p>
              {isEditing ? (
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="h-9 text-[13px] border-black/[0.12] bg-[#f9faf9] rounded-[8px]"
                />
              ) : (
                <p className="text-[13px] font-semibold text-[#0b100e]">{form.lastName || "—"}</p>
              )}
            </div>
            <div className="space-y-1 lg:col-span-1 sm:col-span-2">
              <p className="text-[11px] font-medium text-[#84908a]">Email Address</p>
              <p className="text-[13px] font-semibold text-[#0b100e]">{form.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Country</p>
              <p className="text-[13px] font-semibold text-[#0b100e]">{form.country || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">City</p>
              {isEditing ? (
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-9 text-[13px] border-black/[0.12] bg-[#f9faf9] rounded-[8px]"
                />
              ) : (
                <p className="text-[13px] font-semibold text-[#0b100e]">{form.city || "—"}</p>
              )}
            </div>
            
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 border-t border-black/[0.04] pt-4 mt-2 mb-1" />
            
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Position</p>
              <p className="text-[13px] font-semibold text-[#0b100e]">{user?.position || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Job Title</p>
              <p className="text-[13px] font-semibold text-[#0b100e]">{user?.jobTitle || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Employment Type</p>
              <p className="text-[13px] font-semibold text-[#0b100e] capitalize">{user?.employmentType?.replaceAll("_", " ").toLowerCase() || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-[#84908a]">Last Active</p>
              <p className="text-[13px] font-semibold text-[#0b100e]">{user?.lastLoginAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.lastLoginAt)) : "—"}</p>
            </div>
          </div>
        </div>
      </ProcurementSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ProcurementSection 
          title="Bank Details"
          description="Used for expense reimbursements"
          action={{ label: "Update details", onClick: () => setBankModalOpen(true) }}
        >
          <div className="p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-[#84908a]">Account Number</p>
                <p className="text-[13px] font-semibold text-[#0b100e]">{bankDetails?.accountNumber || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-[#84908a]">Bank Name</p>
                <p className="text-[13px] font-semibold text-[#0b100e]">{bankDetails?.bankName || "—"}</p>
              </div>
            </div>
          </div>
        </ProcurementSection>

        <ProcurementSection 
          title="Account Management"
          description="Permanent actions"
        >
          <div className="p-5">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-4 h-4 rounded-full border border-[#d33d44]/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-[#d33d44] font-bold">i</span>
              </div>
              <p className="text-[12px] text-[#68726d]">
                After making a deletion request, you will have 1 month to recover your account.
              </p>
            </div>
            <button className="flex items-center gap-2 text-[12px] text-[#d33d44] font-semibold border border-[#d33d44]/30 rounded-[8px] px-4 py-2 hover:bg-[#fff5f5] transition-colors mt-4">
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </button>
          </div>
        </ProcurementSection>
      </div>

      <BankDetailsModal
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onConfirm={handleBankConfirm}
        accountHolderName={accountHolderName}
      />
    </div>
  );
}

// ─── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <ProcurementSection 
        title="Email Notifications"
        description="Updates sent directly to your inbox"
      >
        <div className="p-5">
          <NotifRow label="Expense submissions" defaultOn />
          <NotifRow label="Approval updates" defaultOn />
          <NotifRow label="Card transactions" />
          <NotifRow label="Monthly reports" defaultOn />
          <NotifRow label="Policy violation alerts" defaultOn />
        </div>
      </ProcurementSection>
      
      <ProcurementSection 
        title="In-App Notifications"
        description="Alerts shown while you are actively using Villeto"
      >
        <div className="p-5">
          <NotifRow label="Card alerts" defaultOn />
          <NotifRow label="Spending limit warnings" defaultOn />
          <NotifRow label="Pending approvals" defaultOn />
          <NotifRow label="Submission reminders" />
          <NotifRow label="Team activity" />
        </div>
      </ProcurementSection>
    </div>
  );
}

// ─── Company Profile tab (full inline content — same data as company-settings page) ──
interface CompanyData {
  companyId?: string;
  companyName?: string;
  businessName?: string;
  countryOfRegistration?: string;
  contactPhone?: string;
  contactNumber?: string;
  website?: string;
  websiteUrl?: string;
  industry?: string;
  companySize?: string;
  logo?: string;
  logoUrl?: string;
  bankStatus?: string;
  primaryCurrency?: string;
  currency?: string;
  spendLimit?: {
    lower: number;
    upper: number;
  };
  expectedMonthlySpend?: string;
  accountType?: string;
  productModules?: string[];
  status?: string;
  address?: string;
  registrationId?: string;
  taxId?: string;
}

interface AdminEntry {
  userId: string;
  firstName: string;
  lastName: string;
  position?: string;
  villetoRole?: { name: string };
}

function LogoUploader({
  currentLogo,
  companyName,
  onLogoChange,
}: {
  currentLogo?: string;
  companyName?: string;
  onLogoChange: (file: File, preview: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onLogoChange(file, reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="relative w-24 h-24 group cursor-pointer flex-shrink-0" onClick={() => inputRef.current?.click()}>
      <div className="w-24 h-24 rounded-full border border-border overflow-hidden bg-muted/30 flex items-center justify-center relative">
        {currentLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentLogo} alt="Company logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-bold text-primary">
            {(companyName || "V").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="absolute bottom-0 w-full h-7 bg-primary/90 flex items-center justify-center transition-opacity hover:bg-primary">
          <Pencil className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  isEditing, 
  onChange, 
  renderEdit,
  disabled 
}: { 
  label: string; 
  value?: string; 
  isEditing?: boolean; 
  onChange?: (v: string) => void; 
  renderEdit?: () => React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[#84908a]">{label}</p>
      {isEditing && !disabled ? (
        renderEdit ? renderEdit() : (
          <Input 
            value={value || ""} 
            onChange={(e) => onChange?.(e.target.value)}
            className="h-8 text-[13px] bg-[#f9faf9] border-black/[0.12] rounded-[6px]"
          />
        )
      ) : (
        <p className={cn("text-[13px] font-semibold text-[#0b100e]", !value && "text-[#84908a] font-medium")}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

function AdminAvatar({ admin }: { admin: AdminEntry }) {
  const first = admin.firstName?.[0] || "";
  const last = admin.lastName ? admin.lastName.toString()[0] : "";
  const initials = `${first}${last}`.toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
      {initials}
    </div>
  );
}

function CompanyProfileTab() {
  const user = useAuthStore((s) => s.user);
  const onboarding = useOnboardingStore();
  const axios = useAxios();
  const router = useRouter();
  const updateCompany = useUpdateCompanyDetailsApi();

  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [realCompanySize, setRealCompanySize] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Edit states
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingFinancials, setIsEditingFinancials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [infoForm, setInfoForm] = useState({
    businessName: "",
    country: "",
    phone: "",
    website: "",
    industry: ""
  });

  const [financialsForm, setFinancialsForm] = useState({
    spendIndex: 0,
    currency: ""
  });

  const spendIndexToLimits = (country: string, index: number) => {
    const config = getCurrencyConfig(country || "NGA");
    const range = config.spendingRanges[index] || config.spendingRanges[0];
    return { lower: range.lower, upper: range.upper };
  };

  const companyId =
    getOptionalString(user?.companyId) ||
    getOptionalString(asRecord(user?.company).companyId) ||
    getOptionalString(asRecord(user?.company).id);

  useEffect(() => {
    const storeLogo = getOptionalString(user?.company?.logoUrl) ?? getOptionalString(user?.company?.logo);
    if (storeLogo) {
      queueMicrotask(() => setLogoPreview(storeLogo));
    }
  }, [user?.company?.logoUrl, user?.company?.logo]);

  useEffect(() => {
    if (!user?.userId) return;
    if (!companyId) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const results = await Promise.allSettled([
          axios.get(API_KEYS.COMPANY.COMPANY_DETAILS(companyId)),
          axios.get(API_KEYS.USER.USERS),
        ]);

        const compResult = results[0];
        const usersResult = results[1];

        let companyPayload: CompanyData = parseCompanyData(user?.company);
        if (compResult.status === 'fulfilled' && compResult.value?.data) {
          const resp = compResult.value.data;
          const respRecord = asRecord(resp);
          companyPayload = parseCompanyData(respRecord.data ? asRecord(respRecord.data).company ?? respRecord.data : resp);
        }
        setCompanyData(companyPayload);
        
        const fetchedLogo =
          companyPayload.logoUrl ||
          companyPayload.logo ||
          getOptionalString(user?.company?.logoUrl) ||
          getOptionalString(user?.company?.logo);
        if (fetchedLogo) setLogoPreview(fetchedLogo);

        if (usersResult.status === 'fulfilled' && usersResult.value?.data) {
          const usersData = usersResult.value.data;
          const usersDataRecord = asRecord(usersData);
          const nested = asRecord(usersDataRecord.data);
          const allUsersResponse = asArray(
            Array.isArray(usersData) ? usersData : nested.data ?? usersDataRecord.data
          );
          
          const meta = asRecord(usersDataRecord.meta ?? asRecord(usersDataRecord.data).meta);
          const totalCount = getNumber(meta.totalCount, allUsersResponse.length);
          setRealCompanySize(totalCount.toString());

          const filteredAdmins = allUsersResponse
              .map(parseAdminEntry)
              .filter((entry): entry is AdminEntry => entry !== null)
              .filter((u) => {
                const role = u.villetoRole?.name?.toUpperCase() || u.position?.toUpperCase() || "";
                return role !== "EMPLOYEE" && role !== "";
              })
              .slice(0, 6);
          setAdmins(filteredAdmins);

          const currentCountryCode = companyPayload.countryOfRegistration || user?.company?.countryOfRegistration || onboarding?.businessSnapshot?.countryOfRegistration || "NGA";
          const config = getCurrencyConfig(currentCountryCode);
          
          let spendIdx = 0;
          if (companyPayload.spendLimit?.lower !== undefined) {
             const idx = config.spendingRanges.findIndex(r => r.lower === companyPayload.spendLimit?.lower);
             if (idx >= 0) spendIdx = idx;
          } else if (onboarding?.monthlySpend !== undefined) {
             spendIdx = onboarding.monthlySpend;
          }

          setInfoForm({
            businessName: companyPayload.companyName || companyPayload.businessName || getOptionalString(user?.company?.companyName) || onboarding?.businessSnapshot?.businessName || "",
            country: currentCountryCode,
            phone: companyPayload.contactPhone || companyPayload.contactNumber || getOptionalString(user?.company?.phone) || onboarding?.businessSnapshot?.contactNumber || "",
            website: companyPayload.website || companyPayload.websiteUrl || getOptionalString(user?.company?.website) || onboarding?.businessSnapshot?.website || "",
            industry: companyPayload.industry || getOptionalString(user?.company?.industry) || "",
          });

          setFinancialsForm({
            spendIndex: spendIdx,
            currency: companyPayload.primaryCurrency || companyPayload.currency || getOptionalString(user?.company?.currency) || config.code || "",
          });

        } else {
          setRealCompanySize("—");
        }
      } catch (err) {
        logger.error("Error fetching company data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    queueMicrotask(() => {
      void fetchData();
    });
  }, [
    user?.userId, 
    companyId, 
    axios, 
    onboarding?.businessSnapshot?.businessName, 
    onboarding?.businessSnapshot?.contactNumber, 
    onboarding?.businessSnapshot?.countryOfRegistration, 
    onboarding?.businessSnapshot?.website, 
    onboarding?.monthlySpend
  ]);

  const handleSaveInfo = async () => {
    setIsSaving(true);
    try {
      await updateCompany.mutateAsync({
        companyName: infoForm.businessName,
        countryOfRegistration: infoForm.country,
        contactPhone: infoForm.phone,
        websiteUrl: infoForm.website,
        industry: infoForm.industry
      });
      toast.success("Company information updated");
      setIsEditingInfo(false);
    } catch (_err) {
      toast.error("Failed to update company information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFinancials = async () => {
    setIsSaving(true);
    try {
      const limits = spendIndexToLimits(infoForm.country, financialsForm.spendIndex);
      await updateCompany.mutateAsync({
        spendLimit: limits,
        primaryCurrency: financialsForm.currency
      });
      toast.success("Financial details updated");
      setIsEditingFinancials(false);
    } catch (_err) {
      toast.error("Failed to update financial details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (file: File, preview: string) => {
    setPendingLogoFile(file);
    setLogoPreview(preview);
  };

  const handleSaveLogo = async () => {
    if (!pendingLogoFile) return;
    setIsSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingLogoFile, pendingLogoFile.name);
      await axios.post(API_KEYS.COMPANY.LOGO, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Company logo updated successfully");
      setPendingLogoFile(null);
      if (user?.companyId) {
        const res = await axios.get(API_KEYS.COMPANY.COMPANY_DETAILS(user.companyId));
        const updated = parseCompanyData(res?.data?.data ?? res?.data);
        if (updated.logo) setLogoPreview(updated.logo);
      }
    } catch (err: unknown) {
      logger.error("Logo update error:", err);
      toast.info("Logo saved locally. Backend update will be available soon.");
      setPendingLogoFile(null);
    } finally {
      setIsSavingLogo(false);
    }
  };

  const filledFields = [
    companyData?.companyName, companyData?.countryOfRegistration,
    companyData?.contactPhone, companyData?.website,
    companyData?.industry, companyData?.logo || logoPreview,
    companyData?.expectedMonthlySpend,
  ].filter(Boolean).length;
  const completionPct = Math.round((filledFields / 7) * 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#087f70]" />
      </div>
    );
  }

  const LOCATION_MAP: Record<string, string> = { NGA: "Nigeria", GHA: "Ghana", KEN: "Kenya", ZAF: "South Africa" };
  const userCompany = asRecord(user?.company);
  const businessName = companyData?.companyName || companyData?.businessName || getString(userCompany.companyName) || getString(userCompany.businessName) || onboarding?.businessSnapshot?.businessName || "Company Details";
  const rawLocation = companyData?.countryOfRegistration || getString(userCompany.countryOfRegistration) || onboarding?.businessSnapshot?.countryOfRegistration || "";
  const location = LOCATION_MAP[rawLocation] || rawLocation || "—";
  
  const phone = companyData?.contactPhone || companyData?.contactNumber || getString(userCompany.phone) || getString(userCompany.contactNumber) || onboarding?.businessSnapshot?.contactNumber || "—";
  const website = companyData?.website || companyData?.websiteUrl || getString(userCompany.website) || getString(userCompany.websiteUrl) || onboarding?.businessSnapshot?.website || "—";
  const industry = companyData?.industry || getString(userCompany.industry) || "—";

  const config = getCurrencyConfig(rawLocation || "NGA");
  
  let expectedSpend = "—";
  if (companyData?.spendLimit?.lower !== undefined) {
    const range = config.spendingRanges.find((r) => r.lower === companyData.spendLimit?.lower);
    if (range) expectedSpend = range.label;
    else expectedSpend = `${config.symbol}${companyData.spendLimit.lower} - ${config.symbol}${companyData.spendLimit.upper}`;
  } else if (companyData?.expectedMonthlySpend) {
    // Backend expectedMonthlySpend could be populated
    expectedSpend = companyData.expectedMonthlySpend;
  } else if (onboarding?.monthlySpend !== undefined && onboarding?.monthlySpend >= 0) {
    const range = config.spendingRanges[onboarding.monthlySpend];
    if (range) expectedSpend = range.label;
    else expectedSpend = onboarding.spendRange || "—";
  } else if (onboarding?.spendRange) {
    expectedSpend = onboarding.spendRange;
  }

  const actCurrencyCode =
    companyData?.primaryCurrency ||
    companyData?.currency ||
    getOptionalString(user?.company?.currency) ||
    config.code ||
    "—";
  const actCurrencyDisplay = actCurrencyCode !== "—" ? `${config.symbol} ${actCurrencyCode}` : "—";
  const currBankStatus = companyData?.bankStatus || (onboarding?.bankConnected ? "Connected" : "Not connected");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProcurementMetric 
          label="Profile Completion" 
          value={`${completionPct}%`} 
          detail={completionPct === 100 ? "Ready to go" : "Requires attention"} 
          icon={<CheckCircle2 className="size-4" />} 
          tone="amber" 
        />
        <ProcurementMetric 
          label="Team Size" 
          value={realCompanySize || companyData?.companySize || "—"} 
          detail="Active users" 
          icon={<Users className="size-4" />} 
          tone="blue" 
        />
        <ProcurementMetric 
          label="Expected Spend" 
          value={expectedSpend} 
          detail="Monthly limit" 
          icon={<HugeiconsIcon icon={CreditCardIcon} className="size-4" />} 
          tone="teal" 
        />
        <ProcurementMetric 
          label="Bank Status" 
          value={currBankStatus} 
          detail={currBankStatus === "Connected" ? "Active link" : "Not configured"} 
          icon={<HugeiconsIcon icon={Store01Icon} className="size-4" />} 
          tone="rose" 
        />
      </div>

      {/* Header card */}
      <ProcurementSection 
        title="Company Overview"
        action={{ label: "Finish setup", onClick: () => {} }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <LogoUploader 
                currentLogo={logoPreview || undefined} 
                companyName={businessName}
                onLogoChange={handleLogoChange} 
              />
              <div className="flex flex-col min-w-0">
                <h2 className="text-[18px] sm:text-[22px] font-bold text-[#0b100e] leading-none mb-1.5 truncate">{businessName}</h2>
                <p className="text-[13px] text-[#68726d]">{location}</p>
                {pendingLogoFile && (
                  <Button size="sm" onClick={handleSaveLogo} disabled={isSavingLogo}
                    className="mt-3 h-8 px-4 text-[13px] font-semibold bg-[#087f70] text-white hover:bg-[#076b5e] w-fit rounded-[8px]">
                    {isSavingLogo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                    {isSavingLogo ? "Saving..." : "Save Logo"}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-row sm:flex-col sm:text-right sm:min-w-[200px] items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-0 pt-4 sm:pt-0">
              <div className="flex-1 sm:flex-none">
                <p className="text-[13px] font-semibold text-[#0b100e] mb-1">Profile Completion</p>
                <div className="flex items-center gap-2 sm:justify-end mb-0 sm:mb-2">
                  <div className="flex-1 sm:flex-none h-2 bg-[#f0faf8] rounded-full overflow-hidden sm:w-32 border border-black/[0.04]">
                    <div className="h-full bg-[#087f70] rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[#0b100e]">{completionPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProcurementSection>

      {/* Two-column body: single column on mobile, side-by-side on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          <ProcurementSection 
            title="Profile Information"
            action={!isEditingInfo ? { label: "Edit info", onClick: () => setIsEditingInfo(true) } : undefined}
          >
            <div className="p-5">
              {isEditingInfo && (
                <div className="flex gap-2 justify-end mb-6 border-b border-black/[0.04] pb-5">
                  <button onClick={() => setIsEditingInfo(false)} className="px-4 h-8 rounded-[8px] text-[12px] font-medium text-[#68726d] border border-black/[0.12] hover:bg-[#f9faf9]">Cancel</button>
                  <button onClick={handleSaveInfo} disabled={isSaving} className="px-4 h-8 rounded-[8px] text-[12px] font-bold text-white bg-[#087f70] hover:bg-[#076b5e] disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow 
                label="Business Name" 
                value={isEditingInfo ? infoForm.businessName : businessName} 
                isEditing={isEditingInfo}
                onChange={(v) => setInfoForm(p => ({ ...p, businessName: v }))}
              />
              <InfoRow 
                label="Country" 
                value={isEditingInfo ? infoForm.country : location} 
                isEditing={isEditingInfo}
                renderEdit={() => (
                  <Select 
                    value={infoForm.country} 
                    onValueChange={(v) => {
                      setInfoForm(p => ({ ...p, country: v }));
                      const newConfig = getCurrencyConfig(v);
                      setFinancialsForm(p => ({ ...p, currency: newConfig.code }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-full bg-[#f9faf9] border-black/[0.12] rounded-[6px]">
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGA">Nigeria</SelectItem>
                      <SelectItem value="GHA">Ghana</SelectItem>
                      <SelectItem value="KEN">Kenya</SelectItem>
                      <SelectItem value="ZAF">South Africa</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <InfoRow 
                label="Phone Number" 
                value={isEditingInfo ? infoForm.phone : phone} 
                isEditing={isEditingInfo}
                onChange={(v) => setInfoForm(p => ({ ...p, phone: v }))}
              />
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] text-[#84908a]">Website</p>
                {isEditingInfo ? (
                  <InfoRow 
                    label="" 
                    value={infoForm.website} 
                    isEditing={true}
                    onChange={(v) => setInfoForm(p => ({ ...p, website: v }))}
                  />
                ) : (
                  <p className="text-[13px] font-semibold text-[#0b100e] truncate">{website || "—"}</p>
                )}
              </div>
              <InfoRow 
                label="Industry" 
                value={isEditingInfo ? infoForm.industry : industry} 
                isEditing={isEditingInfo}
                onChange={(v) => setInfoForm(p => ({ ...p, industry: v }))}
              />
              <InfoRow 
                label="Company Size" 
                value={realCompanySize || companyData?.companySize} 
                disabled // Read only as requested
              />
              
              <div className="col-span-1 sm:col-span-2 border-t border-black/[0.04] pt-4 mt-2 mb-1" />
              
              <InfoRow 
                label="Account Type" 
                value={companyData?.accountType} 
                disabled 
                renderEdit={() => (
                   <span className="rounded-full bg-[#f0faf8] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#087f70]">
                     {companyData?.accountType || "Enterprise"}
                   </span>
                )}
              />
              <div className="space-y-3 min-w-0 col-span-1 sm:col-span-2 mt-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#84908a]">Product Modules</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {companyData?.productModules?.length ? companyData.productModules.map((m, i) => {
                    const PRODUCT_INFO: Record<string, { title: string, desc: string, icon: any }> = {
                      "CORPORATE_CARDS": { title: "Corporate Cards", desc: "Smart cards with spend controls", icon: CreditCardIcon },
                      "EXPENSE_MANAGEMENT": { title: "Expense Management", desc: "Automated tracking + approvals", icon: Invoice04Icon },
                      "VENDOR_PAYMENTS": { title: "Vendor Payments", desc: "Pay suppliers locally & globally", icon: Store01Icon },
                      "PROCUREMENT": { title: "Procurement", desc: "Control all your purchases in one place", icon: ShoppingCart01Icon },
                      "ACCOUNTS_PAYABLE_RECEIVABLE": { title: "Accounts Payable/Receivable", desc: "Simplify invoices & collections", icon: Invoice03Icon },
                    };
                    const info = PRODUCT_INFO[m] || { 
                      title: m.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()), 
                      desc: "Active module", 
                      icon: Invoice04Icon 
                    };
                    
                    return (
                      <div key={i} className="flex items-center justify-between rounded-[10px] border border-[#0ea894]/40 bg-[#f0faf8] p-4 shadow-[0_4px_16px_rgba(14,168,148,0.04)]">
                        <div className="flex items-center gap-4">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#e7f6f2]">
                            <HugeiconsIcon icon={info.icon} className="size-5 text-[#087f70]" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#0b100e]">{info.title}</p>
                            <p className="mt-0.5 text-[12px] text-[#84908a]">{info.desc}</p>
                          </div>
                        </div>
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[#0ea894] bg-[#0ea894]">
                          <svg className="size-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </div>
                    );
                  }) : (
                    <span className="text-[13px] font-semibold text-[#0b100e]">—</span>
                  )}
                </div>
              </div>
              <InfoRow 
                label="Status" 
                value={companyData?.status} 
                disabled 
                renderEdit={() => (
                   <span className={cn(
                     "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest inline-block",
                     companyData?.status === "active" ? "bg-[#e8f8f5] text-[#087f70]" : "bg-[#f4f7f5] text-[#68726d]"
                   )}>
                     {companyData?.status || "Unknown"}
                   </span>
                )}
              />
              <InfoRow 
                label="Address" 
                value={companyData?.address} 
                disabled 
              />
              <InfoRow 
                label="Registration ID" 
                value={companyData?.registrationId} 
                disabled 
              />
              <InfoRow 
                label="Tax ID" 
                value={companyData?.taxId} 
                disabled 
              />
            </div>
          </div>
          </ProcurementSection>
        </div>

        <div className="space-y-5">
          <ProcurementSection 
            title="Financial Snapshot"
            action={!isEditingFinancials ? { label: "Edit financials", onClick: () => setIsEditingFinancials(true) } : undefined}
          >
            <div className="p-5">
              {isEditingFinancials && (
                <div className="flex gap-2 justify-end mb-6 border-b border-black/[0.04] pb-5">
                  <button onClick={() => setIsEditingFinancials(false)} className="px-4 h-8 rounded-[8px] text-[12px] font-medium text-[#68726d] border border-black/[0.12] hover:bg-[#f9faf9]">Cancel</button>
                  <button onClick={handleSaveFinancials} disabled={isSaving} className="px-4 h-8 rounded-[8px] text-[12px] font-bold text-white bg-[#087f70] hover:bg-[#076b5e] disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-x-8 gap-y-4">
              <InfoRow 
                label="Expected Monthly Spend" 
                value={isEditingFinancials ? config.spendingRanges[financialsForm.spendIndex]?.label : expectedSpend} 
                isEditing={isEditingFinancials}
                renderEdit={() => {
                  const currentConfig = getCurrencyConfig(infoForm.country || "NGA");
                  return (
                    <div className="space-y-4 pt-4 col-span-2">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-[12px] text-[#68726d]">Adjust Range</span>
                         <span className="text-[13px] font-bold text-[#087f70]">{currentConfig.spendingRanges[financialsForm.spendIndex]?.label}</span>
                      </div>
                      <div className="relative h-6 flex items-center">
                        <div className="absolute w-full h-1 bg-[#f0faf8] rounded-full">
                           <div className="h-full bg-[#087f70] rounded-full" style={{ width: `${(financialsForm.spendIndex / 3) * 100}%` }} />
                        </div>
                        <input 
                           type="range" min="0" max="3" step="1" 
                           value={financialsForm.spendIndex} 
                           onChange={(e) => setFinancialsForm(p => ({ ...p, spendIndex: parseInt(e.target.value) }))}
                           className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute w-4 h-4 bg-white border-2 border-[#087f70] rounded-full shadow-sm" 
                             style={{ left: `calc(${(financialsForm.spendIndex / 3) * 100}% - 8px)` }} 
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        {currentConfig.spendingRanges.map((r, i) => (
                           <span key={i} className={cn("text-[10px] cursor-pointer", financialsForm.spendIndex === i ? "text-[#087f70] font-bold" : "text-[#84908a] hover:text-[#087f70]")}
                                 onClick={() => setFinancialsForm(p => ({ ...p, spendIndex: i }))}>
                              {r.label.split(' ')[0]}
                           </span>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <InfoRow 
                label="Primary Currency" 
                value={isEditingFinancials ? financialsForm.currency : actCurrencyDisplay} 
                isEditing={isEditingFinancials}
                renderEdit={() => (
                  <div className="h-8 flex items-center px-3 rounded-[6px] bg-[#f9faf9] border border-black/[0.08] text-[13px] font-medium text-[#68726d]">
                    {financialsForm.currency}
                  </div>
                )}
              />
              <div className="space-y-1">
                <p className="text-[11px] text-[#84908a]">Bank Status</p>
                <span className={cn("inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                  currBankStatus === "Connected" ? "bg-[#e6f7ef] text-[#087f70]" : "bg-[#f9faf9] text-[#84908a]")}>
                  {currBankStatus}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-5 w-full text-[13px] font-semibold h-8 border-[#087f70]/30 text-[#087f70] hover:bg-[#f0faf8] rounded-[8px]">
              Manage connection
            </Button>
            </div>
          </ProcurementSection>

          <ProcurementSection 
            title="Administrators & Owners"
          >
            <div className="p-5">
              {admins.length === 0 ? (
                <p className="text-[13px] text-[#68726d] py-4 text-center">No admins found</p>
              ) : (
            <div className="space-y-3 mb-5">
              {admins.map((admin) => (
                <div key={admin.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AdminAvatar admin={admin} />
                    <div>
                      <p className="text-[13px] font-semibold text-[#0b100e] leading-tight">{admin.firstName} {admin.lastName}</p>
                      <p className="text-[12px] text-[#68726d] capitalize mt-0.5">
                        {((admin.villetoRole?.name || admin.position || "Admin") as string).toLowerCase().replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedAdminId(admin.userId)} className="text-[13px] font-semibold text-[#087f70] hover:text-[#076b5e]">Manage</button>
                </div>
              ))}
            </div>
              )}
              <div className="flex gap-2 pt-4 border-t border-black/[0.04] mt-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px] font-semibold border-black/[0.12] text-[#0b100e] hover:bg-[#f9faf9] rounded-[8px]" onClick={() => router.push("/people")}>
                  Permissions
                </Button>
                <Button size="sm" className="flex-1 h-8 text-[12px] font-semibold bg-white border border-[#087f70]/30 text-[#087f70] hover:bg-[#f0faf8] rounded-[8px]"
                  onClick={() => router.push("/people/invite/leadership")}>
                  Invite Admin
                </Button>
              </div>
            </div>
          </ProcurementSection>

          {selectedAdminId && (
            <UserProfileModal 
              isOpen={!!selectedAdminId} 
              onClose={() => setSelectedAdminId(null)} 
              userId={selectedAdminId} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PersonalSettingsPage() {
  const _user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const router = useRouter();

  const canSeeCompany = useAuthStore((s) => s.can)("user", "manage");

  // Drive active tab from URL ?tab= so the sidebar "Company Settings" link
  // can deep-link here with ?tab=company-profile
  const tabParam = searchParams.get("tab");
  const defaultTab =
    tabParam === "company-profile" && canSeeCompany
      ? "company-profile"
      : tabParam === "notifications"
      ? "notifications"
      : "my-profile";

  const handleTabChange = (value: string) => {
    router.replace(`/settings/personal-settings?tab=${value}`, { scroll: false });
  };

  return (
    <div className="pb-12">
      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-20 bg-[#f4f7f5] -mx-3 px-3 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 -mt-3 pt-5 sm:-mt-5 sm:pt-7 lg:-mt-6 lg:pt-8 pb-4 mb-6 border-b border-transparent shadow-none">
          <div className="max-w-7xl mx-auto">
            <ProcurementPageHeader 
              title="Settings" 
              description="Manage your personal preferences, company details, and notifications."
            />
            <div className="mt-6">
              <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide">
                <TabsTrigger value="my-profile" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-6 text-[13px] font-semibold h-full">
                  My Profile
                </TabsTrigger>
                {canSeeCompany && (
                  <TabsTrigger value="company-profile" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-6 text-[13px] font-semibold h-full">
                    Company Profile
                  </TabsTrigger>
                )}
                <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-6 text-[13px] font-semibold h-full">
                  Notifications
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <TabsContent value="my-profile" className="m-0">
            <MyProfileTab />
          </TabsContent>

          {canSeeCompany && (
            <TabsContent value="company-profile" className="m-0">
              <CompanyProfileTab />
            </TabsContent>
          )}

          <TabsContent value="notifications" className="m-0">
            <NotificationsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}