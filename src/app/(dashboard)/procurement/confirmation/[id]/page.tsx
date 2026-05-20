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
          done ? "border-primary bg-primary" : pending ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
        }`} />
      </div>
      <div className="pb-3">
        <p className={`text-xs font-semibold ${!done && !pending ? "text-gray-400" : "text-foreground"}`}>{label}</p>
        {person && (
          <p className={`text-xs mt-0.5 ${!done && !pending ? "text-gray-300" : "text-muted-foreground"}`}>
            {person}
            {badge && (
              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
            )}
          </p>
        )}
        {timestamp && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{timestamp}</p>}
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
    { label: "Manager Approval",person: "Sam John", badge: "Approved", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Create PO",       person: "Wang Chi", badge: "Done", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "PO Approval",     person: "Sang Fhi (You)", badge: "Approved", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Vendor",          person: "ABC Supplies", badge: "Delivered", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Confirmation",    person: "Sang Fhi (You)", badge: confirmed ? "Confirmed" : "Pending", badgeColor: confirmed ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50", status: confirmed ? "done" : "pending", done: confirmed, pending: !confirmed },
  ];

  return (
    <div className="flex gap-6 items-start">
      {/* Left */}
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">PO-2024-001</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                confirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>
                {confirmed ? "Confirmed" : "Pending"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Delivered on 2024-03-15</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => {}}
              className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
              Reject Delivery
            </button>
            <button onClick={handleConfirm} disabled={confirmed}
              className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
              {confirmed ? "Confirmed ✓" : "Confirm Delivery"}
            </button>
          </div>
        </div>

        {/* PO Details */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">PO Details</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Department</p>
              <p className="text-sm font-semibold text-foreground">Engineering</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vendor</p>
              <p className="text-sm font-semibold text-foreground">ABC Supplies</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Delivery status</p>
              <span className="text-sm font-semibold text-emerald-500">Full Delivery</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <span className="text-sm font-semibold text-amber-500">Medium</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Items <span className="text-muted-foreground font-normal">5</span></h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Description</th>
                <th className="px-6 py-3 text-center font-semibold text-foreground">Delivered</th>
                <th className="px-6 py-3 text-center font-semibold text-foreground">Confirmed Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="px-6 py-4 font-semibold text-foreground">{item.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{item.description}</td>
                  <td className="px-6 py-4 text-center text-foreground">{item.delivered}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-12 text-center text-sm font-medium text-foreground">{item.confirmedQty}</span>
                      <div className="flex flex-col">
                        <button onClick={() => updateQty(i, 1)} disabled={confirmed || item.confirmedQty >= item.delivered}
                          className="w-5 h-4 flex items-center justify-center rounded hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button onClick={() => updateQty(i, -1)} disabled={confirmed || item.confirmedQty <= 0}
                          className="w-5 h-4 flex items-center justify-center rounded hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
      <div className="w-64 shrink-0 bg-white rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-5">Workflow Progress</h3>
        <div className="space-y-0">
          {workflowSteps.map((s, i) => (
            <WorkflowStep key={i} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
