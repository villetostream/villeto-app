"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { isAxiosError, type AxiosInstance } from "axios";
import { Building2, CheckCircle2, ChevronRight, CircleAlert, Clock3, Link2, MapPin, Plus, RefreshCw, ShieldAlert } from "lucide-react";
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
  vendorSiteId: string | null;
  purpose: AssignmentPurpose;
  status: SiteStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  inactivationReason?: string | null;
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
  configurationVersion: number;
  decisionReason?: string | null;
  approvedAt?: string | null;
  suspendedAt?: string | null;
  reactivatedAt?: string | null;
  siteAssignments: SiteAssignment[];
}

interface LegalEntityOption {
  legalEntityId: string;
  code: string;
  legalName: string;
  status: "active" | "inactive";
}

type LifecycleAction = "approve" | "suspend" | "reactivate";

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

function nextSetupStep(relationship: EntityRelationship) {
  if (relationship.status === "pending") return { label: "Approve relationship", detail: "Approval is required before this entity can transact.", tone: "pending" as const };
  if (relationship.status === "suspended") return { label: "Relationship suspended", detail: "Reactivate it to resume new activity for this entity.", tone: "blocked" as const };
  if (!activeAssignment(relationship, "purchasing")) return { label: "Assign a purchasing site", detail: "Choose the vendor location this entity can use for purchase orders.", tone: "pending" as const };
  if (!relationship.purchasingEnabled) return { label: "Enable purchasing", detail: "The relationship and purchasing site are ready.", tone: "pending" as const };
  return { label: "Ready for purchase orders", detail: "This entity has an approved relationship, site, and purchasing access.", tone: "ready" as const };
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
  const message = data?.message || data?.error;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message : fallback;
}

function isVersionConflict(error: unknown) {
  return isAxiosError(error) && error.response?.status === 409;
}

function SiteDialog({
  open,
  site,
  submitting,
  onOpenChange,
  onSave,
  onInactivate,
}: {
  open: boolean;
  site: VendorSite | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: SiteDraft) => Promise<void>;
  onInactivate: (site: VendorSite, reason: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
        {open && <SiteDialogForm key={site?.vendorSiteId || "new"} site={site} submitting={submitting} onClose={() => onOpenChange(false)} onSave={onSave} onInactivate={onInactivate} />}
      </DialogContent>
    </Dialog>
  );
}

function SiteDialogForm({ site, submitting, onClose, onSave, onInactivate }: { site: VendorSite | null; submitting: boolean; onClose: () => void; onSave: (draft: SiteDraft) => Promise<void>; onInactivate: (site: VendorSite, reason: string) => Promise<void> }) {
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
  const [inactivationMode, setInactivationMode] = useState(false);
  const [inactivationReason, setInactivationReason] = useState("");
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
    {site && inactivationMode && <div className="rounded-[8px] border border-[#fbd5d5] bg-[#fdf2f2] p-3">
      <label className="block text-[12px] font-semibold text-[#93292e]">Reason for inactivation *</label>
      <textarea value={inactivationReason} onChange={(event) => setInactivationReason(event.target.value)} rows={3} placeholder="Why can this site no longer be used?" className="mt-1.5 w-full rounded-[7px] border border-[#fbd5d5] bg-white p-2.5 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#d33d44]" />
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#a3454a]">This preserves issued PO and invoice history. It only prevents this site from being used in new legal-entity assignments.</p>
    </div>}
    <DialogFooter className="sm:justify-between">
      {site && !inactivationMode ? <button type="button" onClick={() => setInactivationMode(true)} className="mr-auto h-10 rounded-[8px] border border-[#fbd5d5] px-4 text-[13px] font-semibold text-[#d33d44] hover:bg-[#fdf2f2]">Inactivate site</button> : <span />}
      <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button>
      <button type="button" disabled={submitting || (inactivationMode ? !inactivationReason.trim() : !draft.code.trim() || !draft.name.trim())} onClick={() => {
        if (site && inactivationMode) { void onInactivate(site, inactivationReason); return; }
        void onSave(draft);
      }} className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${inactivationMode ? "bg-[#d33d44] hover:bg-[#c33339]" : "bg-[#087f70] hover:bg-[#076b5e]"}`}>
        {submitting ? "Saving..." : inactivationMode ? "Inactivate site" : site ? "Save site" : "Add site"}
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
  const canApproveRelationships = can("vendor", "approve");
  const canSuspendRelationships = can("vendor", "deactivate");
  const canReactivateRelationships = can("vendor", "activate");
  const [sites, setSites] = useState<VendorSite[]>([]);
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixError, setMatrixError] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<VendorSite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createRelationshipOpen, setCreateRelationshipOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<{ action: LifecycleAction; relationship: EntityRelationship } | null>(null);
  const [assignmentRelationship, setAssignmentRelationship] = useState<EntityRelationship | null>(null);
  const [endingAssignment, setEndingAssignment] = useState<{ relationship: EntityRelationship; assignment: SiteAssignment } | null>(null);

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

  const inactivateSite = async (site: VendorSite, reason: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/sites/${site.vendorSiteId}`, {
        status: "inactive",
        inactivationReason: reason.trim(),
      });
      toast.success("Vendor site inactivated. Historical records were preserved.");
      setSiteDialogOpen(false);
      setEditingSite(null);
      await load();
    } catch {
      toast.error("Could not inactivate the vendor site. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadLegalEntities = async () => {
    try {
      const response = await axiosInstance.get("/legal-entities");
      setLegalEntities(unwrap<LegalEntityOption[]>(response));
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load legal entities."));
      return false;
    }
  };

  const openCreateRelationship = async () => {
    if (legalEntities.length === 0 && !(await loadLegalEntities())) return;
    setCreateRelationshipOpen(true);
  };

  const createRelationship = async (legalEntityId: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.post(`/vendors/${vendorId}/entity-relationships`, { legalEntityId });
      toast.success("Vendor relationship started. Approve it when the entity is ready to transact.");
      setCreateRelationshipOpen(false);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not start this vendor relationship."));
    } finally {
      setSubmitting(false);
    }
  };

  const transitionRelationship = async (relationship: EntityRelationship, action: LifecycleAction, reason: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.post(
        `/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/${action}`,
        { expectedVersion: relationship.configurationVersion, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      );
      toast.success(`Vendor relationship ${action === "approve" ? "approved" : action === "suspend" ? "suspended" : "reactivated"}.`);
      setLifecycleAction(null);
      await load();
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error("This relationship changed elsewhere. The latest configuration has been loaded for review.");
        await load();
      } else {
        toast.error(apiErrorMessage(error, "Could not update this vendor relationship."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const createAssignment = async (relationship: EntityRelationship, siteId: string, purpose: AssignmentPurpose, effectiveFrom?: string, effectiveTo?: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.post(`/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/site-assignments`, {
        vendorSiteId: siteId,
        purpose,
        ...(effectiveFrom ? { effectiveFrom } : {}),
        ...(effectiveTo ? { effectiveTo } : {}),
      });
      toast.success(`${purposeLabel[purpose]} site assigned.`);
      setAssignmentRelationship(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not assign this vendor site."));
    } finally {
      setSubmitting(false);
    }
  };

  const endAssignment = async (relationship: EntityRelationship, assignment: SiteAssignment, reason: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.patch(
        `/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/site-assignments/${assignment.vendorEntitySiteAssignmentId}`,
        { status: "inactive", inactivationReason: reason.trim() },
      );
      toast.success("Site assignment ended. Historical transactions were preserved.");
      setEndingAssignment(null);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not end this site assignment."));
    } finally {
      setSubmitting(false);
    }
  };

  const setPurchasing = async (relationship: EntityRelationship, enabled: boolean) => {
    if (enabled && !activeAssignment(relationship, "purchasing")) {
      toast.error("Assign an active purchasing site before enabling purchasing.");
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/controls`, {
        expectedVersion: relationship.configurationVersion,
        purchasingEnabled: enabled,
      });
      toast.success(enabled ? "Purchasing enabled for this legal entity." : "Purchasing placed on hold for this legal entity.");
      await load();
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error("This relationship changed elsewhere. The latest configuration has been loaded for review.");
        await load();
      } else {
        toast.error(apiErrorMessage(error, "Could not update purchasing controls."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inactiveSites = useMemo(() => sites.filter((site) => site.status === "inactive").length, [sites]);
  const relationshipSummary = useMemo(() => ({
    ready: relationships.filter((relationship) => nextSetupStep(relationship).tone === "ready").length,
    needsAction: relationships.filter((relationship) => nextSetupStep(relationship).tone === "pending").length,
    suspended: relationships.filter((relationship) => relationship.status === "suspended").length,
  }), [relationships]);
  const assignmentCountBySite = useMemo(() => {
    const counts = new Map<string, number>();
    relationships.flatMap((relationship) => relationship.siteAssignments).filter((assignment) => assignment.status === "active" && assignment.vendorSiteId).forEach((assignment) => {
      counts.set(assignment.vendorSiteId as string, (counts.get(assignment.vendorSiteId as string) || 0) + 1);
    });
    return counts;
  }, [relationships]);

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 rounded-[14px] border border-[#c8eee6] bg-[#f6fcfa] p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#dff5ef] text-[#087f70]"><Building2 className="h-5 w-5" /></div>
        <div>
          <h2 className="text-[15px] font-semibold text-[#0b100e]">Where can this vendor be used?</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#5e6863]">Set up each legal entity in three steps: approve the relationship, assign a vendor site, then enable purchasing.</p>
        </div>
      </div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#39423e] hover:bg-[#f9faf9] disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Refresh</button>
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.85fr]">
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-[10px] font-bold tracking-[0.1em] text-[#84908a]">LEGAL-ENTITY COVERAGE</h3><p className="mt-1 text-[13px] text-[#68726d]">Each entity has its own relationship and purchasing setup.</p></div>{canReadMatrix && canApproveRelationships && <button onClick={() => void openCreateRelationship()} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"><Plus className="h-4 w-4" />Add entity</button>}</div>
        {canReadMatrix && relationships.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2"><SetupMetric label="Ready" value={relationshipSummary.ready} tone="ready" /><SetupMetric label="Needs action" value={relationshipSummary.needsAction} tone="pending" /><SetupMetric label="Suspended" value={relationshipSummary.suspended} tone="blocked" /></div>}
        {!canReadMatrix ? <PermissionNotice /> : loading ? <PanelSkeleton /> : matrixError ? <LoadFailure onRetry={load} /> : relationships.length === 0 ? <EmptyMatrix canCreate={canApproveRelationships} onCreate={openCreateRelationship} /> : <div className="space-y-3">{relationships.map((relationship) => <RelationshipRow key={relationship.vendorEntityRelationshipId} relationship={relationship} canApprove={canApproveRelationships} canSuspend={canSuspendRelationships} canReactivate={canReactivateRelationships} activeSites={sites.filter((site) => site.status === "active")} submitting={submitting} onLifecycle={(action) => setLifecycleAction({ action, relationship })} onAssignSite={() => setAssignmentRelationship(relationship)} onEndAssignment={(assignment) => setEndingAssignment({ relationship, assignment })} onSetPurchasing={(enabled) => void setPurchasing(relationship, enabled)} />)}</div>}
      </div>
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-[10px] font-bold tracking-[0.1em] text-[#84908a]">SHARED VENDOR SITES</h3><p className="mt-1 text-[13px] text-[#68726d]">Locations can be assigned to more than one entity.</p></div>{canManageSites && <button onClick={() => { setEditingSite(null); setSiteDialogOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"><Plus className="h-4 w-4" />Add site</button>}</div>
        {loading ? <PanelSkeleton /> : matrixError ? <LoadFailure onRetry={load} /> : sites.length === 0 ? <p className="rounded-[8px] border border-dashed border-black/[0.12] p-4 text-[13px] text-[#68726d]">No vendor sites have been added.</p> : <div className="space-y-2">{sites.map((site) => <SiteRow key={site.vendorSiteId} site={site} assignmentCount={assignmentCountBySite.get(site.vendorSiteId) || 0} canManage={canManageSites} onEdit={() => { setEditingSite(site); setSiteDialogOpen(true); }} />)}</div>}
        {inactiveSites > 0 && <p className="mt-3 text-[11px] text-[#84908a]">Inactive sites remain visible for historical context and cannot be assigned to new activity.</p>}
      </div>
    </div>
    <SiteDialog open={siteDialogOpen} site={editingSite} submitting={submitting} onOpenChange={(open) => { setSiteDialogOpen(open); if (!open) setEditingSite(null); }} onSave={saveSite} onInactivate={inactivateSite} />
    <CreateRelationshipDialog open={createRelationshipOpen} entities={legalEntities.filter((entity) => entity.status === "active" && !relationships.some((relationship) => relationship.legalEntity?.legalEntityId === entity.legalEntityId))} submitting={submitting} onOpenChange={setCreateRelationshipOpen} onCreate={createRelationship} />
    <LifecycleDialog actionState={lifecycleAction} submitting={submitting} onOpenChange={(open) => !open && setLifecycleAction(null)} onSubmit={(reason) => {
      if (lifecycleAction) return transitionRelationship(lifecycleAction.relationship, lifecycleAction.action, reason);
    }} />
    <SiteAssignmentDialog relationship={assignmentRelationship} sites={sites.filter((site) => site.status === "active")} submitting={submitting} onOpenChange={(open) => !open && setAssignmentRelationship(null)} onCreate={(siteId, purpose, effectiveFrom, effectiveTo) => {
      if (assignmentRelationship) return createAssignment(assignmentRelationship, siteId, purpose, effectiveFrom, effectiveTo);
    }} />
    <EndAssignmentDialog state={endingAssignment} submitting={submitting} onOpenChange={(open) => !open && setEndingAssignment(null)} onSubmit={(reason) => {
      if (endingAssignment) return endAssignment(endingAssignment.relationship, endingAssignment.assignment, reason);
    }} />
  </section>;
}

function RelationshipRow({ relationship, canApprove, canSuspend, canReactivate, activeSites, submitting, onLifecycle, onAssignSite, onEndAssignment, onSetPurchasing }: {
  relationship: EntityRelationship;
  canApprove: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
  activeSites: VendorSite[];
  submitting: boolean;
  onLifecycle: (action: LifecycleAction) => void;
  onAssignSite: () => void;
  onEndAssignment: (assignment: SiteAssignment) => void;
  onSetPurchasing: (enabled: boolean) => void;
}) {
  const entityName = relationship.legalEntity?.displayName || relationship.legalEntity?.legalName || "Unknown legal entity";
  const purchasingSite = activeAssignment(relationship, "purchasing");
  const nextStep = nextSetupStep(relationship);
  const stageOneDone = relationship.status === "approved";
  const stageTwoDone = Boolean(purchasingSite);
  const stageThreeDone = relationship.purchasingEnabled;
  const primaryAction = relationship.status === "pending" ? () => onLifecycle("approve") : relationship.status === "suspended" ? () => onLifecycle("reactivate") : !stageTwoDone ? onAssignSite : !stageThreeDone ? () => onSetPurchasing(true) : null;
  const primaryLabel = relationship.status === "pending" ? "Approve" : relationship.status === "suspended" ? "Reactivate" : !stageTwoDone ? "Assign site" : !stageThreeDone ? "Enable purchasing" : null;

  return <div className="overflow-hidden rounded-[12px] border border-black/[0.08] bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-4 py-3.5"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${nextStep.tone === "ready" ? "bg-[#e8f7f2] text-[#087f70]" : nextStep.tone === "blocked" ? "bg-[#fdf2f2] text-[#d33d44]" : "bg-[#fff7df] text-[#b27b00]"}`}>{nextStep.tone === "ready" ? <CheckCircle2 className="h-5 w-5" /> : nextStep.tone === "blocked" ? <CircleAlert className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</div><div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#0b100e]">{entityName}</p><p className="mt-0.5 text-[11px] font-medium text-[#84908a]">{relationship.legalEntity?.code || "No entity code"}</p></div></div><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[relationship.status]}`}>{relationship.status}</span>{relationship.status === "approved" && canSuspend && <ActionButton danger onClick={() => onLifecycle("suspend")} disabled={submitting}>Suspend</ActionButton>}</div></div>
    <div className="px-4 py-3.5"><div className={`flex flex-col gap-3 rounded-[9px] border p-3 sm:flex-row sm:items-center sm:justify-between ${nextStep.tone === "ready" ? "border-[#c8eee6] bg-[#f0faf8]" : nextStep.tone === "blocked" ? "border-[#fbd5d5] bg-[#fdf2f2]" : "border-[#ffe099] bg-[#fff9e6]"}`}><div><p className="text-[12px] font-semibold text-[#0b100e]">{nextStep.label}</p><p className="mt-0.5 text-[11px] leading-relaxed text-[#68726d]">{nextStep.detail}</p></div>{primaryAction && primaryLabel && ((relationship.status !== "pending" || canApprove) && (relationship.status !== "suspended" || canReactivate) && canApprove) && <button onClick={primaryAction} disabled={submitting || (!stageTwoDone && activeSites.length === 0)} className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-[7px] bg-[#087f70] px-3 text-[11px] font-semibold text-white hover:bg-[#076b5e] disabled:opacity-50">{primaryLabel}<ChevronRight className="h-3.5 w-3.5" /></button>}</div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><SetupStage number="1" title="Relationship" detail={stageOneDone ? "Approved" : relationship.status === "suspended" ? "Suspended" : "Pending approval"} done={stageOneDone} blocked={relationship.status === "suspended"} /><SetupStage number="2" title="Purchasing site" detail={purchasingSite?.site?.name || "Not assigned"} done={stageTwoDone} /><SetupStage number="3" title="Purchasing access" detail={stageThreeDone ? "Enabled" : "On hold"} done={stageThreeDone} /></div>
      <div className="mt-4 border-t border-black/[0.06] pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-semibold text-[#5e6863]">All site assignments</p>{canApprove && <ActionButton onClick={onAssignSite} disabled={submitting || activeSites.length === 0}><Link2 className="h-3.5 w-3.5" />Assign site</ActionButton>}</div>{relationship.siteAssignments.length === 0 ? <p className="mt-2 text-[11px] text-[#84908a]">No sites are assigned to this entity.</p> : <div className="mt-2 space-y-1.5">{relationship.siteAssignments.map((assignment) => <div key={assignment.vendorEntitySiteAssignmentId} className="flex items-center justify-between gap-2 rounded-[7px] bg-[#f9faf9] px-2.5 py-2"><p className="min-w-0 truncate text-[11px] text-[#5e6863]"><span className="font-semibold text-[#39423e]">{purposeLabel[assignment.purpose]}</span> · {assignment.site?.name || "Unknown site"} {assignment.status === "inactive" ? "(inactive)" : ""}</p>{canApprove && assignment.status === "active" && <button onClick={() => onEndAssignment(assignment)} className="shrink-0 text-[10px] font-semibold text-[#d33d44] hover:underline">End</button>}</div>)}</div>}</div>
      {relationship.status === "approved" && relationship.purchasingEnabled && canApprove && <div className="mt-3 flex items-center justify-end"><button onClick={() => onSetPurchasing(false)} disabled={submitting} className="text-[11px] font-semibold text-[#68726d] hover:text-[#d33d44] hover:underline">Put purchasing on hold</button></div>}
    </div>
  </div>;
}

function SetupMetric({ label, value, tone }: { label: string; value: number; tone: "ready" | "pending" | "blocked" }) { const classes = tone === "ready" ? "bg-[#f0faf8] text-[#087f70]" : tone === "pending" ? "bg-[#fff9e6] text-[#b27b00]" : "bg-[#fdf2f2] text-[#d33d44]"; return <div className={`rounded-[8px] px-3 py-2 ${classes}`}><p className="text-[16px] font-bold">{value}</p><p className="text-[10px] font-semibold">{label}</p></div>; }
function SetupStage({ number, title, detail, done, blocked }: { number: string; title: string; detail: string; done: boolean; blocked?: boolean }) { return <div className={`rounded-[8px] border p-2.5 ${done ? "border-[#c8eee6] bg-[#f7fcfa]" : blocked ? "border-[#fbd5d5] bg-[#fdf2f2]" : "border-black/[0.07] bg-[#f9faf9]"}`}><div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-[#087f70] text-white" : blocked ? "bg-[#d33d44] text-white" : "bg-[#e7ece9] text-[#68726d]"}`}>{done ? "✓" : number}</span><p className="text-[11px] font-semibold text-[#39423e]">{title}</p></div><p className="mt-1.5 truncate text-[10px] text-[#84908a]" title={detail}>{detail}</p></div>; }

function ActionButton({ children, onClick, disabled, danger }: { children: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className={`inline-flex h-7 items-center gap-1 rounded-[6px] border px-2 text-[10px] font-semibold disabled:opacity-50 ${danger ? "border-[#fbd5d5] text-[#d33d44] hover:bg-[#fdf2f2]" : "border-[#c8eee6] text-[#087f70] hover:bg-[#f0faf8]"}`}>{children}</button>;
}

function CreateRelationshipDialog({ open, entities, submitting, onOpenChange, onCreate }: { open: boolean; entities: LegalEntityOption[]; submitting: boolean; onOpenChange: (open: boolean) => void; onCreate: (legalEntityId: string) => Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[520px]">{open && <CreateRelationshipForm key={entities.map((entity) => entity.legalEntityId).join("-")} entities={entities} submitting={submitting} onClose={() => onOpenChange(false)} onCreate={onCreate} />}</DialogContent></Dialog>;
}

function CreateRelationshipForm({ entities, submitting, onClose, onCreate }: { entities: LegalEntityOption[]; submitting: boolean; onClose: () => void; onCreate: (legalEntityId: string) => Promise<void> }) {
  const [legalEntityId, setLegalEntityId] = useState(entities[0]?.legalEntityId || "");
  return <><DialogHeader><DialogTitle>Add legal-entity relationship</DialogTitle><DialogDescription>This creates a pending relationship. It is not usable for purchasing until an authorized admin approves it and assigns a site.</DialogDescription></DialogHeader>{entities.length === 0 ? <div className="rounded-[8px] border border-dashed border-black/[0.12] p-4 text-[13px] text-[#68726d]">Every active legal entity already has a relationship with this vendor.</div> : <label className="block text-[12px] font-semibold text-[#39423e]">Legal entity<select value={legalEntityId} onChange={(event) => setLegalEntityId(event.target.value)} className="mt-1.5 h-10 w-full rounded-[8px] border border-black/[0.1] bg-white px-3 text-[13px] outline-none focus:border-[#087f70]">{entities.map((entity) => <option key={entity.legalEntityId} value={entity.legalEntityId}>{entity.legalName} ({entity.code})</option>)}</select></label>}<DialogFooter><button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button><button type="button" disabled={submitting || !legalEntityId} onClick={() => void onCreate(legalEntityId)} className="h-10 rounded-[8px] bg-[#087f70] px-4 text-[13px] font-semibold text-white hover:bg-[#076b5e] disabled:opacity-50">{submitting ? "Creating..." : "Create pending relationship"}</button></DialogFooter></>;
}

function LifecycleDialog({ actionState, submitting, onOpenChange, onSubmit }: { actionState: { action: LifecycleAction; relationship: EntityRelationship } | null; submitting: boolean; onOpenChange: (open: boolean) => void; onSubmit: (reason: string) => Promise<void> | void }) {
  const open = Boolean(actionState);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[520px]">{actionState && <LifecycleForm key={`${actionState.action}-${actionState.relationship.vendorEntityRelationshipId}-${actionState.relationship.configurationVersion}`} actionState={actionState} submitting={submitting} onClose={() => onOpenChange(false)} onSubmit={onSubmit} />}</DialogContent></Dialog>;
}

function LifecycleForm({ actionState, submitting, onClose, onSubmit }: { actionState: { action: LifecycleAction; relationship: EntityRelationship }; submitting: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void> | void }) {
  const [reason, setReason] = useState("");
  const entityName = actionState.relationship.legalEntity?.displayName || actionState.relationship.legalEntity?.legalName || "this legal entity";
  const config = actionState.action === "approve" ? { title: "Approve vendor relationship", button: "Approve relationship", detail: "Approval allows this entity to be configured for operational use. Purchasing still requires an active purchasing site." } : actionState.action === "suspend" ? { title: "Suspend vendor relationship", button: "Suspend relationship", detail: "Suspension blocks new activity for this entity but preserves issued PO and invoice history." } : { title: "Reactivate vendor relationship", button: "Reactivate relationship", detail: "Reactivation restores the approved relationship. Purpose controls remain subject to their existing site prerequisites." };
  return <><DialogHeader><DialogTitle>{config.title}</DialogTitle><DialogDescription>{entityName}: {config.detail}</DialogDescription></DialogHeader><label className="block text-[12px] font-semibold text-[#39423e]">Reason {actionState.action === "suspend" ? "*" : "(optional)"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder={actionState.action === "suspend" ? "Why must this vendor be suspended for this entity?" : "Add approval or reactivation context"} className="mt-1.5 w-full rounded-[8px] border border-black/[0.1] p-3 text-[13px] outline-none placeholder:text-[#a0aaa5] focus:border-[#087f70]" /></label><DialogFooter><button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button><button type="button" disabled={submitting || (actionState.action === "suspend" && !reason.trim())} onClick={() => void onSubmit(reason)} className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${actionState.action === "suspend" ? "bg-[#d33d44] hover:bg-[#c33339]" : "bg-[#087f70] hover:bg-[#076b5e]"}`}>{submitting ? "Saving..." : config.button}</button></DialogFooter></>;
}

function SiteAssignmentDialog({ relationship, sites, submitting, onOpenChange, onCreate }: { relationship: EntityRelationship | null; sites: VendorSite[]; submitting: boolean; onOpenChange: (open: boolean) => void; onCreate: (siteId: string, purpose: AssignmentPurpose, effectiveFrom?: string, effectiveTo?: string) => Promise<void> | void }) {
  const open = Boolean(relationship);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[560px]">{relationship && <SiteAssignmentForm key={`${relationship.vendorEntityRelationshipId}-${relationship.configurationVersion}`} relationship={relationship} sites={sites} submitting={submitting} onClose={() => onOpenChange(false)} onCreate={onCreate} />}</DialogContent></Dialog>;
}

function SiteAssignmentForm({ relationship, sites, submitting, onClose, onCreate }: { relationship: EntityRelationship; sites: VendorSite[]; submitting: boolean; onClose: () => void; onCreate: (siteId: string, purpose: AssignmentPurpose, effectiveFrom?: string, effectiveTo?: string) => Promise<void> | void }) {
  const [siteId, setSiteId] = useState(sites[0]?.vendorSiteId || "");
  const [purpose, setPurpose] = useState<AssignmentPurpose>("purchasing");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const entityName = relationship.legalEntity?.displayName || relationship.legalEntity?.legalName || "this legal entity";
  const alreadyAssigned = relationship.siteAssignments.some((assignment) => assignment.vendorSiteId === siteId && assignment.purpose === purpose && assignment.status === "active");
  const invalidDates = Boolean(effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom);
  return <><DialogHeader><DialogTitle>Assign a vendor site</DialogTitle><DialogDescription>Authorize one active company-wide site for {entityName} and a specific operational purpose.</DialogDescription></DialogHeader><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-[12px] font-semibold text-[#39423e]">Site<select value={siteId} onChange={(event) => setSiteId(event.target.value)} className="mt-1.5 h-10 w-full rounded-[8px] border border-black/[0.1] bg-white px-3 text-[13px] outline-none focus:border-[#087f70]">{sites.map((site) => <option key={site.vendorSiteId} value={site.vendorSiteId}>{site.name} ({site.code})</option>)}</select></label><label className="block text-[12px] font-semibold text-[#39423e]">Purpose<select value={purpose} onChange={(event) => setPurpose(event.target.value as AssignmentPurpose)} className="mt-1.5 h-10 w-full rounded-[8px] border border-black/[0.1] bg-white px-3 text-[13px] outline-none focus:border-[#087f70]">{(["purchasing", "invoicing", "remit_to"] as AssignmentPurpose[]).map((item) => <option key={item} value={item}>{purposeLabel[item]}</option>)}</select></label><Field label="Effective from" value={effectiveFrom} onChange={setEffectiveFrom} placeholder="Leave blank for now" /><Field label="Effective to" value={effectiveTo} onChange={setEffectiveTo} placeholder="Optional" /></div><p className="text-[11px] leading-relaxed text-[#84908a]">Use ISO dates such as 2026-09-22. A site can be assigned to multiple entities, but each entity and purpose is configured independently.</p>{alreadyAssigned && <p className="rounded-[7px] bg-[#fff9e6] p-2.5 text-[11px] text-[#80621b]">This site is already active for the selected purpose. Choose another site or purpose.</p>}{invalidDates && <p className="rounded-[7px] bg-[#fdf2f2] p-2.5 text-[11px] text-[#a3454a]">The end date must be after the start date.</p>}<DialogFooter><button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button><button type="button" disabled={submitting || !siteId || alreadyAssigned || invalidDates} onClick={() => void onCreate(siteId, purpose, effectiveFrom || undefined, effectiveTo || undefined)} className="h-10 rounded-[8px] bg-[#087f70] px-4 text-[13px] font-semibold text-white hover:bg-[#076b5e] disabled:opacity-50">{submitting ? "Assigning..." : "Assign site"}</button></DialogFooter></>;
}

function EndAssignmentDialog({ state, submitting, onOpenChange, onSubmit }: { state: { relationship: EntityRelationship; assignment: SiteAssignment } | null; submitting: boolean; onOpenChange: (open: boolean) => void; onSubmit: (reason: string) => Promise<void> | void }) {
  const open = Boolean(state);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[520px]">{state && <EndAssignmentForm key={state.assignment.vendorEntitySiteAssignmentId} state={state} submitting={submitting} onClose={() => onOpenChange(false)} onSubmit={onSubmit} />}</DialogContent></Dialog>;
}

function EndAssignmentForm({ state, submitting, onClose, onSubmit }: { state: { relationship: EntityRelationship; assignment: SiteAssignment }; submitting: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void> | void }) {
  const [reason, setReason] = useState("");
  return <><DialogHeader><DialogTitle>End site assignment</DialogTitle><DialogDescription>This stops new use of {state.assignment.site?.name || "this site"} for {purposeLabel[state.assignment.purpose]}. It does not rewrite historical transactions.</DialogDescription></DialogHeader><label className="block text-[12px] font-semibold text-[#93292e]">Reason *</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Why should this site no longer be used for this purpose?" className="w-full rounded-[8px] border border-[#fbd5d5] p-3 text-[13px] outline-none placeholder:text-[#a0aaa5] focus:border-[#d33d44]" /><DialogFooter><button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]">Cancel</button><button type="button" disabled={submitting || !reason.trim()} onClick={() => void onSubmit(reason)} className="h-10 rounded-[8px] bg-[#d33d44] px-4 text-[13px] font-semibold text-white hover:bg-[#c33339] disabled:opacity-50">{submitting ? "Saving..." : "End assignment"}</button></DialogFooter></>;
}

function SiteRow({ site, assignmentCount, canManage, onEdit }: { site: VendorSite; assignmentCount: number; canManage: boolean; onEdit: () => void }) {
  const location = [site.addressLine1 || site.legacyAddressText, site.city, site.stateOrProvince, site.countryCode].filter(Boolean).join(", ");
  return <div className="flex items-start gap-3 rounded-[9px] border border-black/[0.07] p-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[#f0faf8] text-[#087f70]"><MapPin className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-[13px] font-semibold text-[#0b100e]">{site.name}</p>{site.isPrimary && <span className="rounded bg-[#e8f7f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#087f70]">Primary</span>}{site.status === "inactive" && <span className="rounded bg-[#f5f7f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#68726d]">Inactive</span>}</div><p className="mt-0.5 text-[11px] font-medium text-[#84908a]">{site.code}{location ? ` · ${location}` : ""}</p>{site.status === "active" && <p className="mt-1 text-[10px] text-[#84908a]">{assignmentCount === 0 ? "Not assigned to an entity yet" : `${assignmentCount} active ${assignmentCount === 1 ? "assignment" : "assignments"}`}</p>}</div>{canManage && site.status === "active" && <button onClick={onEdit} className="h-7 rounded-[6px] px-2 text-[11px] font-semibold text-[#087f70] hover:bg-[#f0faf8]">Edit</button>}</div>;
}

function PermissionNotice() { return <div className="rounded-[9px] border border-[#ffe099] bg-[#fff9e6] p-4"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b27b00]" /><div><p className="text-[13px] font-semibold text-[#6e4d00]">Additional permission required</p><p className="mt-1 text-[12px] leading-relaxed text-[#80621b]">Legal-entity configuration includes sensitive vendor information. Ask an administrator for vendor sensitive-read access to view this matrix.</p></div></div></div>; }
function EmptyMatrix({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) { return <div className="rounded-[9px] border border-dashed border-black/[0.12] p-4"><p className="text-[13px] font-semibold text-[#39423e]">No entity relationships yet</p><p className="mt-1 text-[12px] leading-relaxed text-[#68726d]">Start a pending relationship for an active legal entity, then approve it and assign a site before enabling purchasing.</p>{canCreate && <button onClick={() => void onCreate()} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"><Plus className="h-4 w-4" />Add entity</button>}</div>; }
function PanelSkeleton() { return <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-[9px] bg-[#f5f7f6]" />)}</div>; }
function LoadFailure({ onRetry }: { onRetry: () => void }) { return <div className="rounded-[9px] border border-[#fbd5d5] bg-[#fdf2f2] p-4"><p className="text-[13px] font-semibold text-[#93292e]">Vendor setup could not be loaded.</p><button onClick={() => void onRetry()} className="mt-2 text-[12px] font-semibold text-[#93292e] underline">Try again</button></div>; }
