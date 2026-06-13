"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { getStatusIcon } from "@/lib/helper";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";
import { useAuthStore } from "@/stores/auth-stores";
import { unsortedReimbursements } from "@/lib/mock-data";
import { useState } from "react";

// ─── Status helpers (same as company page) ────────────────────────────────────

type ReportStatus = "pending" | "approved" | "rejected" | "declined" | "paid" | "flagged" | "draft";

const getStatusBadgeVariant = (status: ReportStatus): "approved" | "rejected" | "pending" | "paid" | "draft" => {
  switch (status) {
    case "paid": return "paid";
    case "approved": return "approved";
    case "rejected": case "declined": return "rejected";
    case "draft": return "draft";
    default: return "pending";
  }
};

const getStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case "paid": return "bg-[#38B2AC] text-white border-0";
    case "approved": return "bg-purple-100 text-purple-700 border-0";
    case "pending": return "bg-orange-100 text-orange-700 border-0";
    case "draft": return "bg-gray-200 text-gray-700 border-0";
    case "rejected": case "declined": return "bg-red-100 text-red-700 border-0";
    default: return "bg-gray-200 text-gray-700 border-0";
  }
};

const getStatusLabel = (status: ReportStatus): string => {
  switch (status) {
    case "declined": return "Rejected";
    case "paid": return "Paid Out";
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ─── Progress stepper ─────────────────────────────────────────────────────────

interface Step {
  label: string;
  sub: string;
  done: boolean;
  pending?: boolean;
}

function buildSteps(status: ReportStatus, report: typeof unsortedReimbursements[0]): Step[] {
  const createdDone  = true;
  const managerDone  = ["approved", "paid", "rejected", "declined"].includes(status);
  const paymentDone  = status === "paid";
  const paymentPending = status === "approved";
  const _paidOutDone  = status === "paid";

  const steps: Step[] = [
    { label: "Created",          sub: report.date,                          done: createdDone },
    { label: "Manager approval", sub: managerDone ? `Pelumi Yemi (${report.date})` : "Pending", done: managerDone },
    { label: "Payment approval", sub: paymentDone ? `Emmaunel (${report.date})` : "Pending",   done: paymentDone, pending: paymentPending },
  ];

  if (status === "paid") {
    steps.push({ label: "Paid out", sub: `${report.date}, 7:20pm`, done: true });
  }

  return steps;
}

// ─── Reject reason modal ───────────────────────────────────────────────────────

function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const handleClose = () => { setReason(""); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Report</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Please provide a reason for rejecting this expense. This will be shared with the employee.
        </p>
        <div className="space-y-2 mt-1">
          <label className="text-sm font-medium text-foreground">
            Enter Rejection Reason <span className="text-destructive">(Required)</span>
          </label>
          <Textarea
            placeholder="Write note here......"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => { if (reason.trim()) onConfirm(reason); }}
            disabled={!reason.trim() || isLoading}
            className="bg-destructive hover:bg-destructive/90 text-white"
          >
            {isLoading ? "Processing..." : "Reject Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Feedback modal ────────────────────────────────────────────────────────────

function FeedbackModal({
  open,
  onClose,
  type,
}: {
  open: boolean;
  onClose: () => void;
  type: "approved" | "rejected";
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="relative w-20 h-20">
            <span className="absolute -top-3 left-0 w-2.5 h-2.5 bg-blue-500 rotate-45 rounded-sm" />
            <span className="absolute -top-5 left-7 w-2 h-2 bg-orange-400 rounded-sm rotate-12" />
            <span className="absolute top-0 -right-2 text-green-400 text-xl leading-none">✦</span>
            <span className="absolute top-8 -right-4 w-1.5 h-5 bg-blue-400 rounded-full rotate-12" />
            <span className="absolute top-3 -left-5 text-orange-400 text-sm leading-none">✦</span>
            <span className="absolute -bottom-2 right-1 text-green-400 text-sm leading-none">★</span>
            <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
              <Check className="w-9 h-9 text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold text-foreground">
              {type === "approved" ? "Expense Approved Successfully" : "Expense Rejected"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === "approved"
                ? "The expense has been approved and the requester has been notified. You can view this approval in the expense audit trail."
                : "The expense has been rejected. The requester has been informed and can make corrections or resubmit for approval."}
            </p>
          </div>
          <Button onClick={onClose} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
            View Audi Trail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReimbursementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = useAuthStore();
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());

  const reportId = Number(params.id);
  const report = unsortedReimbursements.find((r) => r.id === reportId);

  // Local status override — swapped in when API isn't ready yet
  const [localStatus, setLocalStatus] = useState<ReportStatus | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; type: "approved" | "rejected" } | null>(null);

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center py-12">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Report not found</h1>
        <p className="text-muted-foreground">The report you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  const currentStatus = (localStatus ?? report.status) as ReportStatus;
  const steps = buildSteps(currentStatus, report);

  // Mock 5 items splitting total evenly — replace with API data when available
  const itemAmount = report.amount / 5;
  const items = [
    { id: 1, name: "Dubai",  description: "Brief description on the expenses" },
    { id: 2, name: "Dubai",  description: "Brief description on the expenses" },
    { id: 3, name: "Dubai",  description: "Brief description on the expenses" },
    { id: 4, name: "Dubai",  description: "Brief description on the expenses" },
    { id: 5, name: "Dubai",  description: "Brief description on the expenses" },
  ];

  // Permission gate: only finance/payment approvers see action buttons
  // Only show on "approved" status (manager already approved, now awaiting payment approval)
  const canApprovePayment = can("expense.report", "approve_payment") || can("expense.report", "approve_company");
  const showActions = canApprovePayment && currentStatus === "approved";

  // ── Handlers (stubbed — swap for real API calls when endpoint is ready) ──

  const handleApproveAndPayout = async () => {
    setApproveLoading(true);
    // TODO: replace with real API call → PATCH /reports/:id { status: "paid" }
    await new Promise((res) => setTimeout(res, 1200));
    setApproveLoading(false);
    setLocalStatus("paid");
    setFeedbackModal({ open: true, type: "approved" });
  };

  const handleReject = async (_reason: string) => {
    setRejectLoading(true);
    // TODO: replace with real API call → PATCH /reports/:id { status: "rejected", reason }
    await new Promise((res) => setTimeout(res, 1200));
    setRejectLoading(false);
    setRejectOpen(false);
    setLocalStatus("rejected");
    setFeedbackModal({ open: true, type: "rejected" });
  };

  const initials = getInitials(report.employee);

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        {/* Submitter + horizontal workflow progress stepper */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={report.avatar} alt={report.employee} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-3">{report.employee}</p>

            {/* Step progress bar */}
            <div className="flex items-start">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[96px]">
                    {/* Circle */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.done
                          ? "bg-teal-500"
                          : step.pending
                          ? "bg-yellow-400"
                          : "bg-muted border border-border"
                      }`}
                    >
                      {step.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <p className="text-xs font-medium text-foreground mt-1 text-center leading-tight">{step.label}</p>
                    <p className="text-xs text-muted-foreground text-center leading-tight">{step.sub}</p>
                  </div>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className={`h-px w-8 shrink-0 mb-7 ${step.done ? "bg-teal-500" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report title + status */}
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{report.category}</h1>
          <Badge variant={getStatusBadgeVariant(currentStatus)} className={getStatusColor(currentStatus)}>
            {getStatusIcon(currentStatus as PersonalExpenseStatus)}
            <span className="ml-1">{getStatusLabel(currentStatus)}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{report.date} &nbsp; 07:07 PM</p>

        {/* Items table */}
        <div className="bg-white border border-border rounded-lg mb-6">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">
              Items <span className="text-muted-foreground font-normal">{items.length}</span>
            </h3>
            <span className="text-base font-semibold text-foreground">
              Total: {currencySymbol}{report.amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  {["Expenses Details", "Category", "Merchant", "Amount", "Receipt", "Policy Compliance"].map((h) => (
                    <th key={h} className="text-left p-3 text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{report.category}</td>
                    <td className="p-3 text-sm text-muted-foreground">{report.category}</td>
                    <td className="p-3 text-sm font-medium text-foreground">
                      {currencySymbol}{itemAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="p-3">
                      <button className="text-sm text-primary hover:underline font-medium">View</button>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                        <Check className="h-4 w-4" />
                        Within limit
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons — only for payment approvers on approved reports */}
        {showActions && (
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setRejectOpen(true)}
              disabled={approveLoading || rejectLoading}
              className="bg-red-500 text-white hover:bg-red-600 px-8 h-11 rounded-lg font-medium min-w-[100px]"
            >
              Reject
            </Button>
            <Button
              onClick={handleApproveAndPayout}
              disabled={approveLoading || rejectLoading}
              className="bg-teal-500 text-white hover:bg-teal-600 px-8 h-11 rounded-lg font-medium min-w-[160px]"
            >
              {approveLoading ? "Processing..." : "Approve and Payout"}
            </Button>
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      <RejectReasonModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isLoading={rejectLoading}
      />

      {/* Feedback modal */}
      {feedbackModal && (
        <FeedbackModal
          open={feedbackModal.open}
          onClose={() => {
            setFeedbackModal(null);
            router.push("/expenses/reimbursements");
          }}
          type={feedbackModal.type}
        />
      )}
    </>
  );
}
