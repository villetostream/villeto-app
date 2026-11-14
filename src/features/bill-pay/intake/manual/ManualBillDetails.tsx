"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/types/api-error";
import type { ManualBillEditorState } from "./useManualBillEditor";

export function ManualBillDetails({
  editor,
}: {
  editor: ManualBillEditorState;
}) {
  const {
    invoiceId,
    workspaceEnabled,
    legalEntities,
    selectedEntityId,
    setSelectedEntityId,
    setVendorSelection,
    legalEntityId,
    vendorId,
    vendorSiteId,
    selectedVendor,
    eligibleVendors,
    vendorsLoading,
    vendorsError,
    vendorsLoadError,
    entitiesLoading,
    entitiesError,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    dueDate,
    setDueDate,
    description,
    setDescription,
  } = editor;

  return (
    <section aria-labelledby="bill-details-heading">
      <h2
        id="bill-details-heading"
        className="mb-5 text-[18px] font-bold text-[#10231d]"
      >
        Bill details
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        {!workspaceEnabled && legalEntities.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#10231d]">
              Legal Entity
            </label>
            <Select
              value={selectedEntityId}
              disabled={Boolean(invoiceId)}
              onValueChange={(nextEntityId) => {
                setSelectedEntityId(nextEntityId);
                setVendorSelection({
                  entityId: nextEntityId,
                  vendorId: "",
                  vendorSiteId: "",
                });
              }}
            >
              <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
                <SelectValue placeholder="Select a legal entity" />
              </SelectTrigger>
              <SelectContent>
                {legalEntities.map((entity) => (
                  <SelectItem
                    key={entity.legalEntityId}
                    value={entity.legalEntityId}
                  >
                    {entity.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-[#10231d]">
            Vendor
          </label>
          <Select
            value={vendorId}
            onValueChange={(nextVendorId) => {
              const sites =
                eligibleVendors?.vendors.find(
                  (vendor) => vendor.vendorId === nextVendorId,
                )?.sites || [];
              setVendorSelection({
                entityId: legalEntityId,
                vendorId: nextVendorId,
                vendorSiteId: sites.length === 1 ? sites[0].vendorSiteId : "",
              });
            }}
            disabled={!legalEntityId || vendorsLoading || vendorsError}
          >
            <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
              <SelectValue
                placeholder={
                  vendorsLoading
                    ? "Loading vendors..."
                    : "Select an eligible vendor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {eligibleVendors?.vendors.map((vendor) => (
                <SelectItem key={vendor.vendorId} value={vendor.vendorId}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {vendorsError && (
            <p className="text-xs text-red-600">
              {getApiErrorMessage(
                vendorsLoadError,
                "Could not load eligible vendors.",
              )}
            </p>
          )}
          {!vendorsLoading && eligibleVendors?.vendors.length === 0 && (
            <p className="text-xs text-[#68726d]">
              No vendors are eligible to invoice this legal entity.
            </p>
          )}
          {!legalEntityId && !entitiesLoading && (
            <p className="text-xs text-[#68726d]">
              {entitiesError
                ? "Could not load eligible legal entities. Try refreshing this page."
                : "Select a legal entity with finance access to add a bill."}
            </p>
          )}
        </div>

        {eligibleVendors?.siteRequired && vendorId && (
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#10231d]">
              Vendor Site
            </label>
            <Select
              value={vendorSiteId}
              onValueChange={(nextSiteId) =>
                setVendorSelection((current) => ({
                  ...current,
                  entityId: legalEntityId,
                  vendorSiteId: nextSiteId,
                }))
              }
            >
              <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
                <SelectValue placeholder="Select an invoicing site" />
              </SelectTrigger>
              <SelectContent>
                {selectedVendor?.sites.map((site) => (
                  <SelectItem key={site.vendorSiteId} value={site.vendorSiteId}>
                    {site.name || site.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="bill-invoice-number"
            className="text-[13px] font-medium text-[#10231d]"
          >
            Invoice Number
          </label>
          <Input
            id="bill-invoice-number"
            value={invoiceNumber}
            onChange={(event) => setInvoiceNumber(event.target.value)}
            className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-[#10231d]">
            Invoice Date
          </label>
          <DatePicker
            date={invoiceDate}
            setDate={setInvoiceDate}
            className="rounded-[8px] border-black/[0.08] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-[#10231d]">
            Due Date (Optional)
          </label>
          <DatePicker
            date={dueDate}
            setDate={setDueDate}
            className="rounded-[8px] border-black/[0.08] text-[13px]"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="bill-description"
            className="text-[13px] font-medium text-[#10231d]"
          >
            Description (Optional)
          </label>
          <Input
            id="bill-description"
            placeholder="e.g. Office supplies"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"
          />
        </div>
      </div>
    </section>
  );
}
