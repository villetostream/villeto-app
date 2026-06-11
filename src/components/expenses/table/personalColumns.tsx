"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { SortableColumnHeader } from "@/components/datatable/SortableColumnHeader";
import { useAuthStore } from "@/stores/auth-stores";

export type PersonalExpenseStatus =
  | "draft"
  | "pending"
  | "approved"
  | "declined"
  | "rejected"
  | "paid"
  | "flagged";

export type PersonalExpenseRow = {
  date: string;
  reportName: string;
  category: string;
  amount: number;
  status: PersonalExpenseStatus;
  reportId: string;
};

function ActionsCell({ expense }: { expense: PersonalExpenseRow }) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isDraft = expense.status === "draft";
    const path = isDraft
      ? `/expenses/personal/${expense.reportId}/edit`
      : `/expenses/personal/${expense.reportId}`;
    router.push(path);
  };

  return (
    <button
      type="button"
      aria-label="View expense report"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  );
}

export const personalExpenseColumns: ColumnDef<PersonalExpenseRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="DATE" />
    ),
  },
  {
    accessorKey: "reportName",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="REPORT NAME" />
    ),
  },
  { accessorKey: "category", header: "COST CENTER" },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="AMOUNT" />
    ),
    cell: ({ row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
      const currencySymbol = getCurrencySymbol();
      return (
        <span className="font-semibold">
          {currencySymbol}{Number(row.getValue("amount") ?? 0).toLocaleString()}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <ExpenseStatusBadge status={row.getValue("status") as string} />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell expense={row.original} />,
  },
];
