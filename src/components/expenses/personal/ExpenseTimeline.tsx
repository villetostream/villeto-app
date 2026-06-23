"use client";

import React from "react";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";

import type { TimelineEvent } from "@/lib/react-query/expenses";
import { useAuthStore } from "@/stores/auth-stores";

interface TimelineEntry {
  stage: string;
  by: string;
  timestamp: string;
  dotColor: string;
  isActive: boolean;
}

interface ExpenseTimelineProps {
  status: PersonalExpenseStatus;
  submissionDate: string;
  /** Name of the person who submitted the report. Falls back to "..." if not provided. */
  submitterName?: string;
  /** Name of the person who approved the report. If provided, replaces byApprover. */
  approverName?: string;
  timeline?: TimelineEvent[];
}

const getTimelineEntries = (
  status: PersonalExpenseStatus,
  submitterName: string,
  submissionDate: string,
  approverName?: string,
): TimelineEntry[] => {
  const bySubmitter = `By ${submitterName}`;
  const byApprover  = approverName ? `By ${approverName}` : "By Manager";

  const created: TimelineEntry = {
    stage: "Created",
    by: bySubmitter,
    timestamp: submissionDate,
    dotColor: "bg-gray-300",
    isActive: true,
  };

  const submitted: TimelineEntry = {
    stage: "Submitted for Approval",
    by: bySubmitter,
    timestamp: submissionDate,
    dotColor: "bg-orange-500",
    isActive: true,
  };

  switch (status) {
    case "draft":
      return [created];

    case "pending":
      return [
        created,
        submitted,
        {
          stage: "Under Review",
          by: "Awaiting Manager Review",
          timestamp: "Pending",
          dotColor: "bg-yellow-500",
          isActive: false,
        },
      ];

    case "approved":
      return [
        created,
        submitted,
        {
          stage: "Under Review",
          by: "Manager Review Completed",
          timestamp: "",
          dotColor: "bg-yellow-500",
          isActive: true,
        },
        {
          stage: "Expense Approved",
          by: byApprover,
          timestamp: "",
          dotColor: "bg-green-600",
          isActive: true,
        },
      ];

    case "paid":
      return [
        created,
        submitted,
        {
          stage: "Under Review",
          by: "Manager Review Completed",
          timestamp: "",
          dotColor: "bg-yellow-500",
          isActive: true,
        },
        {
          stage: "Expense Approved",
          by: byApprover,
          timestamp: "",
          dotColor: "bg-green-600",
          isActive: true,
        },
        {
          stage: "Reimbursement Processing",
          by: "By Finance Department",
          timestamp: "",
          dotColor: "bg-indigo-500",
          isActive: true,
        },
        {
          stage: "Paid",
          by: "Payment Completed",
          timestamp: "",
          dotColor: "bg-[#38B2AC]",
          isActive: true,
        },
      ];

    case "rejected":
    case "declined":
      return [
        created,
        submitted,
        {
          stage: "Under Review",
          by: "Manager Review Completed",
          timestamp: "",
          dotColor: "bg-yellow-500",
          isActive: true,
        },
        {
          stage: "Expense Rejected",
          by: byApprover,
          timestamp: "",
          dotColor: "bg-red-500",
          isActive: true,
        },
      ];

    case "flagged":
      return [
        created,
        submitted,
        {
          stage: "Under Review",
          by: "Manager Review Completed",
          timestamp: "",
          dotColor: "bg-yellow-500",
          isActive: true,
        },
        {
          stage: "Expense Flagged",
          by: byApprover,
          timestamp: "",
          dotColor: "bg-orange-500",
          isActive: true,
        },
      ];

    default:
      return [created];
  }
};

export function ExpenseTimeline({
  status,
  submissionDate,
  submitterName = "...",
  approverName,
  timeline,
}: ExpenseTimelineProps) {
  const currentUser = useAuthStore((state) => state.user);

  // Use backend timeline if available
  const entries: TimelineEntry[] = timeline && timeline.length > 0 
    ? timeline.map((event, i) => {
        const isLast = i === timeline.length - 1;
        let byString = "System";

        if (event.performedBy) {
          const isCurrentUser =
            currentUser &&
            currentUser.firstName === event.performedBy.firstName &&
            String(currentUser.lastName) === String(event.performedBy.lastName) &&
            (currentUser.companyRole?.name === event.performedBy.roleName ||
              currentUser.villetoRole?.name === event.performedBy.roleName ||
              currentUser.jobTitle === event.performedBy.roleName ||
              currentUser.position === event.performedBy.roleName);

          const roleName = event.performedBy.roleName ? `(${event.performedBy.roleName})` : "";

          if (isCurrentUser) {
            byString = `By You ${roleName}`.trim();
          } else {
            const performedByName = `${event.performedBy.firstName || ""} ${event.performedBy.lastName || ""}`.trim();
            byString = performedByName ? `By ${performedByName} ${roleName}`.trim() : "System";
          }
        }
        
        let dotColor = "bg-primary";
        let stage = event.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        
        if (event.action === "submitted") {
          dotColor = "bg-orange-500";
          stage = "Submitted for Approval";
        } else if (event.action === "under_review") {
          dotColor = "bg-yellow-500";
          stage = "Under Review";
        } else if (event.action === "approved") {
          dotColor = "bg-green-600";
          stage = "Expense Approved";
        } else if (event.action === "rejected" || event.action === "declined") {
          dotColor = "bg-red-500";
          stage = "Expense Rejected";
        } else if (event.action === "paid") {
          dotColor = "bg-teal-500";
          stage = "Paid";
        }

        return {
          stage,
          by: byString,
          timestamp: new Date(event.timestamp).toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }).replace(",", ""),
          dotColor,
          isActive: isLast,
        };
      })
    : getTimelineEntries(status, submitterName, submissionDate, approverName);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Expense Timeline</h2>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

        <div className="space-y-6">
          {entries.map((entry, index) => (
            <div key={index} className="relative flex items-start gap-4">
              {/* Dot */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full ${entry.dotColor} flex items-center justify-center shrink-0`}
              >
                {entry.isActive && (
                  <div className="w-3 h-3 rounded-full bg-white" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pt-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {entry.stage}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{entry.by}</p>
                {entry.timestamp && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {entry.timestamp}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
