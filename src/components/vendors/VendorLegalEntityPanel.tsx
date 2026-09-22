"use client";

import { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Building2, MapPin, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-stores";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SiteStatus = "active" | "inactive";
type AssignmentPurpose = "purchasing" | "invoicing" | "remit_to";

interface VendorSite {
  vendorSiteId: string;
  code: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateOrProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  legacyAddressText: string | null;
  status: SiteStatus;
  isPrimary: boolean;
  inactivationReason: string | null;
}

interface SiteAssignment {
  vendorEntitySiteAssignmentId: string;
  purpose: AssignmentPurpose;
  status: SiteStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  site: Pick<VendorSite, "vendorSiteId" | "code" | "name" | "status" | "isPrimary"> | null;
}

interface EntityRelationship {
  vendorEntityRelationshipId: string;
  legalEntity: { legalEntityId: string; code: string; legalName: string; displayName: string | null } | null;
  status: "pending" | "approved" | "suspended";
  onboardingStatus: string;
  purchasingEnabled: boolean;
  invoicingEnabled: boolean;
  paymentEnabled: boolean;
  siteAssignments: SiteAssignment[];
}

type SiteDraft = {
  code: string;
  name: string;
  addressLine1: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  countryCode: string;
  isPrimary: boolean;
};

const emptySiteDraft: SiteDraft = {
  code: "",
  name: "",
  addressLine1: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  countryCode: "",
  isPrimary: false,
};

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T };
  return body && typeof body === "object" && "data" in body ? body.data as T : response.data as T;
};

const purposeLabel: Record<AssignmentPurpose, string> = {
  purchasing: "Purchasing",
  invoicing: "Invoicing",
  remit_to: "Remit-to",
};

const statusClass: Record<EntityRelationship["status"], string> = {
  approved: "bg-[#f0faf8] text-[#087f70] border-[#c8eee6]",
  pending: "bg-[#fff9e6] text-[#b27b00] border-[#ffe099]",
  suspended: "bg-[#fdf2f2] text-[#d33d44] border-[#fbd5d5]",
};

function activeAssignment(
  relationship: EntityRelationship,
  purpose: AssignmentPurpose,
) {
  const now = Date.now();
  return relationship.siteAssignments.find((assignment) => {
    const starts = !assignment.effectiveFrom || new Date(assignment.effectiveFrom).getTime() <= now;
    const ends = !assignment.effectiveTo || new Date(assignment.effectiveTo).getTime() > now;
    return assignment.purpose === purpose && assignment.status === "active" && assignment.site?.status === "active" && starts && ends;
  });
}

function purposeState(relationship: EntityRelationship, purpose: AssignmentPurpose) {
  const enabled = {
    purchasing: relationship.purchasingEnabled,
    invoicing: relationship.invoicingEnabled,
    remit_to: relationship.paymentEnabled,
  }[purpose];
  const assignment = activeAssignment(relationship, purpose);

  if (relationship.status !== "approved") return { label: "Approval required", tone: "muted" };
  if (!enabled) return { label: "On hold", tone: "muted" };
  if (!assignment) return { label: "Site required", tone: "warning" };
  return { label: "Ready", tone: "ready" };
}

function SiteDialog({
  open,
  site,
  submitting,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  site: VendorSite | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: SiteDraft) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        {open && <SiteDialogForm key={site?.vendorSiteId || "new"} site={site} submitting={submitting} onClose={() => onOpenChange(false)} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function SiteDialogForm({ site, submitting, onClose, onSave }: { site: VendorSite | null; submitting: boolean; onClose: () => void; onSave: (draft: SiteDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<SiteDraft>(() => site ? {
    code: site.code,
    name: site.name,
    addressLine1: site.addressLine1 || "",
    city: site.city || "",
    stateOrProvince: site.stateOrProvince || "",
    postalCode: site.postalCode || "",
    countryCode: site.countryCode || "",
    isPrimary: site.isPrimary,
  } : emptySiteDraft);
  const update = (field: keyof SiteDraft, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }));

  return <>
    <DialogHeader>
      <DialogTitle>{site ? "Edit vendor site" : "Add vendor site"}</DialogTitle>
      <DialogDescription>Sites belong to this vendor across the company. Assigning a site to a legal entity happens in Phase B.</DialogDescription>
    </DialogHeader>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Site code" required value={draft.code} disabled={Boolean(site)} onChange={(value) => update("code", value.toUpperCase())} placeholder="CHICAGO" />
      <Field label="Site name" required value={draft.name} onChange={(value) => update("name", value)} placeholder="Chicago ordering site" />
      <div className="sm:col-span-2"><Field label="Address" value={draft.addressLine1} onChange={(value) => update("addressLine1", value)} placeholder="123 Main Street" /></div>
      <Field label="City" value={draft.city} onChange={(value) => update("city", value)} placeholder="Chicago" />
      <Field label="State / province" value={draft.stateOrProvince} onChange={(value) => update("stateOrProvince", value)} placeholder="Illinois" />
      <Field label="Postal code" value={draft.postalCode} onChange={(value) => update("postalCode", value)} placeholder="60601" />
      <Field label="Country code" value={draft.countryCode} onChange={(value) => update("countryCode", value.toUpperCase())} placeholder="US" maxLength={2} />
    </div>
    <label className="flex items-center gap-3 rounded-[8px] border border-black/[0.08] p-3 text-[13px] font-medium text-[#0b100e]">
      <input type="checkbox" checked={draft.isPrimary} onChange={(event) => update("isPrimary", event.target.checked)} className="h-4 w-4 accent-[#087f70]" />
      Make this the primary vendor site
    </label>
    <DialogFooter>
      <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button>
      <button type="button" disabled={submitting || !draft.code.trim() || !draft.name.trim()} onClick={() => void onSave(draft)} className="h-10 rounded-[8px] bg-[#087f70] px-4 text-[13px] font-semibold text-white hover:bg-[#076b5e] disabled:opacity-50">
        {submitting ? "Saving..." : site ? "Save site" : "Add site"}
      </button>
    </DialogFooter>
  </>;
}

function Field({ label, required, value, disabled, onChange, placeholder, maxLength }: {
  label: string; required?: boolean; value: string; disabled?: boolean; onChange: (value: string) => void; placeholder?: string; maxLength?: number;
}) {
  return <label className="block text-[12px] font-semibold text-[#39423e]">{label}{required ? " *" : ""}
    <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength}
      className="mt-1.5 h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#087f70] disabled:cursor-not-allowed disabled:bg-[#f5f7f6]" />
  </label>;
}

export function VendorLegalEntityPanel({ vendorId, axiosInstance }: { vendorId: string; axiosInstance: AxiosInstance }) {
  const can = useAuthStore((state) => state.can);
  const canManageSites = can("vendor", "create");
  const canReadMatrix = can("vendor", "read_sensitive");
  const [sites, setSites] = useState<VendorSite[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixError, setMatrixError] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<VendorSite | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setMatrixError(false);
    try {
      const sitesRequest = axiosInstance.get(`/vendors/${vendorId}/sites`);
      const relationshipRequest = canReadMatrix
        ? axiosInstance.get(`/vendors/${vendorId}/entity-relationships`)
        : Promise.resolve(null);
      const [sitesResponse, relationshipsResponse] = await Promise.all([sitesRequest, relationshipRequest]);
      setSites(unwrap<VendorSite[]>(sitesResponse));
      setRelationships(relationshipsResponse ? unwrap<EntityRelationship[]>(relationshipsResponse) : []);
    } catch {
      setMatrixError(true);
      toast.error("Could not load vendor legal-entity setup.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [vendorId, canReadMatrix]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSite = async (draft: SiteDraft) => {
    setSubmitting(true);
    const payload = {
      ...(editingSite ? {} : { code: draft.code.trim() }),
      name: draft.name.trim(),
      addressLine1: draft.addressLine1.trim() || undefined,
      city: draft.city.trim() || undefined,
      stateOrProvince: draft.stateOrProvince.trim() || undefined,
      postalCode: draft.postalCode.trim() || undefined,
      countryCode: draft.countryCode.trim() || undefined,
      isPrimary: draft.isPrimary,
    };
    try {
      if (editingSite) {
        await axiosInstance.patch(`/vendors/${vendorId}/sites/${editingSite.vendorSiteId}`, payload);
      } else {
        await axiosInstance.post(`/vendors/${vendorId}/sites`, payload);
      }
      toast.success(editingSite ? "Vendor site updated." : "Vendor site added.");
      setSiteDialogOpen(false);
      setEditingSite(null);
      await load();
    } catch {
      toast.error("Could not save the vendor site. Check the required fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inactiveSites = useMemo(() => sites.filter((site) => site.status === "inactive").length, [sites]);

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#c8eee6] bg-[#f6fcfa] p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#dff5ef] text-[#087f70]"><Building2 className="h-5 w-5" /></div>
        <div>
          <h2 className="text-[15px] font-semibold text-[#0b100e]">Legal-entity setup</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#5e6863]">This vendor is shared by the company. Approval and operational readiness are configured separately for each legal entity.</p>
        </div>
      </div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#39423e] hover:bg-[#f9faf9] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-[10px] font-bold tracking-[0.1em] text-[#84908a]">LEGAL ENTITIES</h3><p className="mt-1 text-[13px] text-[#68726d]">Relationship status and readiness by entity.</p></div></div>
        {!canReadMatrix ? <PermissionNotice /> : loading ? <PanelSkeleton /> : matrixError ? <LoadFailure onRetry={load} /> : relationships.length === 0 ? <EmptyMatrix /> : <div className="space-y-3">{relationships.map((relationship) => <RelationshipRow key={relationship.vendorEntityRelationshipId} relationship={relationship} />)}</div>}
      </div>
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-[10px] font-bold tracking-[0.1em] text-[#84908a]">VENDOR SITES</h3><p className="mt-1 text-[13px] text-[#68726d]">Shared locations available for future entity assignment.</p></div>{canManageSites && <button onClick={() => { setEditingSite(null); setSiteDialogOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"><Plus className="h-4 w-4" />Add site</button>}</div>
        {loading ? <PanelSkeleton /> : matrixError ? <LoadFailure onRetry={load} /> : sites.length === 0 ? <p className="rounded-[8px] border border-dashed border-black/[0.12] p-4 text-[13px] text-[#68726d]">No vendor sites have been added.</p> : <div className="space-y-2">{sites.map((site) => <SiteRow key={site.vendorSiteId} site={site} canManage={canManageSites} onEdit={() => { setEditingSite(site); setSiteDialogOpen(true); }} />)}</div>}
        {inactiveSites > 0 && <p className="mt-3 text-[11px] text-[#84908a]">Inactive sites remain visible for historical context and cannot be assigned to new activity.</p>}
      </div>
    </div>
    <SiteDialog open={siteDialogOpen} site={editingSite} submitting={submitting} onOpenChange={(open) => { setSiteDialogOpen(open); if (!open) setEditingSite(null); }} onSave={saveSite} />
  </section>;
}

function RelationshipRow({ relationship }: { relationship: EntityRelationship }) {
  const entityName = relationship.legalEntity?.displayName || relationship.legalEntity?.legalName || "Unknown legal entity";
  return <div className="rounded-[10px] border border-black/[0.08] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[13px] font-semibold text-[#0b100e]">{entityName}</p><p className="mt-0.5 text-[11px] font-medium text-[#84908a]">{relationship.legalEntity?.code || "No entity code"}</p></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[relationship.status]}`}>{relationship.status}</span></div><div className="mt-3 grid grid-cols-3 gap-2">{(["purchasing", "invoicing", "remit_to"] as AssignmentPurpose[]).map((purpose) => { const state = purposeState(relationship, purpose); const assignment = activeAssignment(relationship, purpose); return <div key={purpose} className="rounded-[7px] bg-[#f9faf9] p-2"><p className="text-[10px] font-bold uppercase tracking-wide text-[#84908a]">{purposeLabel[purpose]}</p><p className={`mt-1 text-[11px] font-semibold ${state.tone === "ready" ? "text-[#087f70]" : state.tone === "warning" ? "text-[#b27b00]" : "text-[#68726d]"}`}>{state.label}</p>{assignment?.site && <p className="mt-1 truncate text-[10px] text-[#84908a]" title={assignment.site.name}>{assignment.site.name}</p>}</div>; })}</div></div>;
}

function SiteRow({ site, canManage, onEdit }: { site: VendorSite; canManage: boolean; onEdit: () => void }) {
  const location = [site.addressLine1 || site.legacyAddressText, site.city, site.stateOrProvince, site.countryCode].filter(Boolean).join(", ");
  return <div className="flex items-start gap-3 rounded-[9px] border border-black/[0.07] p-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[#f0faf8] text-[#087f70]"><MapPin className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-[13px] font-semibold text-[#0b100e]">{site.name}</p>{site.isPrimary && <span className="rounded bg-[#e8f7f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#087f70]">Primary</span>}{site.status === "inactive" && <span className="rounded bg-[#f5f7f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#68726d]">Inactive</span>}</div><p className="mt-0.5 text-[11px] font-medium text-[#84908a]">{site.code}{location ? ` · ${location}` : ""}</p></div>{canManage && site.status === "active" && <button onClick={onEdit} className="h-7 rounded-[6px] px-2 text-[11px] font-semibold text-[#087f70] hover:bg-[#f0faf8]">Edit</button>}</div>;
}

function PermissionNotice() { return <div className="rounded-[9px] border border-[#ffe099] bg-[#fff9e6] p-4"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b27b00]" /><div><p className="text-[13px] font-semibold text-[#6e4d00]">Additional permission required</p><p className="mt-1 text-[12px] leading-relaxed text-[#80621b]">Legal-entity configuration includes sensitive vendor information. Ask an administrator for vendor sensitive-read access to view this matrix.</p></div></div></div>; }
function EmptyMatrix() { return <div className="rounded-[9px] border border-dashed border-black/[0.12] p-4"><p className="text-[13px] font-semibold text-[#39423e]">No entity relationships yet</p><p className="mt-1 text-[12px] leading-relaxed text-[#68726d]">Relationships will be added and approved in Phase B. Existing sites can be prepared now.</p></div>; }
function PanelSkeleton() { return <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-[9px] bg-[#f5f7f6]" />)}</div>; }
function LoadFailure({ onRetry }: { onRetry: () => void }) { return <div className="rounded-[9px] border border-[#fbd5d5] bg-[#fdf2f2] p-4"><p className="text-[13px] font-semibold text-[#93292e]">Vendor setup could not be loaded.</p><button onClick={() => void onRetry()} className="mt-2 text-[12px] font-semibold text-[#93292e] underline">Try again</button></div>; }
