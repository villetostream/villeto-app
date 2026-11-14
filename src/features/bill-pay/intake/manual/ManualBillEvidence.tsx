"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { useAxios } from "@/hooks/useAxios";
import { unwrap } from "@/features/bill-pay/shared/query-utils";
import { useAttachManualInvoiceDocument } from "./queries";

type IntakeEvidence = {
  invoiceIntakeId: string;
  documents?: Array<{
    invoiceDocumentId: string;
    filename: string;
    documentType?: string | null;
    malwareScanStatus: string;
  }>;
};

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const maxBytes = 15 * 1024 * 1024;

export function ManualBillEvidence({
  intake,
  canAttach,
  invoiceId,
  isDraft,
}: {
  intake: IntakeEvidence;
  canAttach: boolean;
  invoiceId: string;
  isDraft: boolean;
}) {
  const axios = useAxios();
  const fileInput = useRef<HTMLInputElement>(null);
  const attach = useAttachManualInvoiceDocument();
  const documents = intake.documents || [];
  const hasInvoiceDocument = documents.some(
    (document) =>
      document.documentType === "invoice" &&
      document.malwareScanStatus === "clean",
  );

  const upload = async (file: File) => {
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      toast.error("Choose a PDF, JPG, or PNG invoice up to 15 MB.");
      return;
    }
    try {
      await attach.mutateAsync({ invoiceIntakeId: intake.invoiceIntakeId, file });
      toast.success("Invoice document attached.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not attach invoice document."));
    }
  };

  const viewDocument = async (invoiceDocumentId: string) => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const response = await axios.get(
        `/bill-pay/invoices/${invoiceId}/documents/${invoiceDocumentId}/access`,
      );
      const { url } = unwrap<{ url: string }>(response.data);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (error) {
      tab?.close();
      toast.error(getApiErrorMessage(error, "Could not open invoice document."));
    }
  };

  return (
    <section
      aria-labelledby="manual-bill-evidence-heading"
      className="rounded-[12px] border border-black/[0.08] bg-white p-5"
    >
      <h2
        id="manual-bill-evidence-heading"
        className="text-[16px] font-semibold text-[#10231d]"
      >
        Invoice document
      </h2>
      <p className="mt-1 text-[12px] text-[#68726d]">
        {isDraft
          ? hasInvoiceDocument
            ? "An invoice document is attached. This draft can be submitted for review."
            : "Attach a PDF, JPG, or PNG invoice before submitting this draft for review."
          : "Open the attached invoice before making a review decision."}
      </p>
      {documents.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12px] text-[#10231d]">
          {documents.map((document) => (
            <li key={document.invoiceDocumentId}>
              {document.malwareScanStatus === "clean" ? (
                <button
                  type="button"
                  className="text-[#087f70] hover:underline"
                  onClick={() => void viewDocument(document.invoiceDocumentId)}
                >
                  View {document.filename}
                </button>
              ) : (
                document.filename
              )}
            </li>
          ))}
        </ul>
      )}
      {canAttach && (
        <div className="mt-4">
          <input
            ref={fileInput}
            id="manual-invoice-document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            aria-label="Choose invoice file"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = "";
              if (selected) void upload(selected);
            }}
            className="sr-only"
          />
          <Button
            type="button"
            disabled={attach.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {attach.isPending ? "Attaching..." : "Attach invoice"}
          </Button>
        </div>
      )}
    </section>
  );
}
