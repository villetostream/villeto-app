"use client";

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
      const status = row.getValue("status") as PersonalExpenseStatus;
      return (
        <Badge
          variant={
            status as
              | "draft"
              | "rejected"
              | "approved"
              | "paid"
              | "pending"
              | "declined"
          }
        >
          {getStatusIcon(status)}
          <span className="ml-1 capitalize">{status}</span>
        </Badge>
      );
    },
  },
];