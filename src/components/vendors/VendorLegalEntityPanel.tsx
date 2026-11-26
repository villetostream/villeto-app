"use client";

import { changedRelationshipControls, controlsDraft, type RelationshipControls } from "./relationship-controls";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isAxiosError, type AxiosInstance } from "axios";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Link2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateVendorManagement } from "@/queries/vendors/cache";
import { useAuthStore } from "@/stores/auth-stores";
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

import { EndAssignmentForm } from "./EndAssignmentForm";
import { shouldRefreshAfterEndConflict } from "./end-site-assignment";

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
  site: Pick<
    VendorSite,
    "vendorSiteId" | "code" | "name" | "status" | "isPrimary"
  > | null;
}

interface EntityRelationship {
  vendorEntityRelationshipId: string;
  legalEntity: {
    legalEntityId: string;
    code: string;
    legalName: string;
    displayName: string | null;
  } | null;
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
  return body && typeof body === "object" && "data" in body
    ? (body.data as T)
    : (response.data as T);
};

const unwrapArray = <T,>(
  response: { data: unknown } | null | undefined,
  key?: string,
): T[] => {
  if (!response) return [];
  const raw = unwrap<any>(response);
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (key && Array.isArray(raw[key])) return raw[key];
    if (Array.isArray(raw.sites)) return raw.sites;
    if (Array.isArray(raw.relationships)) return raw.relationships;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.items)) return raw.items;
  }
  return [];
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
    const starts =
      !assignment.effectiveFrom ||
      new Date(assignment.effectiveFrom).getTime() <= now;
    const ends =
      !assignment.effectiveTo ||
      new Date(assignment.effectiveTo).getTime() > now;
    return (
      assignment.purpose === purpose &&
      assignment.status === "active" &&
      assignment.site?.status === "active" &&
      starts &&
      ends
    );
  });
}

function nextSetupStep(relationship: EntityRelationship) {
  if (relationship.status === "pending")
    return {
      label: "Approve relationship",
      detail: "Approval is required before this entity can transact.",
      tone: "pending" as const,
    };
  if (relationship.status === "suspended")
    return {
      label: "Relationship suspended",
      detail: "Reactivate it to resume new activity for this entity.",
      tone: "blocked" as const,
    };
  if (!activeAssignment(relationship, "purchasing"))
    return {
      label: "Assign a purchasing site",
      detail:
        "Choose the vendor location this entity can use for purchase orders.",
      tone: "pending" as const,
    };
  if (!relationship.purchasingEnabled)
    return {
      label: "Enable purchasing",
      detail: "The relationship and purchasing site are ready.",
      tone: "pending" as const,
    };
  return {
    label: "Ready for purchase orders",
    detail:
      "This entity has an approved relationship, site, and purchasing access.",
    tone: "ready" as const,
  };
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data as
    | { message?: unknown; error?: unknown }
    | undefined;
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
        {open && (
          <SiteDialogForm
            key={site?.vendorSiteId || "new"}
            site={site}
            submitting={submitting}
            onClose={() => onOpenChange(false)}
            onSave={onSave}
            onInactivate={onInactivate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SiteDialogForm({
  site,
  submitting,
  onClose,
  onSave,
  onInactivate,
}: {
  site: VendorSite | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (draft: SiteDraft) => Promise<void>;
  onInactivate: (site: VendorSite, reason: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SiteDraft>(() =>
    site
      ? {
          code: site.code,
          name: site.name,
          addressLine1: site.addressLine1 || "",
          city: site.city || "",
          stateOrProvince: site.stateOrProvince || "",
          postalCode: site.postalCode || "",
          countryCode: site.countryCode || "",
          isPrimary: site.isPrimary,
        }
      : emptySiteDraft,
  );
  const [inactivationMode, setInactivationMode] = useState(false);
  const [inactivationReason, setInactivationReason] = useState("");
  const update = (field: keyof SiteDraft, value: string | boolean) =>
    setDraft((current) => ({ ...current, [field]: value }));
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {site ? "Edit vendor site" : "Add vendor site"}
        </DialogTitle>
        <DialogDescription>
          Sites belong to this vendor across the company. Assigning a site to a
          legal entity happens in Phase B.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Site code"
          required
          value={draft.code}
          disabled={Boolean(site)}
          onChange={(value) => update("code", value.toUpperCase())}
          placeholder="CHICAGO"
        />
        <Field
          label="Site name"
          required
          value={draft.name}
          onChange={(value) => update("name", value)}
          placeholder="Chicago ordering site"
        />
        <div className="sm:col-span-2">
          <Field
            label="Address"
            value={draft.addressLine1}
            onChange={(value) => update("addressLine1", value)}
            placeholder="123 Main Street"
          />
        </div>
        <Field
          label="City"
          value={draft.city}
          onChange={(value) => update("city", value)}
          placeholder="Chicago"
        />
        <Field
          label="State / province"
          value={draft.stateOrProvince}
          onChange={(value) => update("stateOrProvince", value)}
          placeholder="Illinois"
        />
        <Field
          label="Postal code"
          value={draft.postalCode}
          onChange={(value) => update("postalCode", value)}
          placeholder="60601"
        />
        <Field
          label="Country code"
          value={draft.countryCode}
          onChange={(value) => update("countryCode", value.toUpperCase())}
          placeholder="US"
          maxLength={2}
        />
      </div>
      <label className="flex items-center gap-3 rounded-[8px] border border-black/[0.08] p-3 text-[13px] font-medium text-[#0b100e]">
        <input
          type="checkbox"
          checked={draft.isPrimary}
          onChange={(event) => update("isPrimary", event.target.checked)}
          className="h-4 w-4 accent-[#087f70]"
        />
        Make this the primary vendor site
      </label>
      {site && inactivationMode && (
        <div className="rounded-[8px] border border-[#fbd5d5] bg-[#fdf2f2] p-3">
          <label className="block text-[12px] font-semibold text-[#93292e]">
            Reason for inactivation *
          </label>
          <textarea
            value={inactivationReason}
            onChange={(event) => setInactivationReason(event.target.value)}
            rows={3}
            placeholder="Why can this site no longer be used?"
            className="mt-1.5 w-full rounded-[7px] border border-[#fbd5d5] bg-white p-2.5 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#d33d44]"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#a3454a]">
            This preserves issued PO and invoice history. It only prevents this
            site from being used in new legal-entity assignments.
          </p>
        </div>
      )}
      <DialogFooter className="sm:justify-between">
        {site && !inactivationMode ? (
          <button
            type="button"
            onClick={() => setInactivationMode(true)}
            className="mr-auto h-10 rounded-[8px] border border-[#fbd5d5] px-4 text-[13px] font-semibold text-[#d33d44] hover:bg-[#fdf2f2]"
          >
            Inactivate site
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={
            submitting ||
            (inactivationMode
              ? !inactivationReason.trim()
              : !draft.code.trim() || !draft.name.trim())
          }
          onClick={() => {
            if (site && inactivationMode) {
              void onInactivate(site, inactivationReason);
              return;
            }
            void onSave(draft);
          }}
          className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${inactivationMode ? "bg-[#d33d44] hover:bg-[#c33339]" : "bg-[#087f70] hover:bg-[#076b5e]"}`}
        >
          {submitting
            ? "Saving..."
            : inactivationMode
              ? "Inactivate site"
              : site
                ? "Save site"
                : "Add site"}
        </button>
      </DialogFooter>
    </>
  );
}

function Field({
  label,
  required,
  value,
  disabled,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  required?: boolean;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-[12px] font-semibold text-[#39423e]">
      {label}
      {required ? " *" : ""}
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#087f70] disabled:cursor-not-allowed disabled:bg-[#f5f7f6]"
      />
    </label>
  );
}

export function VendorLegalEntityPanel(props: {
  vendorId: string;
  axiosInstance: AxiosInstance;
  initialSites?: VendorSite[];
  initialRelationships?: EntityRelationship[];
}) {
  const workspaceGeneration = useEntityWorkspaceStore(
    (state) => state.generation,
  );
  // Reset coverage, site selection, and dialogs when the workspace changes.
  return (
    <VendorLegalEntityPanelContent
      key={`${props.vendorId}:${workspaceGeneration}`}
      {...props}
      workspaceGeneration={workspaceGeneration}
    />
  );
}

function VendorLegalEntityPanelContent({
  vendorId,
  axiosInstance,
  workspaceGeneration,
  initialSites = [],
  initialRelationships = [],
}: {
  vendorId: string;
  axiosInstance: AxiosInstance;
  workspaceGeneration: number;
  initialSites?: VendorSite[];
  initialRelationships?: EntityRelationship[];
}) {
  const queryClient = useQueryClient();
  const can = useAuthStore((state) => state.can);
  // V2 ownership rule: Vendor maintains operating sites; company users view & assign sites only.
  const canManageSites = false;
  const canReadEntityConfiguration = can(
    "vendor.entity_configuration",
    "manage",
  );
  const canManageEntityConfiguration = canReadEntityConfiguration;
  const cachedRelationships = queryClient.getQueryData<EntityRelationship[]>([
    "vendor-management",
    "entity-relationships",
    vendorId,
    workspaceGeneration,
  ]);
  const [sites, setSites] = useState<VendorSite[]>(initialSites);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [controlsRelationship, setControlsRelationship] =
    useState<EntityRelationship | null>(null);
  const [relationships, setRelationships] = useState<EntityRelationship[]>(
    cachedRelationships && cachedRelationships.length > 0
      ? cachedRelationships
      : initialRelationships,
  );
  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(
    (!cachedRelationships || cachedRelationships.length === 0) &&
      initialRelationships.length === 0,
  );
  const [sitesLoading, setSitesLoading] = useState(initialSites.length === 0);
  const loading = relationshipsLoading || sitesLoading;
  const [matrixError, setMatrixError] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<VendorSite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createRelationshipOpen, setCreateRelationshipOpen] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<{
    action: LifecycleAction;
    relationship: EntityRelationship;
  } | null>(null);
  const [assignmentRelationship, setAssignmentRelationship] =
    useState<EntityRelationship | null>(null);
  const [selectedSiteForAssignment, setSelectedSiteForAssignment] =
    useState<string | null>(null);
  const [endingAssignment, setEndingAssignment] = useState<{
    relationship: EntityRelationship;
    assignment: SiteAssignment;
  } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const isCurrent = () =>
        !signal?.aborted &&
        workspaceGeneration === useEntityWorkspaceStore.getState().generation;
      if (!isCurrent()) return;
      setMatrixError(false);
      try {
        const sitesRequest = axiosInstance
          .get(`/vendor-network/v2/vendors/${vendorId}/sites`, { signal })
          .catch(async (err) => {
            if (isAxiosError(err) && err.response?.status === 404) {
              return axiosInstance
                .get(`/vendor-management/${vendorId}/sites`, { signal })
                .catch(() => null);
            }
            return null;
          });
        const relationshipRequest = canReadEntityConfiguration
          ? axiosInstance
              .get(`/vendor-management/${vendorId}/entity-relationships`, {
                signal,
              })
              .catch(() => null)
          : Promise.resolve(null);
        const [sitesResponse, relationshipsResponse] = await Promise.all([
          sitesRequest,
          relationshipRequest,
        ]);
        if (!isCurrent()) return;
        if (sitesResponse) {
          const normalizedSites = unwrapArray<
            VendorSite & { address?: string; siteId?: string }
          >(sitesResponse, "sites").map((s) => ({
            ...s,
            vendorSiteId: s.vendorSiteId || s.siteId || "",
            addressLine1:
              s.addressLine1 || s.address || s.legacyAddressText || null,
          }));
          if (normalizedSites.length > 0 || initialSites.length === 0) {
            setSites(normalizedSites);
          }
        }
        if (relationshipsResponse) {
          const unwrapped = unwrapArray<EntityRelationship>(
            relationshipsResponse,
            "relationships",
          );
          if (unwrapped.length > 0 || initialRelationships.length === 0) {
            setRelationships(unwrapped);
            queryClient.setQueryData(
              [
                "vendor-management",
                "entity-relationships",
                vendorId,
                workspaceGeneration,
              ],
              unwrapped,
            );
          }
        }
      } catch {
        if (!isCurrent()) return;
        setMatrixError(true);
      } finally {
        if (isCurrent()) {
          setRelationshipsLoading(false);
          setSitesLoading(false);
        }
      }
    },
    [
      axiosInstance,
      vendorId,
      canReadEntityConfiguration,
      workspaceGeneration,
      initialSites.length,
      initialRelationships.length,
      queryClient,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => {
      controller.abort();
    };
  }, [load]);

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
        await axiosInstance.patch(
          `/vendor-management/${vendorId}/sites/${editingSite.vendorSiteId}`,
          payload,
        );
      } else {
        await axiosInstance.post(
          `/vendor-management/${vendorId}/sites`,
          payload,
        );
      }
      toast.success(
        editingSite ? "Vendor site updated." : "Vendor site added.",
      );
      setSiteDialogOpen(false);
      setEditingSite(null);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch {
      toast.error(
        "Could not save the vendor site. Check the required fields and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inactivateSite = async (site: VendorSite, reason: string) => {
    setSubmitting(true);
    try {
      await axiosInstance.patch(
        `/vendor-management/${vendorId}/sites/${site.vendorSiteId}`,
        {
          status: "inactive",
          inactivationReason: reason.trim(),
        },
      );
      toast.success(
        "Vendor site inactivated. Historical records were preserved.",
      );
      setSiteDialogOpen(false);
      setEditingSite(null);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch {
      toast.error("Could not inactivate the vendor site. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadLegalEntities = async () => {
    try {
      const response = await axiosInstance.get(
        "/vendor-management/legal-entities",
      );
      setLegalEntities(
        unwrap<{ entities: LegalEntityOption[] }>(response).entities || [],
      );
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
      try {
        await axiosInstance.post("/vendor-network/v2/entity-invitations", {
          vendorId,
          legalEntityId,
        });
        toast.success(
          "Entity connection invitation sent to vendor. Review and approve once accepted.",
        );
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          await axiosInstance.post(
            `/vendor-management/${vendorId}/entity-relationships`,
            { legalEntityId },
          );
          toast.success(
            "Vendor relationship started. Approve it when the entity is ready to transact.",
          );
        } else {
          throw err;
        }
      }
      setCreateRelationshipOpen(false);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Could not start this vendor relationship."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const transitionRelationship = async (
    relationship: EntityRelationship,
    action: LifecycleAction,
    reason: string,
  ) => {
    setSubmitting(true);
    try {
      if (action === "approve") {
        try {
          await axiosInstance.post(
            `/vendor-network/v2/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/approve`,
            {
              decision: "approved",
              reason: reason.trim() || "Approved for legal entity",
            },
          );
        } catch (err) {
          if (isAxiosError(err) && err.response?.status === 404) {
            await axiosInstance.post(
              `/vendor-management/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/approve`,
              {
                expectedVersion: relationship.configurationVersion,
                ...(reason.trim() ? { reason: reason.trim() } : {}),
              },
            );
          } else {
            throw err;
          }
        }
      } else {
        await axiosInstance.post(
          `/vendor-management/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/${action}`,
          {
            expectedVersion: relationship.configurationVersion,
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          },
        );
      }
      toast.success(
        `Vendor relationship ${action === "approve" ? "approved" : action === "suspend" ? "suspended" : "reactivated"}.`,
      );
      setLifecycleAction(null);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error(
          "This relationship changed elsewhere. The latest configuration has been loaded for review.",
        );
        await invalidateVendorManagement(queryClient);
        await load();
      } else {
        toast.error(
          apiErrorMessage(error, "Could not update this vendor relationship."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const createAssignments = async (
    relationship: EntityRelationship,
    entries: Array<{
      vendorSiteId: string;
      purposes: AssignmentPurpose[];
    }>,
    effectiveFrom?: string,
    effectiveTo?: string,
  ) => {
    const validEntries = entries.filter(
      (entry) => entry.vendorSiteId && entry.purposes.length > 0,
    );
    if (!validEntries.length) {
      toast.error("Select at least one site and purpose.");
      return;
    }
    setSubmitting(true);
    try {
      try {
        await axiosInstance.post(
          `/vendor-network/v2/vendors/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/site-assignments`,
          {
            siteAssignments: validEntries.map((entry) => ({
              vendorSiteId: entry.vendorSiteId,
              purposes: entry.purposes,
              ...(effectiveFrom ? { effectiveFrom } : {}),
              ...(effectiveTo ? { effectiveTo } : {}),
            })),
          },
        );
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          for (const entry of validEntries) {
            for (const purpose of entry.purposes) {
              await axiosInstance.post(
                `/vendor-management/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/site-assignments`,
                {
                  vendorSiteId: entry.vendorSiteId,
                  purpose,
                  ...(effectiveFrom ? { effectiveFrom } : {}),
                  ...(effectiveTo ? { effectiveTo } : {}),
                },
              );
            }
          }
        } else {
          throw err;
        }
      }
      const totalPurposes = validEntries.reduce(
        (sum, entry) => sum + entry.purposes.length,
        0,
      );
      toast.success(
        validEntries.length === 1
          ? totalPurposes === 1
            ? `${purposeLabel[validEntries[0].purposes[0]]} site assigned.`
            : `${totalPurposes} purposes assigned for site.`
          : `Assigned ${totalPurposes} purposes across ${validEntries.length} sites.`,
      );
      setAssignmentRelationship(null);
      setSelectedSiteForAssignment(null);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not assign vendor site purposes."));
    } finally {
      setSubmitting(false);
    }
  };

  const endAssignment = async (
    relationship: EntityRelationship,
    assignment: SiteAssignment,
    reason: string,
    putPurchasingOnHold: boolean,
  ) => {
    setSubmitting(true);
    try {
      await axiosInstance.patch(
        `/vendor-management/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/site-assignments/${assignment.vendorEntitySiteAssignmentId}`,
        {
          status: "inactive",
          inactivationReason: reason.trim(),
          ...(putPurchasingOnHold ? {
            putPurchasingOnHold: true,
            expectedVersion: relationship.configurationVersion,
          } : {}),
        },
      );
      toast.success(
        putPurchasingOnHold
          ? "Site assignment ended and purchasing placed on hold for this legal entity."
          : "Site assignment ended. Historical transactions were preserved.",
      );
      setEndingAssignment(null);
      await invalidateVendorManagement(queryClient);
      await load();
    } catch (error) {
      if (
        isAxiosError(error) &&
        shouldRefreshAfterEndConflict(error.response?.data, assignment.purpose)
      ) {
        setEndingAssignment(null);
        toast.error("The purchasing configuration changed. Refreshing it now; select End again to review the current impact.");
        await load();
      } else {
        toast.error(apiErrorMessage(error, "Could not end this site assignment."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setPurchasing = async (
    relationship: EntityRelationship,
    enabled: boolean,
  ) => {
    if (enabled && !activeAssignment(relationship, "purchasing")) {
      toast.error(
        "Assign an active purchasing site before enabling purchasing.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await axiosInstance.patch(
        `/vendor-management/${vendorId}/entity-relationships/${relationship.vendorEntityRelationshipId}/controls`,
        {
          expectedVersion: relationship.configurationVersion,
          purchasingEnabled: enabled,
        },
      );
      toast.success(
        enabled
          ? "Purchasing enabled for this legal entity."
          : "Purchasing placed on hold for this legal entity.",
      );
      await invalidateVendorManagement(queryClient);
      await load();
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error(
          "This relationship changed elsewhere. The latest configuration has been loaded for review.",
        );
        await invalidateVendorManagement(queryClient);
        await load();
      } else {
        toast.error(
          apiErrorMessage(error, "Could not update purchasing controls."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const safeSites = Array.isArray(sites) ? sites : [];
  const safeRelationships = Array.isArray(relationships) ? relationships : [];

  const inactiveSites = useMemo(
    () => safeSites.filter((site) => site.status === "inactive").length,
    [safeSites],
  );
  const relationshipSummary = useMemo(
    () => ({
      ready: safeRelationships.filter(
        (relationship) => nextSetupStep(relationship).tone === "ready",
      ).length,
      needsAction: safeRelationships.filter(
        (relationship) => nextSetupStep(relationship).tone === "pending",
      ).length,
      suspended: safeRelationships.filter(
        (relationship) => relationship.status === "suspended",
      ).length,
    }),
    [safeRelationships],
  );
  const assignmentCountBySite = useMemo(() => {
    const counts = new Map<string, number>();
    safeRelationships
      .flatMap((relationship) => relationship.siteAssignments || [])
      .filter(
        (assignment) =>
          assignment && assignment.status === "active" && assignment.vendorSiteId,
      )
      .forEach((assignment) => {
        counts.set(
          assignment.vendorSiteId as string,
          (counts.get(assignment.vendorSiteId as string) || 0) + 1,
        );
      });
    return counts;
  }, [safeRelationships]);
  const selectedSite =
    safeSites.find((site) => site.vendorSiteId === selectedSiteId) || null;

  return (
    <section className="space-y-5">
      {selectedSite ? (
        <SiteWorkspace
          site={selectedSite}
          relationships={relationships}
          canManage={canManageSites}
          onBack={() => setSelectedSiteId(null)}
          onEdit={() => {
            setEditingSite(selectedSite);
            setSiteDialogOpen(true);
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-4">
              {!canReadEntityConfiguration ? (
                <PermissionNotice />
              ) : relationshipsLoading ? (
                <PanelSkeleton />
              ) : matrixError ? (
                <LoadFailure onRetry={load} />
              ) : safeRelationships.length === 0 ? (
                <EmptyMatrix />
              ) : (
                safeRelationships.map((relationship) => (
                  <RelationshipRow
                    key={relationship.vendorEntityRelationshipId}
                    relationship={relationship}
                    canApprove={canManageEntityConfiguration}
                    canSuspend={canManageEntityConfiguration}
                    canReactivate={canManageEntityConfiguration}
                    activeSites={safeSites.filter(
                      (site) => site.status === "active",
                    )}
                    submitting={submitting}
                    onLifecycle={(action) =>
                      setLifecycleAction({ action, relationship })
                    }
                    onAssignSite={(siteId) => {
                      setAssignmentRelationship(relationship);
                      setSelectedSiteForAssignment(siteId || null);
                    }}
                    onEndAssignment={(assignment) =>
                      setEndingAssignment({ relationship, assignment })
                    }
                    onEditControls={() =>
                      setControlsRelationship(relationship)
                    }
                    onSetPurchasing={(enabled) =>
                      void setPurchasing(relationship, enabled)
                    }
                  />
                ))
              )}
            </div>

            <div className="lg:col-span-5 rounded-[14px] border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide">
                  Vendor Sites
                </h2>
                {canManageSites && (
                  <button
                    onClick={() => {
                      setEditingSite(null);
                      setSiteDialogOpen(true);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"
                  >
                    <Plus className="h-4 w-4" />
                    Add site
                  </button>
                )}
              </div>
              {sitesLoading ? (
                <PanelSkeleton />
              ) : matrixError ? (
                <LoadFailure onRetry={load} />
              ) : safeSites.length === 0 ? (
                <p className="rounded-[8px] border border-dashed border-black/[0.12] p-4 text-[13px] text-[#68726d] text-center">
                  No vendor sites have been added.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {safeSites.map((site) => (
                    <SiteRow
                      key={site.vendorSiteId}
                      site={site}
                      assignmentCount={
                        assignmentCountBySite.get(site.vendorSiteId) || 0
                      }
                      canManage={canManageSites}
                      onOpen={() => setSelectedSiteId(site.vendorSiteId)}
                      onEdit={() => {
                        setEditingSite(site);
                        setSiteDialogOpen(true);
                      }}
                      onQuickAssign={() => {
                        if (safeRelationships.length > 0) {
                          setAssignmentRelationship(safeRelationships[0]);
                          setSelectedSiteForAssignment(site.vendorSiteId);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
              {inactiveSites > 0 && (
                <p className="mt-3 text-[11px] text-[#84908a]">
                  Inactive sites remain visible for historical context and
                  cannot be assigned to new activity.
                </p>
              )}
            </div>
          </div>
        </>
      )}
      <RelationshipControlsDialog
        key={controlsRelationship?.vendorEntityRelationshipId || "closed"}
        relationship={controlsRelationship}
        onClose={() => setControlsRelationship(null)}
        onSave={async (controls) => {
          if (!controlsRelationship) return;
          const changes = changedRelationshipControls(controlsRelationship, controls);
          if (!Object.keys(changes).length) {
            setControlsRelationship(null);
            return;
          }
          await axiosInstance.patch(
            `/vendor-management/${vendorId}/entity-relationships/${controlsRelationship.vendorEntityRelationshipId}/controls`,
            {
              ...changes,
              expectedVersion: controlsRelationship.configurationVersion,
            },
          );
          setControlsRelationship(null);
          await invalidateVendorManagement(queryClient);
          await load();
        }}
      />
      <SiteDialog
        open={siteDialogOpen}
        site={editingSite}
        submitting={submitting}
        onOpenChange={(open) => {
          setSiteDialogOpen(open);
          if (!open) setEditingSite(null);
        }}
        onSave={saveSite}
        onInactivate={inactivateSite}
      />
      <LifecycleDialog
        actionState={lifecycleAction}
        submitting={submitting}
        onOpenChange={(open) => !open && setLifecycleAction(null)}
        onSubmit={(reason) => {
          if (lifecycleAction)
            return transitionRelationship(
              lifecycleAction.relationship,
              lifecycleAction.action,
              reason,
            );
        }}
      />
      <SiteAssignmentDialog
        relationship={assignmentRelationship}
        sites={safeSites.filter((site) => site.status === "active")}
        submitting={submitting}
        initialSiteId={selectedSiteForAssignment}
        onOpenChange={(open) => {
          if (!open) {
            setAssignmentRelationship(null);
            setSelectedSiteForAssignment(null);
          }
        }}
        onCreate={(entries, effectiveFrom, effectiveTo) => {
          if (assignmentRelationship)
            return createAssignments(
              assignmentRelationship,
              entries,
              effectiveFrom,
              effectiveTo,
            );
        }}
      />
      <EndAssignmentDialog
        state={endingAssignment}
        submitting={submitting}
        onOpenChange={(open) => !open && setEndingAssignment(null)}
        onSubmit={(reason, putPurchasingOnHold) => {
          if (endingAssignment)
            return endAssignment(
              endingAssignment.relationship,
              endingAssignment.assignment,
              reason,
              putPurchasingOnHold,
            );
        }}
      />
    </section>
  );
}

function RelationshipRow({
  relationship,
  canApprove,
  canSuspend: _canSuspend,
  canReactivate,
  activeSites,
  submitting,
  onLifecycle,
  onAssignSite,
  onEndAssignment,
  onSetPurchasing,
  onEditControls,
}: {
  relationship: EntityRelationship;
  canApprove: boolean;
  canSuspend: boolean;
  canReactivate: boolean;
  activeSites: VendorSite[];
  submitting: boolean;
  onLifecycle: (action: LifecycleAction) => void;
  onAssignSite: (siteId?: string) => void;
  onEndAssignment: (assignment: SiteAssignment) => void;
  onSetPurchasing: (enabled: boolean) => void;
  onEditControls: () => void;
}) {
  const entityName =
    relationship.legalEntity?.displayName ||
    relationship.legalEntity?.legalName ||
    "Unknown legal entity";

  const activeAssignments = (relationship.siteAssignments || []).filter(
    (a) => a.status === "active" && a.site?.status === "active",
  );

  const siteAssignmentsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        site: Pick<
          VendorSite,
          "vendorSiteId" | "code" | "name" | "status" | "isPrimary"
        > & {
          addressLine1?: string | null;
          legacyAddressText?: string | null;
          city?: string | null;
          stateOrProvince?: string | null;
          countryCode?: string | null;
        };
        assignments: SiteAssignment[];
      }
    >();
    for (const a of activeAssignments) {
      if (!a.vendorSiteId) continue;
      const existing = map.get(a.vendorSiteId);
      if (existing) {
        existing.assignments.push(a);
      } else if (a.site) {
        map.set(a.vendorSiteId, { site: a.site, assignments: [a] });
      }
    }
    return map;
  }, [activeAssignments]);

  const hasPurchasingSite = activeAssignments.some(
    (a) => a.purpose === "purchasing",
  );

  return (
    <div className="rounded-[14px] border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      {/* Unified Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide">
            Site Purpose Configuration
          </h2>
          <span className="text-[12px] font-medium text-[#68726d]">
            · {entityName}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusClass[relationship.status]}`}
          >
            {relationship.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <button
              type="button"
              onClick={onEditControls}
              disabled={submitting}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#39423e] hover:bg-[#f9faf9] transition-colors shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#68726d]" />
              Financial controls
            </button>
          )}
          {/* {relationship.status === "approved" && _canSuspend && (
            <button
              type="button"
              onClick={() => onLifecycle("suspend")}
              disabled={submitting}
              className="inline-flex h-8 items-center rounded-[8px] border border-[#fbd5d5] bg-white px-3 text-[12px] font-semibold text-[#d33d44] hover:bg-[#fdf2f2] transition-colors cursor-pointer"
            >
              Suspend
            </button>
          )} */}
          {relationship.status === "pending" && canApprove && (
            <button
              type="button"
              onClick={() => onLifecycle("approve")}
              disabled={submitting}
              className="inline-flex h-8 items-center rounded-[8px] bg-[#087f70] px-3.5 text-[12px] font-semibold text-white hover:bg-[#076b5e] transition-colors cursor-pointer"
            >
              Approve
            </button>
          )}
          {relationship.status === "suspended" && canReactivate && (
            <button
              type="button"
              onClick={() => onLifecycle("reactivate")}
              disabled={submitting}
              className="inline-flex h-8 items-center rounded-[8px] bg-[#087f70] px-3.5 text-[12px] font-semibold text-white hover:bg-[#076b5e] transition-colors cursor-pointer"
            >
              Reactivate
            </button>
          )}
          {canApprove && (
            <button
              type="button"
              onClick={() => onAssignSite()}
              disabled={submitting || activeSites.length === 0}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white px-3 text-[12px] font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign site & purposes
            </button>
          )}
        </div>
      </div>

      {/* Assigned Sites List */}
      {siteAssignmentsMap.size === 0 ? (
        <div className="rounded-[10px] border border-dashed border-black/[0.12] p-5 text-center bg-[#fafbfa]">
          <MapPin className="h-6 w-6 text-[#a0aaa5] mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#0b100e]">
            No locations assigned yet
          </p>
          <p className="text-[12px] text-[#68726d] mt-1 max-w-md mx-auto">
            Assign vendor operating sites to authorize purchasing, invoicing, or payment remittance for this entity.
          </p>
          {canApprove && activeSites.length > 0 && (
            <button
              type="button"
              onClick={() => onAssignSite()}
              disabled={submitting}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-[#00a389] hover:bg-[#008f78] text-white px-3.5 text-[12px] font-semibold cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign first site
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {Array.from(siteAssignmentsMap.entries()).map(
            ([siteId, { site, assignments }]) => (
              <div
                key={siteId}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-[10px] border border-black/[0.07] bg-white p-3.5 hover:border-black/[0.12] transition-colors"
              >
                {/* Site Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f0faf8] text-[#087f70]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-[#0b100e] truncate">
                        {site.name}
                      </p>
                      {site.isPrimary && (
                        <span className="rounded bg-[#e8f7f2] px-1.5 py-0.2 text-[10px] font-semibold text-[#087f70]">
                          Primary
                        </span>
                      )}
                      {site.code && (
                        <span className="text-[11px] font-medium text-[#84908a]">
                          ({site.code})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#68726d] truncate mt-0.5">
                      {[
                        site.addressLine1 || site.legacyAddressText,
                        site.city,
                        site.stateOrProvince,
                        site.countryCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                {/* Purpose Badges & Configure Button */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                  {assignments.map((assignment) => {
                    const p = assignment.purpose;
                    const toneClasses =
                      p === "purchasing"
                        ? "bg-[#e7f6f2] text-[#087f70] border-[#c8eee6]"
                        : p === "invoicing"
                          ? "bg-[#eaf3ff] text-[#1b64da] border-[#cce0ff]"
                          : "bg-[#f5eefc] text-[#7828c8] border-[#ebd6fc]";
                    return (
                      <div
                        key={assignment.vendorEntitySiteAssignmentId}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[11px] font-semibold ${toneClasses}`}
                      >
                        <span>{purposeLabel[p]}</span>
                        {canApprove && (
                          <button
                            type="button"
                            onClick={() => onEndAssignment(assignment)}
                            title={`Remove ${purposeLabel[p]} purpose`}
                            className="hover:opacity-75 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {canApprove && (
                    <button
                      type="button"
                      onClick={() => onAssignSite(siteId)}
                      disabled={submitting}
                      className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-black/[0.08] bg-white px-2.5 text-[11px] font-semibold text-[#087f70] hover:bg-[#f0faf8] transition-colors cursor-pointer shadow-2xs"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      Configure
                    </button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Footer: Purchasing Status and Control */}
      <div className="pt-3 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
        <div className="flex items-center gap-2">
          {relationship.purchasingEnabled ? (
            <span className="flex items-center gap-1.5 font-medium text-[#087f70]">
              <CheckCircle2 className="w-4 h-4" />
              Purchasing is active for this entity
            </span>
          ) : !hasPurchasingSite ? (
            <span className="flex items-center gap-1.5 font-medium text-[#84908a]">
              <Clock3 className="w-4 h-4" />
              No purchasing site assigned yet
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-[#b27b00]">
              <Clock3 className="w-4 h-4" />
              Purchasing access is on hold
            </span>
          )}
        </div>

        {canApprove && relationship.status === "approved" && (
          <button
            type="button"
            onClick={() => onSetPurchasing(!relationship.purchasingEnabled)}
            disabled={submitting || (!relationship.purchasingEnabled && !hasPurchasingSite)}
            className={`text-[12px] font-semibold hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ${
              relationship.purchasingEnabled
                ? "text-[#d33d44]"
                : "text-[#087f70]"
            }`}
          >
            {relationship.purchasingEnabled
              ? "Put purchasing on hold"
              : "Enable purchasing"}
          </button>
        )}
      </div>
    </div>
  );
}


function LifecycleDialog({
  actionState,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  actionState: {
    action: LifecycleAction;
    relationship: EntityRelationship;
  } | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void> | void;
}) {
  const open = Boolean(actionState);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {actionState && (
          <LifecycleForm
            key={`${actionState.action}-${actionState.relationship.vendorEntityRelationshipId}-${actionState.relationship.configurationVersion}`}
            actionState={actionState}
            submitting={submitting}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LifecycleForm({
  actionState,
  submitting,
  onClose,
  onSubmit,
}: {
  actionState: { action: LifecycleAction; relationship: EntityRelationship };
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const entityName =
    actionState.relationship.legalEntity?.displayName ||
    actionState.relationship.legalEntity?.legalName ||
    "this legal entity";
  const config =
    actionState.action === "approve"
      ? {
          title: "Approve vendor relationship",
          button: "Approve relationship",
          detail:
            "Approval allows this entity to be configured for operational use. Purchasing still requires an active purchasing site.",
        }
      : actionState.action === "suspend"
        ? {
            title: "Suspend vendor relationship",
            button: "Suspend relationship",
            detail:
              "Suspension blocks new activity for this entity but preserves issued PO and invoice history.",
          }
        : {
            title: "Reactivate vendor relationship",
            button: "Reactivate relationship",
            detail:
              "Reactivation restores the approved relationship. Purpose controls remain subject to their existing site prerequisites.",
          };
  return (
    <>
      <DialogHeader>
        <DialogTitle>{config.title}</DialogTitle>
        <DialogDescription>
          {entityName}: {config.detail}
        </DialogDescription>
      </DialogHeader>
      <label className="block text-[12px] font-semibold text-[#39423e]">
        Reason {actionState.action === "suspend" ? "*" : "(optional)"}
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder={
            actionState.action === "suspend"
              ? "Why must this vendor be suspended for this entity?"
              : "Add approval or reactivation context"
          }
          className="mt-1.5 w-full rounded-[8px] border border-black/[0.1] p-3 text-[13px] outline-none placeholder:text-[#a0aaa5] focus:border-[#087f70]"
        />
      </label>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={
            submitting || (actionState.action === "suspend" && !reason.trim())
          }
          onClick={() => void onSubmit(reason)}
          className={`h-10 rounded-[8px] px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${actionState.action === "suspend" ? "bg-[#d33d44] hover:bg-[#c33339]" : "bg-[#087f70] hover:bg-[#076b5e]"}`}
        >
          {submitting ? "Saving..." : config.button}
        </button>
      </DialogFooter>
    </>
  );
}

function SiteAssignmentDialog({
  relationship,
  sites,
  submitting,
  onOpenChange,
  onCreate,
  initialSiteId,
}: {
  relationship: EntityRelationship | null;
  sites: VendorSite[];
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    entries: Array<{
      vendorSiteId: string;
      purposes: AssignmentPurpose[];
    }>,
    effectiveFrom?: string,
    effectiveTo?: string,
  ) => Promise<void> | void;
  initialSiteId?: string | null;
}) {
  const open = Boolean(relationship);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[660px] p-6 rounded-[14px] max-h-[90vh] flex flex-col">
        {relationship && (
          <SiteAssignmentForm
            key={`${relationship.vendorEntityRelationshipId}-${relationship.configurationVersion}-${initialSiteId || "all"}`}
            relationship={relationship}
            sites={sites}
            submitting={submitting}
            onClose={() => onOpenChange(false)}
            onCreate={onCreate}
            initialSiteId={initialSiteId || undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SiteAssignmentForm({
  relationship,
  sites,
  submitting,
  onClose,
  onCreate,
  initialSiteId,
}: {
  relationship: EntityRelationship;
  sites: VendorSite[];
  submitting: boolean;
  onClose: () => void;
  onCreate: (
    entries: Array<{
      vendorSiteId: string;
      purposes: AssignmentPurpose[];
    }>,
    effectiveFrom?: string,
    effectiveTo?: string,
  ) => Promise<void> | void;
  initialSiteId?: string;
}) {
  const allPurposesList: AssignmentPurpose[] = [
    "purchasing",
    "invoicing",
    "remit_to",
  ];

  const orderedSites = useMemo(() => {
    return [...sites].sort((a, b) => {
      if (initialSiteId) {
        if (a.vendorSiteId === initialSiteId) return -1;
        if (b.vendorSiteId === initialSiteId) return 1;
      }
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [sites, initialSiteId]);

  const activePurposesBySite = useMemo(() => {
    const map = new Map<string, Set<AssignmentPurpose>>();
    for (const a of relationship.siteAssignments || []) {
      if (a.status === "active" && a.vendorSiteId) {
        if (!map.has(a.vendorSiteId)) {
          map.set(a.vendorSiteId, new Set());
        }
        map.get(a.vendorSiteId)!.add(a.purpose);
      }
    }
    return map;
  }, [relationship.siteAssignments]);

  const [purposesBySite, setPurposesBySite] = useState<
    Record<string, AssignmentPurpose[]>
  >(() => {
    const initial: Record<string, AssignmentPurpose[]> = {};
    let hasAny = false;
    for (const site of sites) {
      const existing = Array.from(
        activePurposesBySite.get(site.vendorSiteId) || [],
      );
      if (existing.length > 0) {
        initial[site.vendorSiteId] = existing;
        hasAny = true;
      } else {
        initial[site.vendorSiteId] = [];
      }
    }
    if (initialSiteId) {
      if (!initial[initialSiteId] || initial[initialSiteId].length === 0) {
        initial[initialSiteId] = [...allPurposesList];
      }
    } else if (!hasAny && orderedSites[0]) {
      initial[orderedSites[0].vendorSiteId] = [...allPurposesList];
    }
    return initial;
  });

  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  const entityName =
    relationship.legalEntity?.displayName ||
    relationship.legalEntity?.legalName ||
    "this legal entity";

  const allPurposeOptions: {
    id: AssignmentPurpose;
    title: string;
    subtitle: string;
  }[] = [
    {
      id: "purchasing",
      title: "Purchasing",
      subtitle: "Purchase orders",
    },
    {
      id: "invoicing",
      title: "Invoicing",
      subtitle: "Bills & invoices",
    },
    {
      id: "remit_to",
      title: "Remit-to",
      subtitle: "Payments",
    },
  ];

  const toggleSitePurpose = (siteId: string, purpose: AssignmentPurpose) => {
    setPurposesBySite((prev) => {
      const current = prev[siteId] || [];
      const next = current.includes(purpose)
        ? current.filter((p) => p !== purpose)
        : [...current, purpose];
      return {
        ...prev,
        [siteId]: next,
      };
    });
  };

  const toggleAllForSite = (siteId: string) => {
    setPurposesBySite((prev) => {
      const current = prev[siteId] || [];
      const isAllSelected = current.length === allPurposesList.length;
      return {
        ...prev,
        [siteId]: isAllSelected ? [] : [...allPurposesList],
      };
    });
  };

  const isEverySiteAllPurposes = useMemo(() => {
    if (orderedSites.length === 0) return false;
    return orderedSites.every(
      (s) => (purposesBySite[s.vendorSiteId] || []).length === allPurposesList.length,
    );
  }, [orderedSites, purposesBySite, allPurposesList.length]);

  const handleToggleAllSitesAndPurposes = () => {
    setPurposesBySite(() => {
      const next: Record<string, AssignmentPurpose[]> = {};
      for (const s of orderedSites) {
        next[s.vendorSiteId] = isEverySiteAllPurposes ? [] : [...allPurposesList];
      }
      return next;
    });
  };

  const selectedEntries = useMemo(() => {
    return orderedSites
      .map((s) => ({
        vendorSiteId: s.vendorSiteId,
        purposes: purposesBySite[s.vendorSiteId] || [],
      }))
      .filter((entry) => entry.purposes.length > 0);
  }, [orderedSites, purposesBySite]);

  const totalSelectedPurposes = useMemo(
    () => selectedEntries.reduce((sum, e) => sum + e.purposes.length, 0),
    [selectedEntries],
  );

  const invalidDates = Boolean(
    effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom,
  );

  return (
    <>
      <DialogHeader className="space-y-1.5 text-left shrink-0">
        <DialogTitle className="text-[18px] font-bold text-[#0b100e]">
          Configure Site Purposes
        </DialogTitle>
        <DialogDescription className="text-[13px] text-[#68726d]">
          Select one or more operating locations for{" "}
          <strong className="text-[#0b100e]">{entityName}</strong> and assign
          their permitted purposes individually or all at once.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
        {/* Global Multi-Site Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-[#39423e]">
              Vendor Sites & Permitted Purposes
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#e7f6f2] text-[#087f70]">
              {selectedEntries.length}{" "}
              {selectedEntries.length === 1 ? "site" : "sites"} ·{" "}
              {totalSelectedPurposes}{" "}
              {totalSelectedPurposes === 1 ? "purpose" : "purposes"}
            </span>
          </div>

          {orderedSites.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllSitesAndPurposes}
              className="text-[12px] font-semibold text-[#00a389] hover:underline cursor-pointer"
            >
              {isEverySiteAllPurposes
                ? "Clear all selections"
                : orderedSites.length > 1
                  ? "Select all purposes for all sites"
                  : "Select all purposes"}
            </button>
          )}
        </div>

        {/* Multi-Site Matrix List */}
        <div className="space-y-3">
          {orderedSites.map((site) => {
            const sitePurposes = purposesBySite[site.vendorSiteId] || [];
            const activeSet =
              activePurposesBySite.get(site.vendorSiteId) || new Set();
            const hasAnySelected = sitePurposes.length > 0;
            const hasAllSelected = sitePurposes.length === allPurposesList.length;
            const location = [
              site.addressLine1 || site.legacyAddressText,
              site.city,
              site.stateOrProvince,
              site.countryCode,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <div
                key={site.vendorSiteId}
                className={`rounded-[12px] border p-4 transition-colors ${
                  hasAnySelected
                    ? "border-[#00a389]/50 bg-[#f9fdfc]"
                    : "border-black/[0.08] bg-white"
                }`}
              >
                {/* Site Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div
                    onClick={() => toggleAllForSite(site.vendorSiteId)}
                    className="flex items-start gap-2.5 cursor-pointer min-w-0 flex-1"
                  >
                    <Checkbox
                      checked={hasAnySelected}
                      onCheckedChange={() => toggleAllForSite(site.vendorSiteId)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[13px] font-bold text-[#0b100e]">
                          {site.name}
                        </p>
                        {site.code && (
                          <span className="text-[11px] font-medium text-[#84908a]">
                            ({site.code})
                          </span>
                        )}
                        {site.isPrimary && (
                          <span className="rounded bg-[#e8f7f2] px-1.5 py-0.2 text-[10px] font-semibold text-[#087f70]">
                            Primary
                          </span>
                        )}
                      </div>
                      {location && (
                        <p className="text-[11px] text-[#68726d] mt-0.5 truncate">
                          {location}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAllForSite(site.vendorSiteId)}
                    className="text-[11px] font-semibold text-[#00a389] hover:underline cursor-pointer shrink-0"
                  >
                    {hasAllSelected ? "Deselect all" : "All purposes"}
                  </button>
                </div>

                {/* 3-Column Purpose Toggles for this Site */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {allPurposeOptions.map((opt) => {
                    const isSelected = sitePurposes.includes(opt.id);
                    const isAlreadyActive = activeSet.has(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() =>
                          toggleSitePurpose(site.vendorSiteId, opt.id)
                        }
                        className={`p-2.5 rounded-[8px] border transition-colors cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? "border-[#00a389] bg-[#f0faf8]"
                            : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleSitePurpose(site.vendorSiteId, opt.id)
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[12px] font-semibold text-[#0b100e]">
                              {opt.title}
                            </p>
                            {isAlreadyActive && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#e7f6f2] text-[#087f70]">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#68726d] mt-0.5">
                            {opt.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Date fields (optional) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Field
            label="Effective from (optional)"
            value={effectiveFrom}
            onChange={setEffectiveFrom}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label="Effective to (optional)"
            value={effectiveTo}
            onChange={setEffectiveTo}
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      {invalidDates && (
        <p className="mt-2 rounded-[7px] bg-[#fdf2f2] p-2.5 text-xs text-[#a3454a] shrink-0">
          The end date must be after the start date.
        </p>
      )}

      <DialogFooter className="mt-5 flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-[8px] border border-black/[0.1] text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={
            submitting || selectedEntries.length === 0 || invalidDates
          }
          onClick={() =>
            void onCreate(
              selectedEntries,
              effectiveFrom || undefined,
              effectiveTo || undefined,
            )
          }
          className="h-10 px-6 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : selectedEntries.length > 1
              ? `Save Purposes (${selectedEntries.length} Sites)`
              : "Save Site Purposes"}
        </button>
      </DialogFooter>
    </>
  );
}

function EndAssignmentDialog({
  state,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  state: {
    relationship: EntityRelationship;
    assignment: SiteAssignment;
  } | null;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string, putPurchasingOnHold: boolean) => Promise<void> | void;
}) {
  const open = Boolean(state);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {state && (
          <EndAssignmentForm
            key={state.assignment.vendorEntitySiteAssignmentId}
            state={state}
            submitting={submitting}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SiteRow({
  site,
  assignmentCount,
  canManage,
  onOpen,
  onEdit,
  onQuickAssign,
}: {
  site: VendorSite;
  assignmentCount: number;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onQuickAssign?: () => void;
}) {
  const location = [
    site.addressLine1 || site.legacyAddressText,
    site.city,
    site.stateOrProvince,
    site.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="flex items-start gap-3 rounded-[10px] border border-black/[0.07] p-3.5 bg-white hover:border-black/[0.12] transition-colors">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f0faf8] text-[#087f70]">
        <MapPin className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-bold text-[#0b100e]">
            {site.name}
          </p>
          {site.isPrimary && (
            <span className="rounded bg-[#e8f7f2] px-1.5 py-0.2 text-[10px] font-semibold text-[#087f70]">
              Primary
            </span>
          )}
          {site.status === "inactive" && (
            <span className="rounded bg-[#f5f7f6] px-1.5 py-0.2 text-[10px] font-semibold text-[#68726d]">
              Inactive
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-[#84908a]">
          {site.code}
          {location ? ` · ${location}` : ""}
        </p>
        {site.status === "active" && (
          <p className="mt-1 text-[11px] font-medium text-[#087f70]">
            {assignmentCount === 0
              ? "Not assigned to an entity yet"
              : `Assigned to ${assignmentCount} ${assignmentCount === 1 ? "entity" : "entities"}`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onQuickAssign && site.status === "active" && (
          <button
            type="button"
            onClick={onQuickAssign}
            title="Assign this site to an entity"
            className="h-7 rounded-[6px] border border-black/[0.08] px-2 text-[11px] font-semibold text-[#087f70] hover:bg-[#f0faf8] transition-colors shadow-2xs cursor-pointer"
          >
            Assign
          </button>
        )}
        {canManage && site.status === "active" && (
          <button
            onClick={onEdit}
            className="h-7 rounded-[6px] px-2 text-[11px] font-semibold text-[#087f70] hover:bg-[#f0faf8]"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-7 items-center gap-0.5 rounded-[6px] px-2 text-[11px] font-semibold text-[#39423e] hover:bg-[#f5f7f6] cursor-pointer"
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SiteWorkspace({
  site,
  relationships,
  canManage,
  onBack,
  onEdit,
}: {
  site: VendorSite;
  relationships: EntityRelationship[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const location = [
    site.addressLine1 || site.legacyAddressText,
    site.city,
    site.stateOrProvince,
    site.postalCode,
    site.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
  const assignments = relationships.flatMap((relationship) =>
    relationship.siteAssignments
      .filter((assignment) => assignment.vendorSiteId === site.vendorSiteId)
      .map((assignment) => ({ assignment, relationship })),
  );
  return (
    <div className="space-y-5">
      <nav
        aria-label="Vendor site breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#68726d]"
      >
        <button type="button" onClick={onBack} className="hover:text-[#087f70]">
          Entity configuration
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#a0aaa5]" />
        <button type="button" onClick={onBack} className="hover:text-[#087f70]">
          Vendor sites
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-[#a0aaa5]" />
        <span className="font-semibold text-[#0b100e]">{site.name}</span>
      </nav>
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f7f2] text-[#087f70]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-semibold text-[#0b100e]">
                  {site.name}
                </h2>
                {site.isPrimary && (
                  <span className="rounded bg-[#e8f7f2] px-2 py-0.5 text-[10px] font-semibold text-[#087f70]">
                    Primary site
                  </span>
                )}
                {site.status === "inactive" && (
                  <span className="rounded bg-[#f5f7f6] px-2 py-0.5 text-[10px] font-semibold text-[#68726d]">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-[#68726d]">
                {site.code}
                {location ? ` · ${location}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="h-9 rounded-[8px] border border-black/[0.08] px-3 text-[12px] font-semibold text-[#39423e] hover:bg-[#f5f7f6]"
            >
              All sites
            </button>
            {canManage && (
              <button
                type="button"
                onClick={onEdit}
                className="h-9 rounded-[8px] bg-[#087f70] px-3 text-[12px] font-semibold text-white hover:bg-[#076b5e]"
              >
                Edit site
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-black/[0.06] pt-5 sm:grid-cols-3">
          <SiteDetail
            label="Status"
            value={site.status === "active" ? "Active" : "Inactive"}
          />
          <SiteDetail
            label="Legal-entity assignments"
            value={String(
              assignments.filter(
                ({ assignment }) => assignment.status === "active",
              ).length,
            )}
          />
          <SiteDetail
            label="Use"
            value={assignments.length === 0 ? "Not assigned" : "Configured"}
          />
        </div>
      </div>
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-5 shadow-sm">
        <h3 className="text-[10px] font-bold tracking-[0.1em] text-[#84908a]">
          ENTITY ASSIGNMENTS
        </h3>
        <p className="mt-1 text-[13px] text-[#68726d]">
          Every legal entity uses this site through its own purpose-specific
          assignment.
        </p>
        {assignments.length === 0 ? (
          <p className="mt-4 rounded-[8px] border border-dashed border-black/[0.12] p-4 text-[13px] text-[#68726d]">
            This site is not assigned to a legal entity yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {assignments.map(({ assignment, relationship }) => (
              <div
                key={assignment.vendorEntitySiteAssignmentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-black/[0.07] p-3"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#0b100e]">
                    {relationship.legalEntity?.displayName ||
                      relationship.legalEntity?.legalName ||
                      "Legal entity"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#84908a]">
                    {purposeLabel[assignment.purpose]} ·{" "}
                    {assignment.status === "active" ? "Active" : "Ended"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass[relationship.status]}`}
                >
                  {relationship.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SiteDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-[#f9faf9] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#84908a]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-[#0b100e]">{value}</p>
    </div>
  );
}
function PermissionNotice() {
  return (
    <div className="rounded-[9px] border border-[#ffe099] bg-[#fff9e6] p-4">
      <div className="flex gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b27b00]" />
        <div>
          <p className="text-[13px] font-semibold text-[#6e4d00]">
            Additional permission required
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#80621b]">
            Ask an administrator for Vendor Entity Configuration Manager access
            to manage relationships, site assignments, and operating holds.
          </p>
        </div>
      </div>
    </div>
  );
}
function EmptyMatrix() {
  return (
    <div className="rounded-[10px] border border-dashed border-black/[0.12] p-6 text-center bg-[#fafbfa]">
      <Building2 className="h-8 w-8 text-[#a0aaa5] mx-auto mb-2" />
      <p className="text-[14px] font-semibold text-[#0b100e]">
        No connected legal entities
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#68726d] max-w-md mx-auto">
        This vendor is not currently connected to any of your legal entities.
        Connect this vendor from the Master Vendor Directory before configuring site purposes.
      </p>
    </div>
  );
}
function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-[9px] bg-[#f5f7f6]"
        />
      ))}
    </div>
  );
}
function LoadFailure({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[9px] border border-[#fbd5d5] bg-[#fdf2f2] p-4">
      <p className="text-[13px] font-semibold text-[#93292e]">
        Vendor setup could not be loaded.
      </p>
      <button
        onClick={() => void onRetry()}
        className="mt-2 text-[12px] font-semibold text-[#93292e] underline"
      >
        Try again
      </button>
    </div>
  );
}

function RelationshipControlsDialog({
  relationship,
  onClose,
  onSave,
}: {
  relationship: EntityRelationship | null;
  onClose: () => void;
  onSave: (controls: RelationshipControls) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [controls, setControls] = useState<RelationshipControls>(() =>
    controlsDraft(relationship),
  );

  useEffect(() => {
    if (relationship) {
      setControls(controlsDraft(relationship));
    }
  }, [relationship]);

  const entityName =
    relationship?.legalEntity?.displayName ||
    relationship?.legalEntity?.legalName ||
    "this legal entity";

  const accessOptions: {
    key: "purchasingEnabled" | "invoicingEnabled" | "paymentEnabled";
    title: string;
    description: string;
  }[] = [
    {
      key: "purchasingEnabled",
      title: "Purchasing access",
      description:
        "Authorizes this legal entity to issue purchase orders to this vendor.",
    },
    {
      key: "invoicingEnabled",
      title: "Invoicing access",
      description:
        "Permits vendor bills and invoices to be received and processed for this entity.",
    },
    {
      key: "paymentEnabled",
      title: "Payment remittance",
      description:
        "Allows disbursement and banking remittance to this vendor from this entity.",
    },
  ];

  return (
    <Dialog
      open={!!relationship}
      onOpenChange={(open) => !open && !saving && onClose()}
    >
      <DialogContent className="sm:max-w-[560px] p-6 rounded-[14px]">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-[18px] font-bold text-[#0b100e]">
            Financial & Commercial Controls
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#68726d]">
            Configure operational permissions, payment terms, and tax details for{" "}
            <strong className="text-[#0b100e]">{entityName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Operational Permissions */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold text-[#39423e]">
              Operational Permissions
            </label>
            <div className="space-y-2">
              {accessOptions.map((opt) => {
                const isChecked = controls[opt.key];
                const isDisabled = saving || relationship?.status !== "approved";
                return (
                  <div
                    key={opt.key}
                    onClick={() => {
                      if (isDisabled) return;
                      setControls((prev) => ({
                        ...prev,
                        [opt.key]: !prev[opt.key],
                      }));
                    }}
                    className={`p-3 rounded-[9px] border transition-colors cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? "border-[#00a389] bg-[#f0faf8]"
                        : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                    } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isDisabled}
                      onCheckedChange={(checked) =>
                        setControls((prev) => ({
                          ...prev,
                          [opt.key]: !!checked,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#0b100e]">
                        {opt.title}
                      </p>
                      <p className="text-[12px] text-[#68726d] mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terms & Tax Identification */}
          <div className="pt-2 space-y-3">
            <label className="block text-[12px] font-semibold text-[#39423e]">
              Terms & Tax Identification
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#68726d] mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  placeholder="e.g. Net 30"
                  className="h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#00a389]"
                  value={controls.paymentTermsCode}
                  maxLength={100}
                  disabled={saving}
                  onChange={(event) =>
                    setControls({
                      ...controls,
                      paymentTermsCode: event.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#68726d] mb-1">
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 30"
                  className="h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#00a389]"
                  value={controls.paymentTermsDays ?? ""}
                  disabled={saving}
                  onChange={(event) =>
                    setControls({
                      ...controls,
                      paymentTermsDays:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#68726d] mb-1">
                  Tax Country (2-letter code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. NG, US"
                  maxLength={2}
                  className="h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] uppercase outline-none placeholder:text-[#a0aaa5] focus:border-[#00a389]"
                  value={controls.taxCountryCode}
                  disabled={saving}
                  onChange={(event) =>
                    setControls({
                      ...controls,
                      taxCountryCode: event.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#68726d] mb-1">
                  Tax Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345678-0001"
                  maxLength={100}
                  className="h-10 w-full rounded-[8px] border border-black/[0.1] px-3 text-[13px] text-[#0b100e] outline-none placeholder:text-[#a0aaa5] focus:border-[#00a389]"
                  value={controls.taxRegistrationNumber}
                  disabled={saving}
                  onChange={(event) =>
                    setControls({
                      ...controls,
                      taxRegistrationNumber: event.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 px-5 rounded-[8px] border border-black/[0.1] text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="h-10 px-6 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(controls);
              } catch (error) {
                toast.error(
                  apiErrorMessage(
                    error,
                    "Could not save entity controls. Refresh if another administrator changed this relationship.",
                  ),
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save controls
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
