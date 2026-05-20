"use client";

import { useState } from "react";
import { Pencil, AlertCircle, X, ChevronDown, ExternalLink, Scissors } from "lucide-react";
import { SEED_REQUESTS } from "../page";

// ─── Workflow Step ─────────────────────────────────────────────────────────────

type StepStatus = "done" | "pending" | "inactive";

interface WorkflowStep {
  label: string;
  person?: string;
  role?: string;
  timestamp?: string;
  badge?: string;
  badgeColor?: string;
  status: StepStatus;
}

function WorkflowProgress({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          {/* Dot + line */}
          <div className="relative flex flex-col items-center">
            <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-1 ${
              step.status === "done"
                ? "border-primary bg-primary"
                : step.status === "pending"
                ? "border-amber-400 bg-amber-100"
                : "border-gray-300 bg-white"
            }`} />
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[28px]" />
            )}
          </div>
          {/* Content */}
          <div className="pb-5 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${step.status === "inactive" ? "text-gray-400" : "text-foreground"}`}>
              {step.label}
            </p>
            {step.person && (
              <p className={`text-xs mt-0.5 ${step.status === "inactive" ? "text-gray-300" : "text-muted-foreground"}`}>
                {step.person}
                {step.badge && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                )}
              </p>
            )}
            {step.timestamp && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{step.timestamp}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel = "Confirm", danger = false }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: message }} />
        </div>
        <button onClick={onConfirm}
          className={`w-full h-11 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 ${
            danger ? "bg-red-500" : "bg-primary"
          }`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Role Toggle ──────────────────────────────────────────────────────────────

type Role = "employee" | "manager" | "procurement";
const ROLES: { key: Role; label: string }[] = [
  { key: "employee",    label: "Employee View" },
  { key: "manager",     label: "Manager View" },
  { key: "procurement", label: "Procurement / Finance View" },
];

// ─── Item row for detail table ─────────────────────────────────────────────────

function ItemRow({ name, description, category, qty, unitPrice }: {
  name: string; description: string; category?: string; qty: number; unitPrice: number;
}) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-5 py-3.5 font-semibold text-foreground text-sm">{name}</td>
      <td className="px-5 py-3.5 text-muted-foreground text-sm">{description}</td>
      {category !== undefined && (
        <td className="px-5 py-3.5">
          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{category}</span>
        </td>
      )}
      <td className="px-5 py-3.5 text-center text-foreground text-sm">{qty}</td>
      <td className="px-5 py-3.5 text-right text-foreground text-sm">{unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 1 })}</td>
      <td className="px-5 py-3.5 text-right text-foreground text-sm">{(qty * unitPrice).toLocaleString("en-NG", { minimumFractionDigits: 1 })}</td>
    </tr>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex-1">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

// ─── Vendor Group (Manager / Procurement) ─────────────────────────────────────

const VENDORS = ["ABC Supplies","XYZ Corp","Global Tech","Alpha Solutions","Beta Systems"];

function VendorGroup({
  title,
  items,
  vendor,
  onVendorChange,
  poCreated,
  showSeparateItems = true,
}: {
  title?: string;
  items: { name: string; description: string; category?: string; qty: number; unitPrice: number }[];
  vendor: string;
  onVendorChange: (v: string) => void;
  poCreated: boolean;
  showSeparateItems?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useState<HTMLDivElement | null>(null);

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/10">
            <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Name</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Description</th>
            <th className="px-5 py-3 text-left text-sm font-semibold text-foreground">Category</th>
            <th className="px-5 py-3 text-center text-sm font-semibold text-foreground">Qty</th>
            <th className="px-5 py-3 text-right text-sm font-semibold text-foreground">Unit Price</th>
            <th className="px-5 py-3 text-right text-sm font-semibold text-foreground">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <ItemRow key={i} {...item} category={item.category ?? ""} />
          ))}
        </tbody>
      </table>

      {/* Vendor row */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border/40">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Vendor</span>
          {/* Vendor dropdown */}
          <div className="relative">
            <button type="button" onClick={() => setOpen(v => !v)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-white text-sm text-foreground hover:border-primary/60 transition-colors min-w-[140px] justify-between">
              <span>{vendor || "Select vendor"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="absolute left-0 top-10 z-50 bg-white border border-border rounded-xl shadow-lg w-48 overflow-hidden">
                {VENDORS.map(v => (
                  <button key={v} type="button" onClick={() => { onVendorChange(v); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${vendor === v ? "text-primary font-medium" : "text-foreground"}`}>
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {poCreated && (
            <button className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> View PO
            </button>
          )}
          {showSeparateItems && (
            <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Scissors className="w-3.5 h-3.5" /> Separate Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SAMPLE_ITEMS_GROUP_A = [
  { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", category: "IT Equipment", qty: 10, unitPrice: 400000 },
  { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", category: "IT Equipment", qty: 10, unitPrice: 400000 },
];
const SAMPLE_ITEMS_GROUP_B = [
  { name: "Power cable", description: "This connects the desktop to power", category: "Equipment", qty: 5, unitPrice: 5000 },
  { name: "Power cable", description: "This connects the desktop to power", category: "Equipment", qty: 5, unitPrice: 5000 },
];

export default function PRDetailPage({ params }: { params: { id: string } }) {
  const pr = SEED_REQUESTS.find(r => r.id === params.id) ?? SEED_REQUESTS[0];

  const [role, setRole]           = useState<Role>("employee");
  const [roleOpen, setRoleOpen]   = useState(false);
  const [wfStage, setWfStage]     = useState<"submitted" | "under_review" | "manager_approved" | "po_created" | "po_approved">("under_review");
  const [modal, setModal]         = useState<"approve" | "reject" | "withdraw" | "create_po" | null>(null);
  const [managerStatus, setManagerStatus] = useState<"pending" | "approved">("pending");
  const [poStatus, setPoStatus]           = useState<"pending" | "done">("pending");
  const [vendorA, setVendorA]     = useState("ABC Supplies");
  const [vendorB, setVendorB]     = useState("XYZ Supplies");

  const totalAmount = 16050000;

  // ── Workflow step configs ──
  const employeeSteps: WorkflowStep[] = [
    { label: "Submitted",        timestamp: "09-10-2025  07:07 PM", status: "done" },
    { label: "Under Review",     timestamp: wfStage !== "submitted" ? "09-10-2025  07:07 PM" : undefined, status: wfStage !== "submitted" ? "done" : "inactive" },
    { label: "Manager Approved", timestamp: ["manager_approved","po_created","po_approved"].includes(wfStage) ? "09-10-2025  07:07 PM" : undefined, status: ["manager_approved","po_created","po_approved"].includes(wfStage) ? "done" : "inactive" },
    { label: "PO Created",       timestamp: ["po_created","po_approved"].includes(wfStage) ? "09-10-2025  07:07 PM" : undefined, status: ["po_created","po_approved"].includes(wfStage) ? "done" : "inactive" },
    { label: "PO Approved",      timestamp: wfStage === "po_approved" ? "09-10-2025  07:07 PM" : undefined, status: wfStage === "po_approved" ? "done" : "inactive" },
  ];

  const managerSteps: WorkflowStep[] = [
    { label: "Created by",        person: "Pelumi Yemi (Employee)", timestamp: "09-10-2025  07:07 PM", status: "done" },
    { label: "Manager Approval",  person: "Sam John (You)", badge: managerStatus === "approved" ? "Approved" : "Pending", badgeColor: managerStatus === "approved" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50", timestamp: "09-10-2025  07:07 PM", status: managerStatus === "approved" ? "done" : "pending" },
  ];

  const procurementSteps: WorkflowStep[] = [
    { label: "Created by",       person: "Pelumi Yemi (Employee)", timestamp: "09-10-2025  07:07 PM", status: "done" },
    { label: "Manager Approval", person: "Sam John", badge: "Approved", badgeColor: "text-emerald-600 bg-emerald-50", timestamp: "09-10-2025  07:07 PM", status: "done" },
    { label: "Create PO",        person: "Wang Chi (You)", badge: poStatus === "done" ? "Done" : "Pending", badgeColor: poStatus === "done" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50", timestamp: "09-10-2025  07:07 PM", status: poStatus === "done" ? "done" : "pending" },
    { label: "PO Approval",      person: poStatus === "done" ? "Sang Fhi" : undefined, badge: poStatus === "done" ? "Pending" : undefined, badgeColor: "text-amber-600 bg-amber-50", status: poStatus === "done" ? "pending" : "inactive" },
  ];

  const statusLabel = role === "employee"
    ? (wfStage === "submitted" ? "Awaiting Approval" : wfStage === "under_review" ? "Awaiting Approval" : "Approved")
    : "Approved";

  const statusColor = statusLabel === "Approved"
    ? "text-emerald-600 bg-emerald-50"
    : "text-purple-600 bg-purple-50";

  return (
    <>
      {/* Modals */}
      {modal === "approve" && (
        <ConfirmModal
          title="Approve Request"
          message={`You are approving this purchase request for <strong>${vendorA}</strong>. Once approved, it will move to the next stage.`}
          confirmLabel="Approve Request"
          onClose={() => setModal(null)}
          onConfirm={() => { setManagerStatus("approved"); setWfStage("manager_approved"); setModal(null); }}
        />
      )}
      {modal === "reject" && (
        <ConfirmModal
          title="Reject Request"
          message="Are you sure you want to reject this purchase request? This action cannot be undone."
          confirmLabel="Reject Request"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => setModal(null)}
        />
      )}
      {modal === "withdraw" && (
        <ConfirmModal
          title="Withdraw Request"
          message="Are you sure you want to withdraw this purchase request?"
          confirmLabel="Withdraw Request"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => setModal(null)}
        />
      )}
      {modal === "create_po" && (
        <ConfirmModal
          title="Create Purchase Orders"
          message={`You are creating multiple POs for <strong>${vendorA}</strong> and <strong>${vendorB}</strong>. Vendors will receive their orders and can begin delivery.`}
          confirmLabel="Create POs"
          onClose={() => setModal(null)}
          onConfirm={() => { setPoStatus("done"); setWfStage("po_created"); setModal(null); }}
        />
      )}

      <div className="flex gap-6 items-start">
        {/* ── Left ── */}
        <div className="flex-1 space-y-4 min-w-0">

          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">PR-882</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Office Equipment</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {role === "employee" && (
                <>
                  <button onClick={() => {}}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5" /> Edit Request
                  </button>
                  <button onClick={() => setModal("withdraw")}
                    className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2">
                    Withdraw Request
                  </button>
                </>
              )}
              {role === "manager" && managerStatus === "pending" && (
                <>
                  <button onClick={() => setModal("reject")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                    Reject Request
                  </button>
                  <button onClick={() => setModal("approve")}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Approve Request
                  </button>
                </>
              )}
              {role === "manager" && managerStatus === "approved" && (
                <button onClick={() => setModal("withdraw")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Withdraw Request
                </button>
              )}
              {role === "procurement" && poStatus === "pending" && (
                <>
                  <button onClick={() => setModal("reject")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                    Reject Request
                  </button>
                  <button onClick={() => setModal("create_po")}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Create multiple PO
                  </button>
                </>
              )}
              {role === "procurement" && poStatus === "done" && (
                <button onClick={() => {}}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Delete POs
                </button>
              )}
            </div>
          </div>

          {/* Role switcher */}
          <div className="relative inline-block">
            <button onClick={() => setRoleOpen(v => !v)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-muted/30 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
              Viewing as: {ROLES.find(r => r.key === role)!.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {roleOpen && (
              <div className="absolute left-0 top-9 z-50 bg-white border border-border rounded-xl shadow-lg w-52 overflow-hidden">
                {ROLES.map(r => (
                  <button key={r.key} onClick={() => { setRole(r.key); setRoleOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${role === r.key ? "text-primary font-semibold bg-primary/5" : "text-foreground hover:bg-muted/40"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="flex gap-4">
            <InfoCard label="Department" value="Engineering" />
            <InfoCard label="Priority" value="Medium" />
            <InfoCard label="Expected Date" value="23/04/2027" />
          </div>

          {/* Request Items */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                Request Items <span className="text-muted-foreground font-normal ml-1">4</span>
              </h2>
            </div>

            {/* Employee view: flat table */}
            {role === "employee" && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/10">
                    <th className="px-5 py-3 text-left font-semibold text-foreground">Name</th>
                    <th className="px-5 py-3 text-left font-semibold text-foreground">Description</th>
                    <th className="px-5 py-3 text-left font-semibold text-foreground">Category</th>
                    <th className="px-5 py-3 text-center font-semibold text-foreground">Qty</th>
                    <th className="px-5 py-3 text-right font-semibold text-foreground">Unit Price</th>
                    <th className="px-5 py-3 text-right font-semibold text-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {[...SAMPLE_ITEMS_GROUP_A, ...SAMPLE_ITEMS_GROUP_B].map((item, i) => (
                    <ItemRow key={i} {...item} />
                  ))}
                </tbody>
              </table>
            )}

            {/* Manager / Procurement view: grouped by vendor */}
            {(role === "manager" || role === "procurement") && (
              <div className="divide-y divide-border/40">
                <VendorGroup
                  items={SAMPLE_ITEMS_GROUP_A}
                  vendor={vendorA}
                  onVendorChange={setVendorA}
                  poCreated={poStatus === "done"}
                  showSeparateItems={true}
                />
                <VendorGroup
                  items={SAMPLE_ITEMS_GROUP_B}
                  vendor={vendorB}
                  onVendorChange={setVendorB}
                  poCreated={poStatus === "done"}
                  showSeparateItems={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-64 shrink-0">
          {role === "employee" && (
            <div className="bg-white rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Workflow Progress</h3>
              <WorkflowProgress steps={employeeSteps} />
            </div>
          )}

          {(role === "manager" || role === "procurement") && (
            <div className="bg-[#1C2B36] rounded-2xl p-5 text-white space-y-4">
              <h3 className="text-sm font-semibold">Request Summary</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Total Items</span>
                  <span className="text-sm font-semibold">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Total Amount</span>
                </div>
                <p className="text-lg font-bold">₦{totalAmount.toLocaleString("en-NG")}.0</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <WorkflowProgress steps={role === "manager" ? managerSteps : procurementSteps} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
