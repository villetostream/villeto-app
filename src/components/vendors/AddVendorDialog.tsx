"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
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
import {
  useVendorLookup,
  useInviteVendorV2,
  useVendorLegalEntityOptions,
  normalizeConnectedLegalEntities,
  isLegalEntitySelectionRequiredError,
} from "@/queries/vendors/vendor-network";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getApiErrorMessage, getString, pickString } from "@/lib/types/api-error";

interface AddVendorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddVendorDialog({
  open,
  onClose,
  onSuccess,
}: AddVendorDialogProps) {
  const router = useRouter();
  const workspaceSelection = useEntityWorkspaceStore((s) => s.selection);
  const workspaceEnabled = useEntityWorkspaceStore((s) => s.snapshot?.enabled);
  const canManageMasterList = useAuthStore(
    (s) =>
      s.can("vendor.master_list", "manage") ||
      s.can("vendor.entity_configuration", "manage"),
  );

  const [email, setEmail] = useState("");
  const [legalName, setLegalName] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [requireEntityPicker, setRequireEntityPicker] = useState(false);

  const needsEntitySelection =
    requireEntityPicker ||
    (Boolean(workspaceEnabled) &&
      (!workspaceSelection || workspaceSelection === "all"));

  const { data: legalEntities = [] } = useVendorLegalEntityOptions(
    open && needsEntitySelection,
  );

  useEffect(() => {
    if (!open) {
      setEmail("");
      setLegalName("");
      setDebouncedEmail("");
      setSelectedEntityId("");
      setRequireEntityPicker(false);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(email.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [email]);

  const isValidEmail = Boolean(
    debouncedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail),
  );

  const { data: lookupResult, isFetching: isLookingUp } = useVendorLookup(
    "email",
    debouncedEmail,
    open && isValidEmail,
    { useMasterDirectory: canManageMasterList },
  );

  const inviteMutation = useInviteVendorV2();

  const rawMatchedVendor = lookupResult?.data?.vendor || null;
  const matchedVendor = rawMatchedVendor
    ? (() => {
        const { legalEntityCount, legalEntities: connected } =
          normalizeConnectedLegalEntities(rawMatchedVendor);
        const activeEntityId =
          workspaceSelection && workspaceSelection !== "all"
            ? workspaceSelection
            : null;
        const alreadyInCurrentEntity = activeEntityId
          ? connected.some((e) => e.legalEntityId === activeEntityId)
          : false;

        return {
          id:
            getString(rawMatchedVendor.vendorId) ||
            getString(rawMatchedVendor.id),
          name:
            pickString(
              rawMatchedVendor,
              "legalName",
              "displayName",
              "name",
            ) || debouncedEmail,
          email: getString(rawMatchedVendor.email) || debouncedEmail,
          legalEntityCount,
          alreadyInCurrentEntity,
        };
      })()
    : null;

  const handleReviewVendor = () => {
    if (!matchedVendor?.id) return;
    onClose();
    if (matchedVendor.alreadyInCurrentEntity) {
      router.push(`/vendors/${matchedVendor.id}`);
      return;
    }
    router.push(
      `/vendors/${matchedVendor.id}?from=master&relationship=not_connected`,
    );
  };

  const effectiveLegalEntityId =
    selectedEntityId ||
    (workspaceSelection && workspaceSelection !== "all"
      ? workspaceSelection
      : undefined);

  const handleContinueInvite = async () => {
    if (!isValidEmail) return;

    if (matchedVendor) {
      handleReviewVendor();
      return;
    }

    if (needsEntitySelection && !effectiveLegalEntityId) {
      toast.error("Select the legal entity inviting this vendor.");
      return;
    }

    const derivedName =
      legalName.trim() ||
      debouncedEmail
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "Vendor";

    try {
      await inviteMutation.mutateAsync({
        email: debouncedEmail,
        legalName: derivedName,
        // No registry identifier is collected here, so do not request verification.
        verificationRequested: false,
        ...(effectiveLegalEntityId
          ? { legalEntityId: effectiveLegalEntityId }
          : {}),
      });
      toast.success("Vendor invitation sent successfully.");
      onSuccess?.();
      onClose();
    } catch (err) {
      if (isLegalEntitySelectionRequiredError(err)) {
        setRequireEntityPicker(true);
        toast.info("Select the legal entity that is inviting this vendor.");
        return;
      }
      logger.error("Failed to send vendor invitation:", err);
      toast.error(
        getApiErrorMessage(err, "Failed to send invitation. Please try again."),
      );
    }
  };

  const lookupCompletedNoMatch =
    isValidEmail && !isLookingUp && lookupResult !== undefined && !matchedVendor;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[460px] p-6 sm:p-7 rounded-[18px] bg-white border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-[20px] font-bold text-[#0b100e]">
            Add Vendor
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#68726d]">
            Enter vendor details to invite them
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="vendor-invite-email"
              className="text-[13px] font-medium text-[#0b100e] block"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="vendor-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter vendor email"
                className="w-full h-11 px-3.5 rounded-[8px] border border-black/[0.12] bg-white text-[14px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors"
                autoFocus
              />
              {isLookingUp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#087f70]" />
                </div>
              )}
            </div>
          </div>

          {/* Match found banner & card */}
          {matchedVendor && (
            <div className="space-y-2.5 pt-1 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-1.5 text-[#0b100e]">
                <CheckCircle2 className="w-4 h-4 text-[#087f70]" />
                <span className="text-[13px] font-bold">Match found</span>
              </div>
              <p className="text-[12px] text-[#68726d] leading-snug">
                {matchedVendor.alreadyInCurrentEntity
                  ? "This vendor is already connected to your selected legal entity."
                  : "The vendor was found in your other legal entity, you can review and add them."}
              </p>

              <button
                type="button"
                onClick={handleReviewVendor}
                className="w-full text-left p-3.5 rounded-[10px] border border-[#38d5bc] bg-[#f0faf8] hover:bg-[#e6f7f4] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-semibold text-[#0b100e] truncate">
                      {matchedVendor.name}
                    </h4>
                    {matchedVendor.legalEntityCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-[#c8ece4] px-2 py-0.5 text-[10px] font-semibold text-[#087f70] shrink-0">
                        <Building2 className="w-3 h-3" />
                        {matchedVendor.legalEntityCount}{" "}
                        {matchedVendor.legalEntityCount === 1
                          ? "entity"
                          : "entities"}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#68726d] mt-0.5 truncate">
                    {matchedVendor.email}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#087f70] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          )}

          {/* New vendor fields when lookup completes with no existing match */}
          {lookupCompletedNoMatch && (
            <div className="space-y-3.5 pt-1 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5">
                <label
                  htmlFor="vendor-invite-legal-name"
                  className="text-[13px] font-medium text-[#0b100e] block"
                >
                  Vendor business name{" "}
                  <span className="text-[#84908a] font-normal">(optional)</span>
                </label>
                <input
                  id="vendor-invite-legal-name"
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. Acme Supplies Ltd"
                  className="w-full h-10 px-3.5 rounded-[8px] border border-black/[0.12] bg-white text-[13px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors"
                />
              </div>

              {needsEntitySelection && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[#0b100e] block">
                    Inviting Legal Entity
                  </label>
                  <Select
                    value={selectedEntityId}
                    onValueChange={setSelectedEntityId}
                  >
                    <SelectTrigger className="w-full h-10 rounded-[8px] border-black/[0.12] bg-white text-[13px]">
                      <SelectValue placeholder="Select legal entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {legalEntities.map((entity) => (
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 rounded-[8px] border border-black/[0.15] bg-white text-[13px] font-semibold text-[#0b100e] hover:bg-[#f5f7f6] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {matchedVendor ? (
              <button
                type="button"
                onClick={handleReviewVendor}
                className="h-10 px-5 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              >
                Review Vendor
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinueInvite}
                disabled={
                  !isValidEmail ||
                  inviteMutation.isPending ||
                  isLookingUp ||
                  (lookupCompletedNoMatch &&
                    needsEntitySelection &&
                    !effectiveLegalEntityId)
                }
                className="h-10 px-6 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] disabled:bg-[#38d5bc]/50 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
