"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pencil, Camera, Trash2, Loader2 } from "lucide-react";
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
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
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
  }, [user]);

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

  const _Field = ({
    label,
    value,
    field,
    disabled,
    type = "text",
  }: {
    label: string;
    value: string;
    field: keyof ProfileFormData;
    disabled?: boolean;
    type?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {!disabled && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <Input
        type={type}
        value={value}
        disabled={!isEditing || disabled}
        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
        className={cn(
          "bg-muted/30 border-border h-11",
          (!isEditing || disabled) && "opacity-70 cursor-default"
        )}
      />
    </div>
  );

  const accountHolderName = `${form.firstName} ${form.lastName}`.trim() || user?.email;

  return (
    <div className="bg-white rounded-xl border border-border p-6" data-tour="account-details-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-foreground">My Profile Details</h2>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-primary text-white hover:bg-primary/90 h-9 px-4 gap-2 text-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white hover:bg-primary/90 h-9 px-4 text-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="mb-8 relative w-20">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border border-border">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground bg-gradient-to-br from-primary/20 to-primary/10">
              {(user?.firstName?.[0] || "U").toUpperCase()}
            </div>
          )}
        </div>
        <button
          onClick={() => avatarInputRef.current?.click()}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-white"
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Personal Details + Bank Details side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        {/* Personal Details Card */}
        <div className="border border-border rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-5">Personal Details</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">First Name</p>
              {isEditing ? (
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="h-10 text-sm border-border bg-muted/30"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{form.firstName || "—"}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Name</p>
              {isEditing ? (
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="h-10 text-sm border-border bg-muted/30"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{form.lastName || "—"}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-muted-foreground">Email Address</p>
              <p className="text-sm font-medium text-foreground">{form.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Country</p>
              <p className="text-sm font-medium text-foreground">{form.country || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">City</p>
              {isEditing ? (
                <Input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-10 text-sm border-border bg-muted/30"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">{form.city || "—"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="border border-border rounded-xl p-5 min-w-[280px]">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-5">Bank Details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Account Number</p>
              <p className="text-sm font-medium text-foreground">{bankDetails?.accountNumber || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Bank Name</p>
              <p className="text-sm font-medium text-foreground">{bankDetails?.bankName || "-"}</p>
            </div>
          </div>
          <Button
            onClick={() => setBankModalOpen(true)}
            data-tour="update-details-button"
            className="bg-primary text-white hover:bg-primary/90 h-10 px-5 text-sm"
          >
            Update Details
          </Button>
        </div>
      </div>

      {/* Delete Account */}
      <div className="mt-6 rounded-xl bg-muted/30 border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Delete Account</h3>
        <div className="flex items-start gap-2 mb-3">
          <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs text-muted-foreground font-bold">i</span>
          </div>
          <p className="text-xs text-muted-foreground">
            After making a deletion request, you will have 1 month to recover your account.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          To permanently delete your Villeto account, click the button below. You cannot reverse this action.
        </p>
        <button className="flex items-center gap-2 text-sm text-red-500 font-medium border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Bank Details Modal */}
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
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-base font-semibold text-foreground mb-6">Notification Preferences</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Email Notifications</h3>
          <NotifRow label="Expense submissions" defaultOn />
          <NotifRow label="Approval updates" defaultOn />
          <NotifRow label="Card transactions" />
          <NotifRow label="Monthly reports" defaultOn />
          <NotifRow label="Policy violation alerts" defaultOn />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">In-App Notifications</h3>
          <NotifRow label="Card alerts" defaultOn />
          <NotifRow label="Spending limit warnings" defaultOn />
          <NotifRow label="Pending approvals" defaultOn />
          <NotifRow label="Submission reminders" />
          <NotifRow label="Team activity" />
        </div>
      </div>
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
      <p className="text-xs text-muted-foreground">{label}</p>
      {isEditing && !disabled ? (
        renderEdit ? renderEdit() : (
          <Input 
            value={value || ""} 
            onChange={(e) => onChange?.(e.target.value)}
            className="h-8 text-sm bg-gray-50 border-gray-200"
          />
        )
      ) : (
        <p className={cn("text-sm font-medium text-foreground", !value && "text-muted-foreground")}>
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
  }, [user]);

  useEffect(() => {
    if (!user) return;
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
  }, [user, companyId, axios, onboarding?.businessSnapshot?.businessName, onboarding?.businessSnapshot?.contactNumber, onboarding?.businessSnapshot?.countryOfRegistration, onboarding?.businessSnapshot?.website, onboarding?.monthlySpend]);

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
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
    <div className="space-y-4 pt-2">
      <div className="flex items-center">
         <h1 className="text-xl font-bold text-foreground">Company Details</h1>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-border px-8 py-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <LogoUploader 
              currentLogo={logoPreview || undefined} 
              companyName={businessName}
              onLogoChange={handleLogoChange} 
            />
            <div className="flex flex-col">
              <h2 className="text-[22px] font-bold text-foreground leading-none mb-2">{businessName}</h2>
              <p className="text-sm text-muted-foreground">{location}</p>
              {pendingLogoFile && (
                <Button size="sm" onClick={handleSaveLogo} disabled={isSavingLogo}
                  className="mt-3 h-8 px-4 text-xs bg-primary text-white hover:bg-primary/90 w-fit">
                  {isSavingLogo ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                  {isSavingLogo ? "Saving..." : "Save Logo"}
                </Button>
              )}
            </div>
          </div>
          <div className="text-right min-w-[200px] flex flex-col justify-center h-full">
            <p className="text-sm font-medium text-foreground mb-1">Profile Completion</p>
            <div className="flex items-center gap-2 justify-end mb-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-32">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-xs font-semibold text-foreground">{completionPct}%</span>
            </div>
            <Button size="sm" className="h-8 px-4 text-xs bg-foreground text-white hover:bg-foreground/90 rounded-lg">
              Finish setup
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Profile Information</h2>
              {!isEditingInfo ? (
                <button 
                  onClick={() => setIsEditingInfo(true)}
                  className="text-primary hover:text-primary/80 transition-colors cursor-pointer p-1 rounded-md hover:bg-primary/5"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingInfo(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleSaveInfo} disabled={isSaving} className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
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
                    <SelectTrigger className="h-8 w-full bg-gray-50 border-gray-200">
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
              <InfoRow 
                label="Website" 
                value={isEditingInfo ? infoForm.website : website} 
                isEditing={isEditingInfo}
                onChange={(v) => setInfoForm(p => ({ ...p, website: v }))}
              />
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
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Financial Snapshot</h2>
              {!isEditingFinancials ? (
                <button 
                  onClick={() => setIsEditingFinancials(true)}
                  className="text-primary hover:text-primary/80 transition-colors cursor-pointer p-1 rounded-md hover:bg-primary/5"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingFinancials(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                  <button onClick={handleSaveFinancials} disabled={isSaving} className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50">
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow 
                label="Expected Monthly Spend" 
                value={isEditingFinancials ? config.spendingRanges[financialsForm.spendIndex]?.label : expectedSpend} 
                isEditing={isEditingFinancials}
                renderEdit={() => {
                  const currentConfig = getCurrencyConfig(infoForm.country || "NGA");
                  return (
                    <div className="space-y-4 pt-4 col-span-2">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-xs text-muted-foreground">Adjust Range</span>
                         <span className="text-sm font-bold text-primary">{currentConfig.spendingRanges[financialsForm.spendIndex]?.label}</span>
                      </div>
                      <div className="relative h-6 flex items-center">
                        <div className="absolute w-full h-1 bg-muted rounded-full">
                           <div className="h-full bg-primary rounded-full" style={{ width: `${(financialsForm.spendIndex / 3) * 100}%` }} />
                        </div>
                        <input 
                           type="range" min="0" max="3" step="1" 
                           value={financialsForm.spendIndex} 
                           onChange={(e) => setFinancialsForm(p => ({ ...p, spendIndex: parseInt(e.target.value) }))}
                           className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm" 
                             style={{ left: `calc(${(financialsForm.spendIndex / 3) * 100}% - 8px)` }} 
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        {currentConfig.spendingRanges.map((r, i) => (
                           <span key={i} className={cn("text-[10px] cursor-pointer hover:text-primary", financialsForm.spendIndex === i ? "text-primary font-bold" : "text-muted-foreground")}
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
                  <div className="h-8 flex items-center px-3 rounded-md bg-muted/50 border border-border text-sm font-medium text-muted-foreground">
                    {financialsForm.currency}
                  </div>
                )}
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Bank Status</p>
                <span className={cn("inline-block text-xs font-medium px-2.5 py-0.5 rounded-full",
                  currBankStatus === "Connected" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                  {currBankStatus}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 text-xs h-8 border-primary text-primary hover:bg-primary/10">
              Manage connection
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Administrators &amp; Owners</h2>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No admins found</p>
          ) : (
            <div className="space-y-3 mb-5">
              {admins.map((admin) => (
                <div key={admin.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AdminAvatar admin={admin} />
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{admin.firstName} {admin.lastName}</p>
                      <p className="text-[13px] text-muted-foreground capitalize mt-0.5">
                        {((admin.villetoRole?.name || admin.position || "Admin") as string).toLowerCase().replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <button className="text-sm font-medium text-muted-foreground hover:text-foreground">Manage</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => router.push("/people")}>
              View Permission
            </Button>
            <Button size="sm" className="flex-1 h-8 text-xs bg-white border border-primary text-primary hover:bg-primary/10"
              onClick={() => router.push("/people/invite/leadership")}>
              Invite Admin
            </Button>
          </div>
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
    <div className="max-w-5xl mx-auto py-6 px-4">
      <Tabs value={defaultTab} onValueChange={handleTabChange}>
        <TabsList className="bg-muted/50 p-1 h-auto rounded-lg mb-6">
          <TabsTrigger value="my-profile" className="data-[state=active]:bg-background rounded-md px-6">
            My Profile
          </TabsTrigger>
          {canSeeCompany && (
            <TabsTrigger value="company-profile" className="data-[state=active]:bg-background rounded-md px-6">
              Company Profile
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background rounded-md px-6">
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-profile">
          <MyProfileTab />
        </TabsContent>

        {canSeeCompany && (
          <TabsContent value="company-profile">
            <CompanyProfileTab />
          </TabsContent>
        )}

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}