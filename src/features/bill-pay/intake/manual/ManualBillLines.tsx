"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManualBillEditorState } from "./useManualBillEditor";

export function ManualBillLines({ editor }: { editor: ManualBillEditorState }) {
  const {
    lineItems,
    setLineItems,
    addLineItem,
    updateLineItem,
    currency,
    lineSubtotal,
  } = editor;

  return (
    <section
      aria-labelledby="bill-lines-heading"
      className="border-t border-black/[0.08] pt-7"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="bill-lines-heading"
            className="text-[18px] font-bold text-[#10231d]"
          >
            Line items
          </h2>
          <p className="mt-1 text-[12px] text-[#68726d]">
            Add each item on this page. Quantity and unit price must be greater
            than zero.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addLineItem}
          className="h-9 gap-1.5 rounded-[8px] border-[#087f70] text-[13px] font-semibold text-[#087f70]"
        >
          <Plus className="h-4 w-4" />
          Add line item
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-black/[0.08]">
        {lineItems.length === 0 ? (
          <div className="bg-[#f9faf9] px-5 py-10 text-center">
            <p className="text-[13px] text-[#68726d]">
              No line items yet. Add one to save the bill.
            </p>
            <Button
              type="button"
              onClick={addLineItem}
              className="mt-4 h-9 rounded-[8px] bg-[#087f70] text-[13px] font-semibold text-white hover:bg-[#076b5e]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add line item
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_90px_130px_130px_40px] gap-3 bg-[#f8fafa] px-4 py-3 text-[12px] font-semibold text-[#52605b] md:grid">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit price</span>
              <span>Subtotal</span>
              <span />
            </div>
            {lineItems.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-3 border-t border-black/[0.06] p-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_90px_130px_130px_40px] md:items-start"
              >
                <div className="col-span-2 space-y-1 md:col-span-1">
                  <label
                    htmlFor={"bill-line-name-" + index}
                    className="text-[11px] font-medium text-[#52605b] md:sr-only"
                  >
                    Item {index + 1}
                  </label>
                  <Input
                    id={"bill-line-name-" + index}
                    value={item.description}
                    onChange={(event) =>
                      updateLineItem(index, { description: event.target.value })
                    }
                    placeholder="Item or service"
                    className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={"bill-line-quantity-" + index}
                    className="text-[11px] font-medium text-[#52605b] md:sr-only"
                  >
                    Quantity
                  </label>
                  <Input
                    id={"bill-line-quantity-" + index}
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity || ""}
                    onChange={(event) =>
                      updateLineItem(index, {
                        quantity: Number(event.target.value),
                      })
                    }
                    className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor={"bill-line-price-" + index}
                    className="text-[11px] font-medium text-[#52605b] md:sr-only"
                  >
                    Unit price
                  </label>
                  <Input
                    id={"bill-line-price-" + index}
                    type="number"
                    min="0"
                    step="any"
                    value={item.unitPrice ?? ""}
                    onChange={(event) =>
                      updateLineItem(index, {
                        unitPrice:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                    className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"
                  />
                </div>
                <div className="flex items-end justify-between gap-2 md:h-10 md:items-center">
                  <span className="text-[11px] font-medium text-[#52605b] md:sr-only">
                    Subtotal
                  </span>
                  <span className="text-[13px] font-semibold text-[#10231d]">
                    {(item.quantity * (item.unitPrice || 0)).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={"Remove line item " + (index + 1)}
                  onClick={() =>
                    setLineItems((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#d33d44] hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {lineItems.length > 0 && (
        <div className="mt-4 flex justify-end gap-5 text-[13px]">
          <span className="text-[#68726d]">Line subtotal</span>
          <span className="font-bold text-[#10231d]">
            {currency}{" "}
            {lineSubtotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
    </section>
  );
}
