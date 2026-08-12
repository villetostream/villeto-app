"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useUpdatePurchaseOrder } from "@/queries/procurement/purchase-orders";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { toast } from "sonner";
import { PurchaseOrderRecord } from "@/lib/types/purchase-request-helpers";

export interface EditPOHeaderModalProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrderRecord;
}

export default function EditPOHeaderModal({ open, onClose, po }: EditPOHeaderModalProps) {
  const updateMut = useUpdatePurchaseOrder(po.purchaseOrderId || "");
  const { data: vendorsData } = useGetVendors();
  const vendors = vendorsData?.data || [];

  const [form, setForm] = useState({
    vendorId: po.vendor?.vendorId || "",
    priority: po.priority || "medium",
    deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().slice(0, 10) : "",
    notes: po.notes || "",
  });

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      await updateMut.mutateAsync({
        vendorId: form.vendorId || undefined,
        priority: form.priority as any,
        deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Purchase order updated");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update PO");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-[#0b100e]">Edit PO Details</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Vendor</label>
            <select
              value={form.vendorId}
              onChange={e => setForm(p => ({ ...p, vendorId: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white"
            >
              <option value="">Select a vendor...</option>
              {vendors.map(v => (
                <option key={v.vendorId} value={v.vendorId}>{v.displayName || v.legalName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Delivery Date</label>
              <input
                type="date"
                value={form.deliveryDate}
                onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-black/[0.06]">
          <button onClick={onClose} className="flex-1 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium hover:bg-[#f9faf9] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateMut.isPending}
            className="flex-1 h-10 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
