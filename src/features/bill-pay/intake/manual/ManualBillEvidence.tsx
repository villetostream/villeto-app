"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/types/api-error";
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
}: {
  intake: IntakeEvidence;
  canAttach: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const attach = useAttachManualInvoiceDocument();
  const documents = intake.documents || [];
  const hasInvoiceDocument = documents.some(
    (document) =>
      document.documentType === "invoice" &&
      document.malwareScanStatus === "clean",
  );

  const upload = async () => {
    if (!file) return;
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      toast.error("Choose a PDF, JPG, or PNG invoice up to 15 MB.");
      return;
    }
    try {
      await attach.mutateAsync({ invoiceIntakeId: intake.invoiceIntakeId, file });
      toast.success("Invoice document attached.");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not attach invoice document."));
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
        {hasInvoiceDocument
          ? "An invoice document is attached. This draft can be submitted for review."
          : "Attach a PDF, JPG, or PNG invoice before submitting this draft for review."}
      </p>
      {documents.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12px] text-[#10231d]">
          {documents.map((document) => (
            <li key={document.invoiceDocumentId}>{document.filename}</li>
          ))}
        </ul>
      )}
      {canAttach && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="manual-invoice-document" className="text-[12px] font-medium">
              Choose invoice file
            </label>
            <input
              ref={fileInput}
              id="manual-invoice-document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-1 block w-full text-[12px]"
            />
          </div>
          <Button type="button" disabled={!file || attach.isPending} onClick={() => void upload()}>
            {attach.isPending ? "Attaching..." : "Attach invoice"}
          </Button>
        </div>
      )}
    </section>
  );
}
