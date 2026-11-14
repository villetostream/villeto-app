"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetBillPayInvoiceById,
  type BillPayInvoiceDetail,
} from "@/queries/bill-pay/invoices";
import { ManualBillDetails } from "./ManualBillDetails";
import { ManualBillLines } from "./ManualBillLines";
import { useManualBillEditor } from "./useManualBillEditor";

export default function ManualBillForm({ invoiceId }: { invoiceId?: string }) {
  const draftQuery = useGetBillPayInvoiceById(invoiceId || "");
  const draft = draftQuery.data?.data;
  if (invoiceId && draftQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-[#68726d]">Loading draft bill...</div>
    );
  }
  if (
    invoiceId &&
    (draftQuery.isError ||
      !draft ||
      draft.status !== "draft" ||
      draft.intake?.source !== "manual_entry" ||
      draft.purchaseOrder ||
      (draft.supportType && draft.supportType !== "non_po"))
  ) {
    return (
      <div className="p-8 text-sm text-[#68726d]">
        This manual bill draft is unavailable for editing.
      </div>
    );
  }
  return (
    <ManualBillEditor
      key={invoiceId || "new"}
      invoiceId={invoiceId}
      draft={draft}
    />
  );
}

function ManualBillEditor({
  invoiceId,
  draft,
}: {
  invoiceId?: string;
  draft?: BillPayInvoiceDetail;
}) {
  const editor = useManualBillEditor(invoiceId, draft);
  const {
    legalEntityId,
    entitiesLoading,
    workspaceSettings,
    workspaceSettingsError,
    refetchWorkspaceSettings,
    enableWorkspace,
    enableCompanyWorkspace,
    handleSubmit,
    isSaving,
    cancel,
  } = editor;

  if (invoiceId && entitiesLoading) {
    return (
      <div className="p-8 text-sm text-[#68726d]">
        Loading legal entity access...
      </div>
    );
  }
  if (
    invoiceId &&
    draft &&
    draft.legalEntity?.legalEntityId !== legalEntityId
  ) {
    return (
      <div className="p-8 text-sm text-[#68726d]">
        Select {draft.legalEntity?.legalName || "the bill's legal entity"} in
        the workspace to edit this draft.
      </div>
    );
  }

  return (
    <div className="flex-1 pb-10">
      <div className="mx-auto w-full max-w-5xl px-1">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#10231d]">
            {invoiceId ? "Edit bill draft" : "Add bill"}
          </h1>
          <p className="mt-1 text-[13px] text-[#68726d]">
            Enter the bill details and line items, then save the draft.
          </p>
        </div>
        <Card className="overflow-hidden rounded-[14px] border-black/[0.08] shadow-sm">
          <CardContent className="space-y-8 p-5 sm:p-8">
            {workspaceSettings?.enabled === false && (
              <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-[12px] text-[#68726d]">
                <p className="font-semibold text-[#0b100e]">
                  Company workspace setup is required to save this draft.
                </p>
                <p className="mt-1">
                  Enabling it applies to the whole company and uses each
                  person&apos;s legal entity assignments and access.
                </p>
                {workspaceSettings.deploymentAvailable ? (
                  <Button
                    type="button"
                    onClick={enableCompanyWorkspace}
                    disabled={enableWorkspace.isPending}
                    className="mt-3 bg-[#087f70] text-white hover:bg-[#076b5e]"
                  >
                    {enableWorkspace.isPending
                      ? "Enabling..."
                      : "Enable company workspace"}
                  </Button>
                ) : (
                  <p className="mt-2 text-[#a46709]">
                    A platform administrator must enable the workspace feature
                    first.
                  </p>
                )}
              </div>
            )}
            {workspaceSettingsError && (
              <button
                type="button"
                className="text-[12px] text-red-700 underline"
                onClick={() => void refetchWorkspaceSettings()}
              >
                Could not check workspace setup. Retry
              </button>
            )}
            <ManualBillDetails editor={editor} />
            <ManualBillLines editor={editor} />
            <div className="flex flex-wrap justify-end gap-3 border-t border-black/[0.08] pt-6">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-32 rounded-[8px] border-black/[0.08] text-[13px] font-semibold text-[#52605b]"
                onClick={cancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 min-w-32 rounded-[8px] bg-[#087f70] text-[13px] font-semibold text-white hover:bg-[#076b5e]"
                onClick={handleSubmit}
                disabled={isSaving || workspaceSettings?.enabled !== true}
              >
                {isSaving
                  ? "Saving..."
                  : invoiceId
                    ? "Save Changes"
                    : "Save Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
