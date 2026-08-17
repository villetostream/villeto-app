"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

type RecurringBill = {
  id: string;
  vendor: string;
  description: string;
  amount: string;
  frequency: string;
  nextDue: string;
  status: string;
};

const mockRecurringBills: RecurringBill[] = [
  { id: "00041", vendor: "Atlas Partners", description: "Equipment Lease", amount: "₦4,200,000.00", frequency: "Weekly", nextDue: "10 Sept 2025", status: "Paused" },
  { id: "00042", vendor: "Tech Flow Inc", description: "Cloud Hosting Services", amount: "₦1,500,000.00", frequency: "Monthly", nextDue: "15 Oct 2025", status: "Active" },
  { id: "00043", vendor: "Global Logistics", description: "Fleet Maintenance", amount: "₦2,800,000.00", frequency: "Bi-Weekly", nextDue: "22 Sept 2025", status: "Active" },
  { id: "00044", vendor: "Prime Workspace", description: "Office Rent", amount: "₦8,500,000.00", frequency: "Quarterly", nextDue: "01 Nov 2025", status: "Paused" },
  { id: "00045", vendor: "Secure Networks", description: "Cybersecurity Retainer", amount: "₦3,100,000.00", frequency: "Monthly", nextDue: "05 Oct 2025", status: "Active" },
];

const columnHelper = createColumnHelper<RecurringBill>();

export function RecurringBillsTable() {
  const router = useRouter();
  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const [search, setSearch] = useState("");

  const filteredBills = useMemo(() => {
    let result = mockRecurringBills;
    if (tableprops.globalSearch) {
      const searchLower = tableprops.globalSearch.toLowerCase();
      result = result.filter(r => 
        r.vendor.toLowerCase().includes(searchLower) || 
        r.id.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [tableprops.globalSearch]);

  useEffect(() => {
    tableprops.setTotalItems(filteredBills.length);
  }, [filteredBills.length, tableprops.setTotalItems]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => <p className="text-gray-500 font-medium">{info.getValue()}</p>,
    }),
    columnHelper.accessor("vendor", {
      header: "VENDOR",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("description", {
      header: "DESCRIPTION",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("frequency", {
      header: "FREQUENCY",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("nextDue", {
      header: "NEXT DUE",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue().toLowerCase();
        if (status === "active") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-normal">Active</Badge>;
        } else if (status === "paused") {
          return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50 font-normal">Paused</Badge>;
        }
        return <Badge variant="outline">{info.getValue()}</Badge>;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "ACTION",
      enableHiding: false,
      cell: () => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    }),
  ], []);

  return (
    <DataTable
      data={filteredBills}
      manualPagination={false}
      columns={columns as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={false}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) => router.push(`/bill-pay/recurring/${(row as RecurringBill).id}`)}
      tableHeader={{
        actionButton: <></>,
        isSearchable: true,
        isExportable: false,
        isFilter: true,
        enableColumnVisibility: false,
        search: tableprops.globalSearch,
        searchQuery: tableprops.setGlobalSearch,
        filterProps: {
          title: "Filter",
          filterData: [],
          onFilter: () => {
            tableprops.setPage(1);
          },
        },
        bulkActions: [],
      }}
    />
  );
}
