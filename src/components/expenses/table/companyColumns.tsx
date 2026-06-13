"use client";

import { CompanyExpenseReport } from "@/lib/react-query/expenses";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/datatable/SortableColumnHeader";
import { useAuthStore } from "@/stores/auth-stores";

// Helper for initials
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Helper for formatted date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

function ActionsCell({ row, scope }: { row: Row<CompanyExpenseReport>; scope: string }) {
  const expense = row.original;
  const router = useRouter();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="cursor-pointer"
      onClick={() => router.push(`/expenses/company/${expense.reportId}?scope=${scope}`)}
    >
      <Eye className="w-4 h-4 text-muted-foreground" />
    </Button>
  );
}

export const getCompanyColumns = (scope: string): ColumnDef<CompanyExpenseReport>[] => [
  {
    accessorKey: "employee",
    header: "REQUESTED BY",
    cell: ({ row }) => {
      const report = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(report.reportedBy)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{report.reportedBy}</div>
            <div className="text-sm text-muted-foreground">
              {report.reportTitle}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "costCenter",
    header: "COST CENTER",
    cell: ({ row }) => {
      const costCenter = row.getValue("costCenter") as string;
      return <span>{costCenter || "Uncategorized"}</span>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="AMOUNT" />
    ),
    cell: ({ row }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
        const currencySymbol = getCurrencySymbol();
        const amount = row.getValue("totalAmount") as number;
        return <span className="font-semibold">{currencySymbol}{amount.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => {
      const report = row.original as CompanyExpenseReport;
      // Managers see approvalStatus — where the report sits in the approval chain.
      // Fall back to status if approvalStatus isn't yet returned by the API.
      const displayStatus = report.approvalStatus ?? report.status;
      return (
        <ExpenseStatusBadge
          status={displayStatus}
          context="manager"
        />
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="MODIFIED DATE" />
    ),
    cell: ({ row }) => {
        const updatedAt = row.getValue("updatedAt") as string;
        return <span>{formatDate(updatedAt)}</span>;
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableColumnHeader column={column} title="CREATED DATE" />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string;
      return <span>{formatDate(createdAt)}</span>;
    },
    enableHiding: true,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} scope={scope} />,
  },
];