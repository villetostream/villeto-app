"use client";

import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";

interface ManagerFeedbackProps {
  status: PersonalExpenseStatus | "rejected";
  /** The actual rejection reason text returned by the API */
  rejectionReason?: string | null;
  /** The name + role of the person who took the action */
  actionedBy?: string | null;
}

/**
 * ManagerFeedback — replaces the old "CO's Note" component.
 *
 * Design rationale:
 *  - "Manager's Feedback" is the clearest label for both the submitter
 *    (who wants to know WHY their report was rejected) and the manager
 *    (who can verify their own note is recorded correctly).
 *  - For approved reports we keep a positive confirmation note.
 *  - For rejected reports we show the ACTUAL rejection reason from the API,
 *    not a generic hardcoded string. This is the most important UX fix —
 *    the submitter needs to read the exact words of the manager to know
 *    what to fix.
 *  - For pending reports we show a neutral "under review" note.
 */
export function CONote({ status, rejectionReason, actionedBy }: ManagerFeedbackProps) {
  // Don't render for drafts — there is no feedback yet
  if (status === "draft") return null;

  const config = (() => {
    switch (status) {
      case "approved":
      case "paid":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
          title: "Manager's Feedback",
          message: "This report has been reviewed and approved. The expenses align with company policy and budget allocation.",
          bg: "bg-emerald-50 border-emerald-100",
          titleColor: "text-emerald-700",
          textColor: "text-emerald-800",
        };
      case "rejected":
      case "declined":
        return {
          icon: <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
          title: "Reason for rejection",
          // Show the actual reason if provided, otherwise show a helpful fallback
          message: rejectionReason?.trim()
            ? rejectionReason.trim()
            : "No specific reason was provided. Please contact your manager for clarification.",
          bg: "bg-red-50 border-red-100",
          titleColor: "text-red-700",
          textColor: "text-red-800",
        };
      case "flagged":
        return {
          icon: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
          title: "Manager's Feedback",
          message: "One or more expenses in this report have been flagged for further review. Please edit and resubmit.",
          bg: "bg-amber-50 border-amber-100",
          titleColor: "text-amber-700",
          textColor: "text-amber-800",
        };
      case "pending":
      default:
        return {
          icon: <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
          title: "Manager's Feedback",
          message: "This report is currently under review by your manager. You will be notified once a decision is made.",
          bg: "bg-blue-50 border-blue-100",
          titleColor: "text-blue-700",
          textColor: "text-blue-800",
        };
    }
  })();

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{config.title}</h2>
      <div className={`rounded-xl border p-4 ${config.bg}`}>
        <div className="flex items-start gap-2.5">
          {config.icon}
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-relaxed ${config.textColor}`}>
              {config.message}
            </p>
            {/* Show who actioned this if available (e.g. "Reviewed by John Doe (Controlling Officer)") */}
            {actionedBy && (
              <p className={`text-xs mt-1.5 opacity-70 ${config.textColor}`}>
                — {actionedBy}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
