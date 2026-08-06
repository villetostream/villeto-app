"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react";

function WorkflowStep({ label, person, badge, badgeColor, timestamp, done, pending }: {
  label: string; person?: string; badge?: string; badgeColor?: string; timestamp?: string; done?: boolean; pending?: boolean;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${
          done ? "border-[#087f70] bg-[#087f70]" : pending ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
        }`} />
      </div>
      <div className="pb-3">
        <p className={`text-xs font-semibold ${!done && !pending ? "text-gray-400" : "text-[#0b100e]"}`}>{label}</p>
        {person && (
          <p className={`text-xs mt-0.5 ${!done && !pending ? "text-gray-300" : "text-[#68726d]"}`}>
            {person}
            {badge && (
              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
            )}
          </p>
        )}
        {timestamp && <p className="text-[11px] text-[#84908a] mt-0.5">{timestamp}</p>}
      </div>
    </div>
  );
}

interface ConfItem { name: string; description: string; delivered: number; confirmedQty: number; }

export default function ConfirmationDetailPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [items, setItems] = useState<ConfItem[]>([
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", delivered: 12, confirmedQty: 0 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", delivered: 12, confirmedQty: 0 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", delivered: 12, confirmedQty: 0 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", delivered: 12, confirmedQty: 0 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", delivered: 12, confirmedQty: 0 },
  ]);

  const updateQty = (i: number, delta: number) => {
    setItems(prev => prev.map((it, idx) =>
      idx === i ? { ...it, confirmedQty: Math.max(0, Math.min(it.delivered, it.confirmedQty + delta)) } : it
    ));
  };

  const handleConfirm = () => {
    setItems(prev => prev.map(it => ({ ...it, confirmedQty: it.delivered })));
    setConfirmed(true);
  };

  const workflowSteps = [
    { label: "Created by",      person: "Pelumi Yemi (Employee)", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Manager Approval",person: "Sam John", badge: "Approved", badgeColor: "text-[#087f70] bg-[#f0faf8]", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Create PO",       person: "Wang Chi", badge: "Done", badgeColor: "text-[#087f70] bg-[#f0faf8]", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "PO Approval",     person: "Sang Fhi (You)", badge: "Approved", badgeColor: "text-[#087f70] bg-[#f0faf8]", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Vendor",          person: "ABC Supplies", badge: "Delivered", badgeColor: "text-[#087f70] bg-[#f0faf8]", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Confirmation",    person: "Sang Fhi (You)", badge: confirmed ? "Confirmed" : "Pending", badgeColor: confirmed ? "text-[#087f70] bg-[#f0faf8]" : "text-amber-600 bg-amber-50", status: confirmed ? "done" : "pending", done: confirmed, pending: !confirmed },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* Left */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#0b100e]">PO-2024-001</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                confirmed ? "bg-[#f0faf8] text-[#087f70]" : "bg-amber-50 text-amber-600"
              }`}>
                {confirmed ? "Confirmed" : "Pending"}
              </span>
            </div>
            <p className="text-sm text-[#68726d] mt-0.5">Delivered on 2024-03-15</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => {}}
              className="h-9 px-4 rounded-lg border border-red-400 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
              Reject Delivery
            </button>
            <button onClick={handleConfirm} disabled={confirmed}
              className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              {confirmed ? "Confirmed ✓" : "Confirm Delivery"}
            </button>
          </div>
        </div>

        {/* PO Details */}
        <div className="bg-white rounded-[14px] border border-black/[0.06] p-6">
          <h2 className="text-base font-semibold text-[#0b100e] mb-4">PO Details</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-[#68726d] mb-1">Department</p>
              <p className="text-sm font-semibold text-[#0b100e]">Engineering</p>
            </div>
            <div>
              <p className="text-xs text-[#68726d] mb-1">Vendor</p>
              <p className="text-sm font-semibold text-[#0b100e]">ABC Supplies</p>
            </div>
            <div>
              <p className="text-xs text-[#68726d] mb-1">Delivery status</p>
              <span className="text-sm font-semibold text-[#087f70]">Full Delivery</span>
            </div>
            <div>
              <p className="text-xs text-[#68726d] mb-1">Priority</p>
              <span className="text-sm font-semibold text-amber-500">Medium</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <h2 className="text-base font-semibold text-[#0b100e]">Items <span className="text-[#68726d] font-normal">5</span></h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-[#f9faf9]">
                <th className="px-6 py-3 text-left font-semibold text-[#0b100e]">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-[#0b100e]">Description</th>
                <th className="px-6 py-3 text-center font-semibold text-[#0b100e]">Delivered</th>
                <th className="px-6 py-3 text-center font-semibold text-[#0b100e]">Confirmed Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-6 py-4 font-semibold text-[#0b100e]">{item.name}</td>
                  <td className="px-6 py-4 text-[#68726d]">{item.description}</td>
                  <td className="px-6 py-4 text-center text-[#0b100e]">{item.delivered}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-12 text-center text-sm font-medium text-[#0b100e]">{item.confirmedQty}</span>
                      <div className="flex flex-col">
                        <button onClick={() => updateQty(i, 1)} disabled={confirmed || item.confirmedQty >= item.delivered}
                          className="w-5 h-4 flex items-center justify-center rounded hover:bg-[#f9faf9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => updateQty(i, -1)} disabled={confirmed || item.confirmedQty <= 0}
                          className="w-5 h-4 flex items-center justify-center rounded hover:bg-[#f9faf9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Workflow */}
      <div className="w-64 shrink-0 bg-white rounded-[14px] border border-black/[0.06] p-5">
        <h3 className="text-sm font-semibold text-[#0b100e] mb-5">Workflow Progress</h3>
        <div className="space-y-0">
          {workflowSteps.map((s, i) => (
            <WorkflowStep key={i} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
