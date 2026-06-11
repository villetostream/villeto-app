"use client";

import React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { getStatusIcon } from "@/lib/helper";
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
  date: string; // Maps to createdAt from API
  reportName: string; // Maps to reportTitle from API
  category: string; // Maps to costCenter from API
  amount: number; // Maps to totalAmount from API (now a number)
  status: PersonalExpenseStatus; // Status is now required
  reportId: string; // Maps to reportId from API (string, not number)
};

function ActionsCell({ row }: { row: any }) {
  const expense = row.original as PersonalExpenseRow;
  const router = import("next/navigation").then(m => m.useRouter()).catch(() => null) as any;
  const [navRouter, setNavRouter] = React.useState<any>(null);

  React.useEffect(() => {
    import("next/navigation").then(m => setNavRouter(m.useRouter()));
  }, []);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isDraft = expense.status === "draft";
    const path = isDraft 
      ? `/expenses/personal/${expense.reportId}/edit`
      : `/expenses/personal/${expense.reportId}`;
      
    if (navRouter) navRouter.push(path);
    else window.location.href = path;
  };

  return (
    <button 
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
    cell: ({ row }) => {
      const rawStatus = row.getValue("status") as string;
      const displayStatus = rawStatus === "pending_policy_check" || rawStatus === "pending" ? "submitted" : rawStatus;
      
      return (
        <Badge
          variant={
            displayStatus === "submitted" ? "pending" : (displayStatus as any)
          }
        >
          {getStatusIcon(displayStatus)}
          <span className="ml-1 capitalize">{displayStatus}</span>
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const router = import("next/navigation").then(m => m.useRouter);
      const expense = row.original;
      
      const handleClick = () => {
        const isDraft = expense.status === "draft";
        const path = isDraft 
          ? `/expenses/personal/${expense.reportId}/edit`
          : `/expenses/personal/${expense.reportId}`;
        
        // window.location.href handles the routing if we can't safely use useRouter here
        window.location.href = path;
      };

      // Ensure we have a clickable button like the company scope
      return (
        <button 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 w-8 cursor-pointer"
          onClick={handleClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      );
    },
  },
];