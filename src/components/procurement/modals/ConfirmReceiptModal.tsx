import { useEffect, useState } from "react";
import { PackageCheck, Loader2 } from "lucide-react";
import { type ConfirmReceiptPayload } from "@/queries/procurement/purchase-orders";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function ConfirmReceiptModal({
  open,
  onClose,
  onConfirm,
  isPending,
  lineItems,
  isFinalDeliveryDefault,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ConfirmReceiptPayload, finalizeBilling: boolean) => void;
  isPending: boolean;
  lineItems: any[];
  isFinalDeliveryDefault?: boolean;
}) {
  const [receivedAt, setReceivedAt] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries((lineItems || []).map((li: any) => [
      li.vendorDeliveryNoticeLineItemId,
      li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1
    ]))
  );
  const [finalizeBilling, setFinalizeBilling] = useState(isFinalDeliveryDefault ?? false);

  useEffect(() => {
    if (!open) return;
    setReceivedAt(new Date());
    setNotes("");
    setQuantities(Object.fromEntries((lineItems || []).map((li: any) => [
      li.vendorDeliveryNoticeLineItemId,
      li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1,
    ])));
    setReceiptReference(typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `RCV-${Date.now()}`);
    setFinalizeBilling(isFinalDeliveryDefault ?? false);
  }, [open, lineItems, isFinalDeliveryDefault]);

  useEffect(() => {
    if (!open) return;
    setReceivedAt(new Date());
    setNotes("");
    setQuantities(Object.fromEntries((lineItems || []).map((li: any) => [
      li.vendorDeliveryNoticeLineItemId,
      li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1,
    ])));
    setReceiptReference(typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `RCV-${Date.now()}`);
  }, [open, lineItems]);

  const handleSubmit = () => {
    if (!receivedAt) return;

    const itemsToSubmit = lineItems
      .map((li: any) => ({
        fulfillmentLineItemId: li.vendorDeliveryNoticeLineItemId,
        name: li.name,
        quantityReceived: quantities[li.vendorDeliveryNoticeLineItemId] ??
          (li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity),
        notes: undefined,
      }))
      .filter((li: any) => li.quantityReceived > 0);

    onConfirm({
      receiptReference,
      receivedAt: receivedAt.toISOString(),
      notes: notes || undefined,
      lineItems: itemsToSubmit,
    }, finalizeBilling);
  };

  const totalQuantityToReceive = lineItems.reduce((acc: number, li: any) => {
    return acc + (quantities[li.vendorDeliveryNoticeLineItemId] ??
      (li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity));
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0 bg-white border-0 shadow-2xl rounded-[14px]">
        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
            <div className="w-10 h-10 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5 text-[#087f70]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#0b100e]">Confirm Delivery Receipt</DialogTitle>
              <DialogDescription className="text-sm text-[#68726d] mt-1">
                Enter the quantities received for each line item. Items with 0 quantity will be skipped.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Received At */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#0b100e]">
              Date Received <span className="text-[#d33d44]">*</span>
            </Label>
            <DatePicker 
              date={receivedAt} 
              setDate={setReceivedAt} 
              disabled={isPending}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#0b100e]">Line Items</Label>
            <div className="border border-black/[0.06] rounded-[12px] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f9faf9] border-b border-black/[0.06]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#68726d]">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d]">Awaiting receipt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d] w-32">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(lineItems || []).map((li: any) => {
                    const maxQty = li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity;
                    return (
                      <tr key={li.vendorDeliveryNoticeLineItemId} className="border-b border-black/[0.04] last:border-0 hover:bg-[#fcfcfc] transition-colors">
                        <td className="px-4 py-3 font-medium text-[#0b100e] align-middle">{li.name}</td>
                        <td className="px-4 py-3 text-center text-[#68726d] align-middle">{maxQty}</td>
                        <td className="px-4 py-2 text-center align-middle">
                          <Input
                            type="number" 
                            min={0} 
                            max={maxQty}
                            value={quantities[li.vendorDeliveryNoticeLineItemId] ?? maxQty}
                            onChange={e => setQuantities(prev => ({
                              ...prev,
                              [li.vendorDeliveryNoticeLineItemId]: Math.min(maxQty, Math.max(0, Number(e.target.value))),
                            }))}
                            disabled={isPending}
                            className="w-20 text-center mx-auto rounded-[10px] border-black/[0.06]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#0b100e]">
              Notes <span className="text-[#68726d] font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about the delivery…" 
              rows={3}
              disabled={isPending}
              className="resize-none rounded-[12px] border-black/[0.06] py-2.5 text-sm"
            />
          </div>
          
          {/* Finalize Billing Checkbox */}
          <div className="pt-4 border-t border-black/[0.06]">
            <label className="flex items-start gap-3 cursor-pointer group" htmlFor="finalize-billing">
              <div className="flex items-start h-5">
                <Checkbox
                  id="finalize-billing"
                  checked={finalizeBilling}
                  onCheckedChange={(checked) => setFinalizeBilling(checked as boolean)}
                  disabled={isPending}
                  className="mt-0.5 data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#0b100e] group-hover:text-[#087f70] transition-colors">
                  Finalize Billing
                </span>
                <span className="text-xs text-[#68726d] mt-0.5">
                  Check this to finalize the order so the vendor can submit the invoice for this PO.
                </span>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 sm:justify-start flex-row-reverse gap-3">
          <Button
            onClick={handleSubmit} 
            disabled={!receivedAt || isPending || totalQuantityToReceive <= 0}
            className="flex-1 bg-[#087f70] text-white font-semibold hover:bg-[#076a5e] h-10 rounded-[12px]"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Receipt
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
            className="px-6 border-black/[0.06] hover:bg-[#f9faf9] h-10 rounded-[12px] font-medium"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
