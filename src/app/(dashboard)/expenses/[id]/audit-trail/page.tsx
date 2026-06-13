"use client";

import { AuditTrailTable } from "@/components/expenses/AuditTrailTable";
import React from "react";
import { useRouter, useParams } from "next/navigation";

const auditEntries = [
  {
    step: 1,
    action: "Expense Created",
    user: "Goodness Swift",
    role: "Marketing Officer",
    timestamp: "Mar 3, 2025 - 10:15 AM",
    note: 'Created expense "Client Lunch - Q1 Review" for $850',
  },
  {
    step: 2,
    action: "Expense Submitted",
    user: "Goodness Swift",
    role: "Marketing Officer",
    timestamp: "Mar 3, 2025 - 10:17 AM",
    note: "Submitted for approval",
  },
  {
    step: 3,
    action: "Policy Check Passed",
    user: "System Bot",
    role: "Automation",
    timestamp: "Mar 3, 2025 - 10:18 AM",
    note: "Within category limits",
  },
  {
    step: 4,
    action: "Expense Reviewed",
    user: "Sandra Nuel",
    role: "Marketing Manager",
    timestamp: "Mar 3, 2025 - 11:02 AM",
    note: "Verified attached receipt",
  },
  {
    step: 5,
    action: "Approved",
    user: "Joy Nuel",
    role: "Controlling Officer",
    timestamp: "Mar 3, 2025 - 11:05 AM",
    note: "Approved and forwarded to Finance",
  },
  {
    step: 6,
    action: "Payment Scheduled",
    user: "Tolu Ade",
    role: "Finance Admin",
    timestamp: "Mar 4, 2025 - 09:45 AM",
    note: "Scheduled for payment on Mar 6",
  },
  {
    step: 7,
    action: "Expense Paid",
    user: "System Bot",
    role: "Automation",
    timestamp: "Mar 6, 2025 - 12:00 PM",
    note: "Paid to Account – Ref: TXN-99871",
  },
];

const Page = () => {
  const _router = useRouter();
  const params = useParams();
  const _expenseId = params.id;

  return (
    <div className="space-y-6">
      {/* Audit Trail Table */}
      <AuditTrailTable
        expenseId="EXP-2025"
        status="Paid"
        entries={auditEntries}
      />
    </div>
  );
};

export default Page;
