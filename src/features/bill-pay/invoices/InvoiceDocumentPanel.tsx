"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ExternalLink, FileText, RefreshCw, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAxios } from "@/hooks/useAxios";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { unwrap } from "@/features/bill-pay/shared/query-utils";
import { useAttachManualInvoiceDocument } from "@/features/bill-pay/intake/manual/queries";

type InvoiceDocument = {
  invoiceDocumentId: string;
  filename: string;
  mimeType?: string | null;
  documentType?: string | null;
  malwareScanStatus: string;
};

type IntakeEvidence = {
  invoiceIntakeId: string;
  documents?: InvoiceDocument[];
};

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxBytes = 15 * 1024 * 1024;
const InvoicePdfPreview = dynamic(
  () =>
    import("./InvoicePdfPreview").then((module) => module.InvoicePdfPreview),
  { ssr: false },
);

function documentKind(document: InvoiceDocument) {
  const name = document.filename.toLowerCase();
  if (document.mimeType === "application/pdf" || name.endsWith(".pdf"))
    return "pdf";
  if (document.mimeType?.startsWith("image/") || /\.(png|jpe?g)$/.test(name))
    return "image";
  return "other";
}

export function InvoiceDocumentPanel({
  intake,
  invoiceId,
  isDraft,
  canAttach,
}: {
  intake?: IntakeEvidence | null;
  invoiceId: string;
  isDraft: boolean;
  canAttach: boolean;
}) {
  const axios = useAxios();
  const input = useRef<HTMLInputElement>(null);
  const attach = useAttachManualInvoiceDocument();
  const documents = intake?.documents ?? [];
  const cleanDocuments = documents.filter(
    (document) => document.malwareScanStatus === "clean",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    cleanDocuments.find(
      (document) => document.invoiceDocumentId === selectedId,
    ) ??
    cleanDocuments.find((document) => document.documentType === "invoice") ??
    cleanDocuments[0];
  const kind = selected ? documentKind(selected) : null;

  const access = useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "invoice-document-access",
      invoiceId,
      selected?.invoiceDocumentId,
    ]),
    queryFn: async ({ signal }) =>
      unwrap<{ url: string }>(
        (
          await axios.get(
            `/bill-pay/invoices/${invoiceId}/documents/${selected!.invoiceDocumentId}/access`,
            { signal, _skipErrorToast: true },
          )
        ).data,
      ),
    enabled: !!selected,
    staleTime: 4 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const upload = async (file: File) => {
    if (!allowedTypes.has(file.type) || file.size > maxBytes) {
      toast.error("Choose a PDF, JPG, or PNG invoice up to 15 MB.");
      return;
    }
    if (!intake) return;
    try {
      const added = await attach.mutateAsync({
        invoiceIntakeId: intake.invoiceIntakeId,
        file,
      });
      setSelectedId(added.invoiceDocumentId);
      toast.success("Invoice document attached.");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not attach invoice document."),
      );
    }
  };

  const openDocument = async () => {
    if (!selected) return;
    const newTab = window.open("", "_blank");
    if (newTab) newTab.opener = null;
    try {
      const result = (await access.refetch()).data;
      if (!result?.url) throw new Error("Invoice document is unavailable.");
      if (newTab) newTab.location.href = result.url;
      else window.location.assign(result.url);
    } catch (error) {
      newTab?.close();
      toast.error(
        getApiErrorMessage(error, "Could not open invoice document."),
      );
    }
  };

  return (
    <section
      aria-labelledby="invoice-preview-heading"
      className="overflow-hidden rounded-2xl border border-[#dce7e1] bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7eeea] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#10231d]">
            <FileText aria-hidden="true" className="h-4 w-4 text-[#087f70]" />
            <h2 id="invoice-preview-heading" className="text-[15px] font-bold">
              Invoice preview
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#68726d]">
            {isDraft && !selected
              ? "Attach an invoice to submit this draft."
              : selected
                ? "Check the original document alongside the bill details."
                : "No invoice document is available for this bill."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void openDocument()}
            >
              <ExternalLink aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
              Open
            </Button>
          )}
          {canAttach && (
            <>
              <input
                ref={input}
                id="manual-invoice-document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                aria-label="Choose invoice file"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(file);
                }}
              />
              <Button
                type="button"
                size="sm"
                disabled={attach.isPending}
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                {attach.isPending ? "Attaching…" : "Attach"}
              </Button>
            </>
          )}
        </div>
      </div>

      {cleanDocuments.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-[#e7eeea] px-5 py-3 sm:px-6">
          {cleanDocuments.map((document) => (
            <button
              key={document.invoiceDocumentId}
              type="button"
              onClick={() => setSelectedId(document.invoiceDocumentId)}
              aria-pressed={
                selected?.invoiceDocumentId === document.invoiceDocumentId
              }
              className={`max-w-48 shrink-0 truncate rounded-md px-3 py-1.5 text-xs font-medium ${selected?.invoiceDocumentId === document.invoiceDocumentId ? "bg-[#e8f5ef] text-[#087f70]" : "bg-[#f4f7f5] text-[#68726d] hover:text-[#10231d]"}`}
              title={document.filename}
            >
              {document.filename}
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-[#e7eeea] px-5 py-3 sm:px-6">
        <p
          className="truncate text-xs font-semibold text-[#10231d]"
          title={selected?.filename}
        >
          {selected?.filename ?? "No file selected"}
        </p>
      </div>

      <div className="h-[420px] bg-[#f4f7f5] p-3 sm:h-[560px]">
        {selected && access.data?.url && kind === "pdf" ? (
          <InvoicePdfPreview key={access.data.url} url={access.data.url} />
        ) : selected && access.data?.url && kind === "image" ? (
          <div className="relative h-full overflow-hidden rounded-lg border border-[#dce7e1] bg-white">
            <Image
              src={access.data.url}
              alt={`Invoice document ${selected.filename}`}
              fill
              unoptimized
              loading="eager"
              className="object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-[#cbdad2] bg-white px-6 text-center">
            <FileText
              aria-hidden="true"
              className="mb-3 h-9 w-9 text-[#9aada3]"
            />
            <p className="text-sm font-semibold text-[#10231d]">
              {access.isPending && selected
                ? "Loading preview…"
                : access.isError
                  ? "Preview unavailable"
                  : selected
                    ? "Preview unavailable for this file"
                    : "No invoice attached"}
            </p>
            <p className="mt-1 max-w-64 text-xs leading-5 text-[#68726d]">
              {access.isError
                ? "Try refreshing the preview or open the file in a new tab."
                : selected
                  ? "Open the file to inspect it."
                  : "The invoice will appear here once a clean document is attached."}
            </p>
            {selected && access.isError && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => void access.refetch()}
              >
                <RefreshCw aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                Retry preview
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="px-5 py-3 text-[11px] leading-4 text-[#68726d] sm:px-6">
        Preview access is temporary. Refresh the page if a document expires.
      </p>
    </section>
  );
}
