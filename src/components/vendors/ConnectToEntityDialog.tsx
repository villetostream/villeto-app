"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  FilePlus2,
  Loader2,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useInviteVendorToEntityV2,
  useVendorLegalEntityOptions,
  useVendorSitesV2,
  type ConnectedLegalEntity,
  type EntityInvitationAttachmentRequestInput,
  type VendorSitePurposeV2,
} from "@/queries/vendors/vendor-network";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ConnectToEntityDialogProps {
  open: boolean;
  onClose: () => void;
  vendorName: string;
  vendorId: string;
  connectedLegalEntities?: ConnectedLegalEntity[];
  onConnected?: (targetLegalEntityId: string) => void;
}

const ALL_PURPOSES: VendorSitePurposeV2[] = [
  "purchasing",
  "invoicing",
  "remit_to",
];

const PURPOSE_LABELS: Record<VendorSitePurposeV2, string> = {
  purchasing: "Purchasing",
  invoicing: "Invoicing",
  remit_to: "Remit-to",
};

const PRESET_DOCUMENTS: Array<{ key: string; label: string }> = [
  {
    key: "tax_clearance_certificate",
    label: "Current tax clearance certificate",
  },
  {
    key: "wht_vat_registration",
    label: "VAT / WHT registration certificate",
  },
];

function slugifyAttachmentKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function ConnectToEntityDialog({
  open,
  onClose,
  vendorName,
  vendorId,
  connectedLegalEntities = [],
  onConnected,
}: ConnectToEntityDialogProps) {
  const workspaceSelection = useEntityWorkspaceStore((s) => s.selection);

  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [requestSeparatePaymentTerms, setRequestSeparatePaymentTerms] =
    useState(false);
  const [requestSeparateBankDetails, setRequestSeparateBankDetails] =
    useState(false);

  // Map of vendorSiteId -> selected purposes (empty or length 3 = all purposes)
  const [selectedSitePurposes, setSelectedSitePurposes] = useState<
    Record<string, VendorSitePurposeV2[]>
  >({});

  const [attachmentRequests, setAttachmentRequests] = useState<
    EntityInvitationAttachmentRequestInput[]
  >([]);
  const [customDocLabel, setCustomDocLabel] = useState("");

  const { data: allLegalEntities = [] } = useVendorLegalEntityOptions(open);
  const { data: vendorSites = [], isLoading: isSitesLoading } =
    useVendorSitesV2(
      vendorId,
      { status: "active", assignment: "all", legalEntityId: "all" },
      open && advancedOpen,
    );

  const connectedIds = useMemo(
    () => new Set(connectedLegalEntities.map((e) => e.legalEntityId)),
    [connectedLegalEntities],
  );

  const eligibleEntities = useMemo(
    () =>
      allLegalEntities.filter(
        (entity) => !connectedIds.has(entity.legalEntityId),
      ),
    [allLegalEntities, connectedIds],
  );

  const activeWorkspaceEntityUnconnected = Boolean(
    workspaceSelection &&
      workspaceSelection !== "all" &&
      !connectedIds.has(workspaceSelection),
  );

  const showEntityDropdown =
    !activeWorkspaceEntityUnconnected || eligibleEntities.length > 1;

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        setMessage("");
        setAdvancedOpen(false);
        setRequestSeparatePaymentTerms(false);
        setRequestSeparateBankDetails(false);
        setSelectedSitePurposes({});
        setAttachmentRequests([]);
        setCustomDocLabel("");
        setSelectedEntityId("");
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;

    if (activeWorkspaceEntityUnconnected && workspaceSelection) {
      setSelectedEntityId(workspaceSelection);
    } else if (eligibleEntities.length === 1) {
      setSelectedEntityId(eligibleEntities[0].legalEntityId);
    }
  }, [open, activeWorkspaceEntityUnconnected, workspaceSelection, eligibleEntities.length]);

  const inviteEntityMutation = useInviteVendorToEntityV2();

  const toggleSiteSelection = (siteId: string, checked: boolean) => {
    setSelectedSitePurposes((prev) => {
      const next = { ...prev };
      if (checked) {
        next[siteId] = [...ALL_PURPOSES];
      } else {
        delete next[siteId];
      }
      return next;
    });
  };

  const toggleSitePurpose = (
    siteId: string,
    purpose: VendorSitePurposeV2,
  ) => {
    setSelectedSitePurposes((prev) => {
      const current = prev[siteId] || [...ALL_PURPOSES];
      const exists = current.includes(purpose);
      const updated = exists
        ? current.filter((p) => p !== purpose)
        : [...current, purpose];
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[siteId];
        return next;
      }
      return { ...prev, [siteId]: updated };
    });
  };

  const addAttachmentRequest = (label: string, presetKey?: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = presetKey || slugifyAttachmentKey(trimmed);
    if (!key) return;
    if (attachmentRequests.some((item) => item.key === key)) {
      toast.info("This document request has already been added.");
      return;
    }
    setAttachmentRequests((prev) => [
      ...prev,
      { key, label: trimmed, required: true },
    ]);
    if (!presetKey) setCustomDocLabel("");
  };

  const toggleAttachmentRequired = (key: string, required: boolean) => {
    setAttachmentRequests((prev) =>
      prev.map((item) => (item.key === key ? { ...item, required } : item)),
    );
  };

  const removeAttachmentRequest = (key: string) => {
    setAttachmentRequests((prev) => prev.filter((item) => item.key !== key));
  };

  const targetLegalEntityId =
    selectedEntityId ||
    (activeWorkspaceEntityUnconnected && workspaceSelection
      ? workspaceSelection
      : "");

  const handleConnect = async () => {
    if (!targetLegalEntityId) {
      toast.error("Select the legal entity to connect with this vendor.");
      return;
    }

    const siteAssignments = Object.entries(selectedSitePurposes).map(
      ([vendorSiteId, purposes]) => {
        const isAllSelected = ALL_PURPOSES.every((p) => purposes.includes(p));
        return isAllSelected
          ? { vendorSiteId }
          : { vendorSiteId, purposes };
      },
    );

    try {
      await inviteEntityMutation.mutateAsync({
        vendorId,
        legalEntityId: targetLegalEntityId,
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(requestSeparatePaymentTerms
          ? { requestSeparatePaymentTerms: true }
          : {}),
        ...(requestSeparateBankDetails
          ? { requestSeparateBankDetails: true }
          : {}),
        ...(siteAssignments.length > 0 ? { siteAssignments } : {}),
        ...(attachmentRequests.length > 0 ? { attachmentRequests } : {}),
      });

      toast.success(`Connection request sent to ${vendorName}.`);
      onConnected?.(targetLegalEntityId);
      onClose();
    } catch (err) {
      logger.error("Failed to connect entity:", err);
      toast.error(
        getApiErrorMessage(
          err,
          "Failed to send connection request. Please try again.",
        ),
      );
    }
  };

  const configuredAdvancedCount =
    (requestSeparatePaymentTerms ? 1 : 0) +
    (requestSeparateBankDetails ? 1 : 0) +
    Object.keys(selectedSitePurposes).length +
    attachmentRequests.length;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[520px] max-h-[88vh] overflow-y-auto p-6 sm:p-7 rounded-[18px] bg-white border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-[20px] font-bold text-[#0b100e]">
            Connect to Entity
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#68726d]">
            A request will be sent to the vendor to accept your legal entity.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          {/* Target Legal Entity Selector (shown when in All mode or multiple eligible entities exist) */}
          {showEntityDropdown && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#0b100e] block">
                Legal Entity
              </label>
              <Select
                value={selectedEntityId}
                onValueChange={setSelectedEntityId}
              >
                <SelectTrigger className="w-full h-10 rounded-[8px] border-black/[0.12] bg-white text-[13px]">
                  <SelectValue placeholder="Select legal entity..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEntities.map((entity) => (
                    <SelectItem
                      key={entity.legalEntityId}
                      value={entity.legalEntityId}
                      className="text-[13px]"
                    >
                      {entity.legalName}
                      {entity.code ? ` (${entity.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message (optional) — primary clean field matching design */}
          <div className="space-y-2">
            <label
              htmlFor="connect-entity-message"
              className="text-[13px] font-medium text-[#0b100e] block"
            >
              Message{" "}
              <span className="text-[#84908a] font-normal">(optional)</span>
            </label>
            <textarea
              id="connect-entity-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="You can request for more info..."
              className="w-full p-3.5 rounded-[8px] border border-black/[0.12] bg-white text-[13px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors resize-none"
            />
          </div>

          {/* Expandable Advanced Requirements Section */}
          <Collapsible
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            className="rounded-[12px] border border-black/[0.08] bg-[#f9faf9]/70 overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#f2f5f4] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#0b100e]">
                    Advanced requirements
                  </span>
                  <span className="text-[11px] text-[#84908a]">
                    (sites, terms & documents)
                  </span>
                  {configuredAdvancedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#e7f6f2] text-[#087f70] text-[10px] font-bold">
                      {configuredAdvancedCount} set
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#68726d] transition-transform duration-200 ${
                    advancedOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="px-4 pb-4 pt-2 space-y-4 border-t border-black/[0.06] bg-white">
              {/* 1. Separate Terms & Banking Overrides */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-[#84908a] uppercase tracking-wider">
                  Entity-Specific Financial Terms
                </p>

                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.06] p-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#0b100e]">
                      Request separate payment terms
                    </p>
                    <p className="text-[11px] text-[#68726d]">
                      Vendor must submit terms specifically for this entity
                    </p>
                  </div>
                  <Switch
                    checked={requestSeparatePaymentTerms}
                    onCheckedChange={setRequestSeparatePaymentTerms}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.06] p-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#0b100e]">
                      Request separate bank details
                    </p>
                    <p className="text-[11px] text-[#68726d]">
                      Require a dedicated bank account for this entity
                    </p>
                  </div>
                  <Switch
                    checked={requestSeparateBankDetails}
                    onCheckedChange={setRequestSeparateBankDetails}
                  />
                </div>
              </div>

              {/* 2. Vendor Sites & Purposes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#84908a] uppercase tracking-wider">
                    Assign Vendor Sites (optional)
                  </p>
                  <span className="text-[11px] text-[#84908a]">
                    Can also be configured later
                  </span>
                </div>

                {isSitesLoading ? (
                  <div className="flex items-center gap-2 py-3 text-[12px] text-[#68726d]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087f70]" />
                    <span>Loading vendor sites...</span>
                  </div>
                ) : vendorSites.length === 0 ? (
                  <p className="rounded-[8px] border border-dashed border-black/[0.1] p-3 text-[12px] text-[#68726d]">
                    No active vendor sites registered yet. Sites can be assigned
                    in Entity Configuration once added by the vendor.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {vendorSites.map((site) => {
                      const chosenPurposes =
                        selectedSitePurposes[site.vendorSiteId];
                      const isSelected = Boolean(chosenPurposes);
                      return (
                        <div
                          key={site.vendorSiteId}
                          className={`rounded-[8px] border p-3 transition-colors ${
                            isSelected
                              ? "border-[#00a389]/50 bg-[#f0faf8]/50"
                              : "border-black/[0.08] bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Checkbox
                              id={`site-${site.vendorSiteId}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                toggleSiteSelection(
                                  site.vendorSiteId,
                                  checked === true,
                                )
                              }
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`site-${site.vendorSiteId}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <span className="text-[13px] font-semibold text-[#0b100e] truncate">
                                  {site.name}
                                </span>
                                <span className="text-[11px] font-mono text-[#68726d]">
                                  {site.code}
                                </span>
                                {site.isPrimary && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#e7f6f2] text-[#087f70] text-[10px] font-semibold">
                                    Primary
                                  </span>
                                )}
                              </label>
                              <p className="text-[11px] text-[#68726d] flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {[
                                  site.addressLine1,
                                  site.city,
                                  site.countryCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ") || "Location on file"}
                              </p>

                              {isSelected && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                  {ALL_PURPOSES.map((purpose) => {
                                    const active =
                                      chosenPurposes.includes(purpose);
                                    return (
                                      <button
                                        key={purpose}
                                        type="button"
                                        onClick={() =>
                                          toggleSitePurpose(
                                            site.vendorSiteId,
                                            purpose,
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                                          active
                                            ? "bg-[#00a389] text-white border-[#00a389]"
                                            : "bg-white text-[#68726d] border-black/[0.12] hover:border-[#00a389]"
                                        }`}
                                      >
                                        {PURPOSE_LABELS[purpose]}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Entity-Specific Document Requests */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-[#84908a] uppercase tracking-wider">
                  Request Additional Documents
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_DOCUMENTS.map((preset) => {
                    const alreadyAdded = attachmentRequests.some(
                      (r) => r.key === preset.key,
                    );
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() =>
                          addAttachmentRequest(preset.label, preset.key)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] border border-black/[0.1] bg-[#f9faf9] hover:bg-[#eef4f2] disabled:opacity-45 text-[11px] font-medium text-[#0b100e] transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        <FilePlus2 className="w-3 h-3 text-[#087f70]" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customDocLabel}
                    onChange={(e) => setCustomDocLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAttachmentRequest(customDocLabel);
                      }
                    }}
                    placeholder="Custom document title..."
                    className="flex-1 h-9 px-3 rounded-[8px] border border-black/[0.12] bg-white text-[12px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70]"
                  />
                  <button
                    type="button"
                    disabled={!customDocLabel.trim()}
                    onClick={() => addAttachmentRequest(customDocLabel)}
                    className="h-9 px-3 rounded-[8px] border border-[#00a389] text-[#00a389] hover:bg-[#f0faf8] disabled:opacity-40 text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {attachmentRequests.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachmentRequests.map((req) => (
                      <div
                        key={req.key}
                        className="flex items-center justify-between gap-2 rounded-[8px] border border-black/[0.08] bg-[#f9faf9] px-3 py-2"
                      >
                        <span className="text-[12px] font-medium text-[#0b100e] truncate">
                          {req.label}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="inline-flex items-center gap-1.5 text-[11px] text-[#68726d] cursor-pointer">
                            <Checkbox
                              checked={req.required}
                              onCheckedChange={(val) =>
                                toggleAttachmentRequired(req.key, val === true)
                              }
                            />
                            <span>Required</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeAttachmentRequest(req.key)}
                            className="text-[#84908a] hover:text-[#d33d44] transition-colors cursor-pointer"
                            aria-label={`Remove ${req.label}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={inviteEntityMutation.isPending}
              className="h-10 px-6 rounded-[8px] border border-black/[0.15] bg-white text-[13px] font-semibold text-[#0b100e] hover:bg-[#f5f7f6] transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={inviteEntityMutation.isPending || !targetLegalEntityId}
              className="h-10 px-6 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteEntityMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Entity"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
