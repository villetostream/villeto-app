"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useTransactionLegalEntities,
  useWorkspaceUnsavedChanges,
} from "@/features/entity-workspace/hooks";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  useEligibleInvoiceVendors,
  useSaveManualBillDraft,
  useUpdateManualBillDraft,
} from "./queries";
import type { BillPayInvoiceDetail } from "@/queries/bill-pay/invoices";
import {
  useEnableEntityWorkspace,
  useEntityWorkspaceSettings,
} from "@/queries/legal-entities";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { prepareManualBillSave } from "./save";
import {
  loadedLineItems,
  type EditableBillLineItem,
} from "./types";

export function useManualBillEditor(
  invoiceId?: string,
  draft?: BillPayInvoiceDetail,
) {
  const router = useRouter();
  const [selectedEntityId, setSelectedEntityId] = useState(
    draft?.legalEntity?.legalEntityId || "",
  );
  const [vendorSelection, setVendorSelection] = useState({
    entityId: draft?.legalEntity?.legalEntityId || "",
    vendorId: draft?.vendor?.vendorId || "",
    vendorSiteId: draft?.vendorSiteId || "",
  });
  const [invoiceNumber, setInvoiceNumber] = useState(
    draft?.invoiceNumber || "",
  );
  const [description, setDescription] = useState(draft?.notes || "");
  const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(
    draft?.invoiceDate ? parseISO(draft.invoiceDate.slice(0, 10)) : undefined,
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    draft?.dueDate ? parseISO(draft.dueDate.slice(0, 10)) : undefined,
  );
  const [lineItems, setLineItems] = useState<EditableBillLineItem[]>(() =>
    loadedLineItems(draft),
  );
  const [saved, setSaved] = useState(false);
  const submissionKey = useRef<{ signature: string; key: string } | null>(null);
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const saveDraft = useSaveManualBillDraft();
  const updateDraft = useUpdateManualBillDraft();
  const {
    data: workspaceSettings,
    isError: workspaceSettingsError,
    refetch: refetchWorkspaceSettings,
  } = useEntityWorkspaceSettings();
  const enableWorkspace = useEnableEntityWorkspace();
  const {
    data: legalEntitiesData,
    workspaceEnabled,
    isLoading: entitiesLoading,
    isError: entitiesError,
  } = useTransactionLegalEntities("finance");
  const legalEntities = legalEntitiesData?.data || [];
  const workspaceEntityId = legalEntities[0]?.legalEntityId;
  const legalEntityId = workspaceEnabled
    ? workspaceEntityId && workspaceEntityId !== "all"
      ? workspaceEntityId
      : ""
    : selectedEntityId ||
      (legalEntities.length === 1 ? legalEntities[0].legalEntityId : "");
  const legalEntity = legalEntities.find(
    (entity) => entity.legalEntityId === legalEntityId,
  );
  const vendorId =
    vendorSelection.entityId === legalEntityId ? vendorSelection.vendorId : "";
  const vendorSiteId =
    vendorSelection.entityId === legalEntityId
      ? vendorSelection.vendorSiteId
      : "";
  const currency = legalEntity?.baseCurrency || "NGN";
  const {
    data: eligibleVendors,
    isLoading: vendorsLoading,
    isError: vendorsError,
    error: vendorsLoadError,
  } = useEligibleInvoiceVendors(legalEntityId);
  const selectedVendor = eligibleVendors?.vendors.find(
    (vendor) => vendor.vendorId === vendorId,
  );

  const [initialSignature] = useState(() =>
    draft
      ? JSON.stringify({
          legalEntityId: draft.legalEntity?.legalEntityId || "",
          vendorId: draft.vendor?.vendorId || "",
          vendorSiteId: draft.vendorSiteId || "",
          invoiceNumber: draft.invoiceNumber,
          description: draft.notes || "",
          invoiceDate: draft.invoiceDate?.slice(0, 10) || null,
          dueDate: draft.dueDate?.slice(0, 10) || null,
          lineItems: loadedLineItems(draft),
        })
      : null,
  );
  const currentSignature = JSON.stringify({
    legalEntityId,
    vendorId,
    vendorSiteId,
    invoiceNumber,
    description,
    invoiceDate: invoiceDate ? format(invoiceDate, "yyyy-MM-dd") : null,
    dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
    lineItems,
  });
  useWorkspaceUnsavedChanges(
    !saved &&
      (invoiceId
        ? draft?.legalEntity?.legalEntityId === legalEntityId &&
          currentSignature !== initialSignature
        : !!(
            vendorId ||
            invoiceNumber ||
            description ||
            invoiceDate ||
            dueDate ||
            lineItems.length
          )),
  );

  const handleSubmit = async () => {
    const prepared = prepareManualBillSave({
      companyWorkspaceEnabled: workspaceSettings?.enabled === true,
      legalEntityId,
      vendorId,
      vendorSelected: Boolean(selectedVendor),
      vendorSiteId,
      siteRequired: Boolean(eligibleVendors?.siteRequired),
      invoiceNumber,
      invoiceDate,
      dueDate,
      description,
      currency,
      lineItems,
      invoiceId,
      draft,
    });
    if (!prepared.ok) {
      toast.error(prepared.message);
      return;
    }

    try {
      let savedInvoiceId: string;
      if (invoiceId) {
        savedInvoiceId = await updateDraft.mutateAsync({
          invoiceIntakeId: draft!.intake!.invoiceIntakeId,
          vendorInvoiceId: invoiceId,
          invoice: prepared.payload,
        });
      } else {
        const signature =
          legalEntityId + ":" + invoiceNumber.trim().toLowerCase();
        if (submissionKey.current?.signature !== signature) {
          submissionKey.current = { signature, key: crypto.randomUUID() };
        }
        savedInvoiceId = await saveDraft.mutateAsync({
          legalEntityId,
          ...prepared.payload,
          idempotencyKey: submissionKey.current.key,
        });
      }
      setSaved(true);
      useEntityWorkspaceStore.getState().setDirty(false);
      toast.success(invoiceId ? "Draft updated." : "Bill saved as a draft.");
      router.push("/bill-pay/" + savedInvoiceId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save bill."));
    }
  };

  const enableCompanyWorkspace = async () => {
    try {
      await enableWorkspace.mutateAsync();
      toast.success(
        "Legal entity workspace enabled. Check the entity selection before saving.",
      );
    } catch (cause) {
      toast.error(
        getApiErrorMessage(
          cause,
          "Unable to enable the legal entity workspace",
        ),
      );
    }
  };

  useEffect(() => {
    setBackHandler(() =>
      router.push(invoiceId ? "/bill-pay/" + invoiceId : "/bill-pay"),
    );
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router, invoiceId]);

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      { description: "", quantity: 1, unitPrice: undefined },
    ]);
  };

  const updateLineItem = (
    index: number,
    changes: Partial<EditableBillLineItem>,
  ) => {
    setLineItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  };

  const lineSubtotal = lineItems.reduce(
    (total, item) => total + item.quantity * (item.unitPrice || 0),
    0,
  );

  return {
    invoiceId,
    draft,
    selectedEntityId,
    setSelectedEntityId,
    setVendorSelection,
    invoiceNumber,
    setInvoiceNumber,
    description,
    setDescription,
    invoiceDate,
    setInvoiceDate,
    dueDate,
    setDueDate,
    lineItems,
    setLineItems,
    legalEntities,
    legalEntityId,
    workspaceEnabled,
    entitiesLoading,
    entitiesError,
    workspaceSettings,
    workspaceSettingsError,
    refetchWorkspaceSettings,
    enableWorkspace,
    vendorId,
    vendorSiteId,
    selectedVendor,
    eligibleVendors,
    vendorsLoading,
    vendorsError,
    vendorsLoadError,
    currency,
    lineSubtotal,
    addLineItem,
    updateLineItem,
    handleSubmit,
    enableCompanyWorkspace,
    isSaving: saveDraft.isPending || updateDraft.isPending,
    cancel: () =>
      router.push(invoiceId ? "/bill-pay/" + invoiceId : "/bill-pay"),
  };
}

export type ManualBillEditorState = ReturnType<typeof useManualBillEditor>;
