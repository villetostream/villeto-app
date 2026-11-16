import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { invalidateInvoiceLists, unwrap } from "../../shared/query-utils";

export interface EligibleInvoiceVendor {
  vendorId: string;
  name: string;
  sites: Array<{ vendorSiteId: string; code: string; name: string }>;
}

export interface EligibleInvoiceVendorsResult {
  siteRequired: boolean;
  vendors: EligibleInvoiceVendor[];
}

export function useEligibleInvoiceVendors(legalEntityId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "eligible-invoice-vendors",
      legalEntityId,
    ]),
    queryFn: async () =>
      unwrap<EligibleInvoiceVendorsResult>(
        (
          await axios.get("/bill-pay/eligible-invoice-vendors", {
            params: { legalEntityId },
          })
        ).data,
      ),
    enabled: Boolean(legalEntityId && legalEntityId !== "all"),
  });
}

export interface ManualBillDraftInput {
  legalEntityId: string;
  vendorId: string;
  vendorSiteId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  deliveryDate?: string;
  currency: string;
  shippingAmount?: string;
  discountAmount?: string;
  withholdingAmount?: string;
  notes?: string;
  lineItems: Array<{
    name: string;
    description?: string;
    quantity: string;
    unitPrice: string;
    taxAmount?: string;
    categoryId?: string;
    departmentId?: string;
  }>;
  idempotencyKey: string;
}

export function useSaveManualBillDraft() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      legalEntityId,
      ...invoice
    }: ManualBillDraftInput) => {
      const intakeResponse = await axios.post(
        "/bill-pay/intakes",
        {
          legalEntityId,
          source: "manual_entry",
          externalReference: invoice.invoiceNumber,
          structuredInput: { captureMethod: "manual" },
        },
        { headers: { "Idempotency-Key": idempotencyKey } },
      );
      const intake = unwrap<{ invoiceIntakeId: string }>(intakeResponse.data);
      let completed = false;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const response = await axios.get(
          `/bill-pay/intakes/${intake.invoiceIntakeId}`,
        );
        const current = unwrap<{ status: string; failureMessage?: string }>(
          response.data,
        );
        if (current.status === "completed") {
          completed = true;
          break;
        }
        if (["failed", "rejected", "cancelled"].includes(current.status)) {
          throw new Error(
            current.failureMessage ||
              "Bill intake could not finish processing.",
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!completed) {
        throw new Error(
          "Bill intake is still processing. Try saving again shortly.",
        );
      }

      const capturedResponse = await axios.put(
        `/bill-pay/intakes/${intake.invoiceIntakeId}/invoice`,
        invoice,
      );
      const captured = unwrap<{ vendorInvoiceId: string }>(
        capturedResponse.data,
      );
      return captured.vendorInvoiceId;
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: workspaceQueryKey(["bill-pay"]) }),
  });
}


export function useAttachManualInvoiceDocument() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceIntakeId,
      file,
    }: {
      invoiceIntakeId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        `/bill-pay/intakes/${invoiceIntakeId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return unwrap<{ invoiceDocumentId: string; filename: string }>(
        response.data,
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "invoices"]),
      });
    },
  });
}

export interface UpdateManualBillDraftInput {
  invoiceIntakeId: string;
  vendorInvoiceId: string;
  invoice: Omit<ManualBillDraftInput, "legalEntityId" | "idempotencyKey">;
}

export function useUpdateManualBillDraft() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceIntakeId,
      vendorInvoiceId,
      invoice,
    }: UpdateManualBillDraftInput) => {
      const response = await axios.patch(
        `/bill-pay/intakes/${invoiceIntakeId}/invoice`,
        invoice,
      );
      const saved = unwrap<{ vendorInvoiceId: string }>(response.data);
      if (saved.vendorInvoiceId !== vendorInvoiceId) {
        throw new Error("The draft update returned a different invoice.");
      }
      return saved.vendorInvoiceId;
    },
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay"]),
      });
      invalidateInvoiceLists(client);
    },
  });
}
