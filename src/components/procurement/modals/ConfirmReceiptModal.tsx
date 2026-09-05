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

export default function ConfirmReceiptModal({
  open,
  onClose,
  onConfirm,
  isPending,
  lineItems,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ConfirmReceiptPayload) => void;
  isPending: boolean;
  lineItems: any[];
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
    
    onConfirm({
      receiptReference,
      receivedAt: receivedAt.toISOString(),
      notes: notes || undefined,
      lineItems: lineItems.map((li: any) => ({
        fulfillmentLineItemId: li.vendorDeliveryNoticeLineItemId,
        name: li.name,
        quantityReceived: quantities[li.vendorDeliveryNoticeLineItemId] ??
          (li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity),
        notes: undefined,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 bg-white">
        <div className="p-6 space-y-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
            <div className="w-10 h-10 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5 text-[#087f70]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#0b100e]">Confirm Delivery Receipt</DialogTitle>
              <DialogDescription className="text-sm text-[#68726d] mt-1">
                Enter the quantities received for each line item.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Received At */}
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#0b100e]">Line Items</Label>
            <div className="border border-black/[0.06] rounded-[12px] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f9faf9] border-b border-border/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#68726d]">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d]">Awaiting receipt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d] w-32">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(lineItems || []).map((li: any) => {
                    const maxQty = li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity;
                    return (
                      <tr key={li.vendorDeliveryNoticeLineItemId} className="border-b border-border/40 last:border-0">
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
                            className="w-20 text-center mx-auto"
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
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#0b100e]">
              Notes <span className="text-[#68726d] font-normal">(optional)</span>
            </Label>
            <Textarea
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about the delivery…" 
              rows={3}
              disabled={isPending}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 sm:justify-start flex-row-reverse gap-3">
          <Button
            onClick={handleSubmit} 
            disabled={!receivedAt || isPending}
            className="flex-1 bg-[#087f70] text-white hover:bg-[#076a5e]"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirm Receipt
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPending}
            className="px-6 border-black/[0.06] hover:bg-[#f9faf9]"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
