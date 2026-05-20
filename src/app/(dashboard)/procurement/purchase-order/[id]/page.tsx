"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";

type WFStage = "pending_approval" | "approved" | "acknowledged" | "partial_delivery" | "full_delivery";

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
      <div className="pb-4">
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

function ApproveModal({ vendor, onConfirm, onClose }: { vendor: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">Approve and Issue Purchase Order</h3>
          <p className="text-sm text-muted-foreground">
            You are approving this purchase order for <strong>{vendor}</strong>.
            Once approved, the vendor will receive the order and can begin delivery and invoice against it.
          </p>
        </div>
        <button onClick={onConfirm}
          className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          Approve and Issue PO
        </button>
      </div>
    </div>
  );
}

export default function PODetailPage() {
  const [stage, setStage]       = useState<WFStage>("pending_approval");
  const [modal, setModal]       = useState<"approve" | "reject" | "withdraw" | "close" | null>(null);

  const isDelivered = stage === "partial_delivery" || stage === "full_delivery";

  const items = [
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", qty: 10, unitPrice: 400000 },
  ];

  const stageCycleMap: Record<WFStage, { next: WFStage; label: string; btn: string } | null> = {
    pending_approval: { next: "approved",         label: "Approve",     btn: "Approve PO" },
    approved:         { next: "acknowledged",      label: "Acknowledge", btn: "Acknowledge" },
    acknowledged:     { next: "partial_delivery",  label: "Deliver",     btn: "Mark Delivered" },
    partial_delivery: { next: "full_delivery",     label: "Full deliver",btn: "Mark Full Delivery" },
    full_delivery:    null,
  };

  const workflowSteps = [
    { label: "Created by",      person: "Pelumi Yemi (Employee)", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Manager Approval",person: "Sam John", badge: "Approved", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    { label: "Create PO",       person: "Wang Chi", badge: "Done", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", done: true },
    {
      label: "PO Approval",
      person: stage !== "pending_approval" ? "Sang Fhi (You)" : undefined,
      badge: stage !== "pending_approval" ? "Approved" : undefined,
      badgeColor: "text-emerald-600 bg-emerald-50",
      timestamp: stage !== "pending_approval" ? "09-10-2025  07:07 PM" : undefined,
      done: stage !== "pending_approval",
      pending: stage === "pending_approval",
    },
    ...(stage === "acknowledged" || stage === "partial_delivery" || stage === "full_delivery" ? [{
      label: "Vendor", person: "ABC Supplies",
      badge: stage === "partial_delivery" ? "Partial Delivery" : stage === "full_delivery" ? "Full Delivery" : "Acknowledged",
      badgeColor: stage === "partial_delivery" ? "text-blue-600 bg-blue-50" : stage === "full_delivery" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50",
      timestamp: "09-10-2025  07:07 PM", done: true,
    }] : []),
  ];

  return (
    <>
      {modal === "approve" && (
        <ApproveModal
          vendor="ABC Supplies"
          onClose={() => setModal(null)}
          onConfirm={() => { setStage("approved"); setModal(null); }}
        />
      )}
      {(modal === "reject" || modal === "withdraw" || modal === "close") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold">
              {modal === "close" ? "Close PO" : modal === "withdraw" ? "Withdraw PO" : "Reject PO"}
            </h3>
            <p className="text-sm text-muted-foreground">Are you sure you want to proceed?</p>
            <button onClick={() => setModal(null)}
              className="w-full h-11 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              Confirm
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Left */}
        <div className="flex-1 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">PO-2024-001</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  stage === "pending_approval" ? "bg-purple-50 text-purple-600" :
                  isDelivered ? "bg-emerald-50 text-emerald-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {stage === "pending_approval" ? "Pending Approval" : isDelivered ? "Delivered" : "Awaiting Approval"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Submitted on 2024-03-15</p>
            </div>
            <div className="flex items-center gap-3">
              {stage === "pending_approval" && (
                <>
                  <button onClick={() => setModal("reject")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                    Reject PO
                  </button>
                  <button onClick={() => setModal("approve")}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Approve PO
                  </button>
                </>
              )}
              {stage === "approved" && (
                <button onClick={() => setModal("withdraw")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Withdraw PO
                </button>
              )}
              {(stage === "acknowledged" || stage === "partial_delivery" || stage === "full_delivery") && (
                <button onClick={() => setModal("close")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Close PO
                </button>
              )}
            </div>
          </div>

          {/* Stage cycle buttons (demo) */}
          {stageCycleMap[stage] && (
            <button
              onClick={() => setStage(stageCycleMap[stage]!.next)}
              className="text-xs px-3 h-7 rounded-full border border-dashed border-primary/40 text-primary/70 hover:bg-primary/5 transition-colors"
            >
              → Demo: advance to "{stageCycleMap[stage]!.label}"
            </button>
          )}

          {/* PO Details */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">PO Details</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Department</p>
                <p className="text-sm font-semibold text-foreground">Engineering</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                <p className="text-sm font-semibold text-foreground">ABC Supplies</p>
              </div>
              {isDelivered ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Delivery status</p>
                  <span className="text-sm font-semibold text-emerald-500">Delivered</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <span className="text-sm font-semibold text-amber-500">Medium</span>
                </div>
              )}
              {isDelivered && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <span className="text-sm font-semibold text-amber-500">Medium</span>
                </div>
              )}
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
                  <th className="px-6 py-3 text-center font-semibold text-foreground">Qty</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Unit Price</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-6 py-4 font-semibold text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.description}</td>
                    <td className="px-6 py-4 text-center">{item.qty}</td>
                    <td className="px-6 py-4 text-right">{item.unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 1 })}</td>
                    <td className="px-6 py-4 text-right">{(item.qty * item.unitPrice).toLocaleString("en-NG", { minimumFractionDigits: 1 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end px-6 py-4 border-t border-border/40">
              <div className="flex items-center gap-8">
                <span className="text-sm font-semibold text-primary">Total Amount</span>
                <span className="text-base font-bold text-foreground">₦16,000,000</span>
              </div>
            </div>
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
    </>
  );
}
