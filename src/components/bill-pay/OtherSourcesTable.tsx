"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

type OtherSourceBill = {
  id: string;
  source: string;
  sender: string;
  received: string;
  extractedAmount: string;
  status: string;
};

const mockOtherSources: OtherSourceBill[] = [
  { id: "INV-2025-081", source: "Email (invoices@villeto.com)", sender: "billing@aws.com", received: "10 Sept 2025, 09:41 AM", extractedAmount: "₦142,500.00", status: "Needs Review" },
  { id: "INV-2025-082", source: "API Integration", sender: "QuickBooks Integration", received: "09 Sept 2025, 14:22 PM", extractedAmount: "₦85,000.00", status: "Processed" },
];

const columnHelper = createColumnHelper<OtherSourceBill>();

export function OtherSourcesTable() {
  const router = useRouter();
  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const filteredSources = useMemo(() => {
    let result = mockOtherSources;
    if (tableprops.globalSearch) {
      const searchLower = tableprops.globalSearch.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(searchLower) || 
        r.sender.toLowerCase().includes(searchLower) ||
        r.source.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [tableprops.globalSearch]);

  useEffect(() => {
    tableprops.setTotalItems(filteredSources.length);
  }, [filteredSources.length, tableprops.setTotalItems]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "REFERENCE",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("source", {
      header: "SOURCE",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("sender", {
      header: "SENDER",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("received", {
      header: "RECEIVED AT",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("extractedAmount", {
      header: "EXTRACTED AMOUNT",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue().toLowerCase();
        if (status === "needs review") {
          return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50 font-normal">Needs Review</Badge>;
        } else if (status === "processed") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-normal">Processed</Badge>;
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
      data={filteredSources}
      manualPagination={false}
      columns={columns as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={false}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) => router.push(`/bill-pay/invoice/${(row as OtherSourceBill).id}`)}
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
