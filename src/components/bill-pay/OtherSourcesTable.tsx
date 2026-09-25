"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { useGetBillPayIntakes, BillPayIntake } from "@/queries/bill-pay";
import { format } from "date-fns";

const columnHelper = createColumnHelper<BillPayIntake>();

export function OtherSourcesTable() {
  const router = useRouter();
  
  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  const { data, isLoading } = useGetBillPayIntakes({
    page: tableprops.page,
    limit: tableprops.pageSize,
  });

  useEffect(() => {
    if (data?.meta?.totalCount !== undefined) {
      tableprops.setTotalItems(data.meta.totalCount);
    }
  }, [data?.meta?.totalCount]);

  const columns = useMemo(() => [
    columnHelper.accessor("invoiceIntakeId", {
      header: "INVOICE ID",
      cell: (info) => {
        // Use human-readable invoiceId if backend provides it, otherwise derive from intake ID
        const row = info.row.original;
        const displayId = row.invoiceId || `INV-${info.getValue().split('-')[0].toUpperCase().slice(0, 5)}`;
        return <p className="text-gray-500 font-medium">{displayId}</p>;
      },
    }),
    columnHelper.accessor("vendorName", {
      header: "VENDOR NAME",
      cell: (info) => (
        <p className="font-bold text-gray-900">
          {info.getValue() || "—"}
        </p>
      ),
    }),
    columnHelper.accessor("source", {
      header: "SOURCE",
      cell: (info) => (
        <p className="text-gray-500 capitalize">
          {info.getValue().replace(/_/g, " ")}
        </p>
      ),
    }),
    columnHelper.accessor("billDescription", {
      header: "BILL / PURCHASE",
      cell: (info) => (
        <p className="text-gray-500">
          {info.getValue() || "—"}
        </p>
      ),
    }),
    columnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => {
        const row = info.row.original;
        const amount = info.getValue();
        if (!amount) return <p className="font-bold text-gray-900">—</p>;
        const formatted = Number(amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        return (
          <p className="font-bold text-gray-900">
            {row.currency === "NGN" ? "₦" : row.currency || "₦"}{formatted}
          </p>
        );
      },
    }),
    columnHelper.accessor("dueDate", {
      header: "DUE DATE",
      cell: (info) => {
        const val = info.getValue();
        if (!val) return <p className="text-gray-500">—</p>;
        try {
          return <p className="text-gray-500">{format(new Date(val), "dd MMM yyyy")}</p>;
        } catch {
          return <p className="text-gray-500">{val}</p>;
        }
      },
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue().toLowerCase();
        if (status === "awaiting approval" || status === "awaiting_approval" || status === "validating" || status === "queued") {
          return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50 font-normal whitespace-nowrap">Awaiting Approval</Badge>;
        } else if (status === "approved") {
          return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-50 font-normal">Approved</Badge>;
        } else if (status === "paid" || status === "processed" || status === "completed") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-normal">Paid</Badge>;
        } else if (status === "ready for payment" || status === "ready_for_payment") {
          return <Badge variant="outline" className="bg-[#f0f4ff] text-[#4b7cf3] border-[#d8e2fd] hover:bg-[#f0f4ff] font-normal whitespace-nowrap">Ready for Payment</Badge>;
        } else if (status === "received") {
          return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50 font-normal capitalize">{status}</Badge>;
        } else if (status === "failed" || status === "rejected") {
          return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50 font-normal capitalize">{status}</Badge>;
        }
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
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

  // Client side filtering for search since API doesn't support search query parameter out of the box based on the spec
  const displayData = useMemo(() => {
    let result = data?.data || [];
    if (tableprops.globalSearch) {
      const s = tableprops.globalSearch.toLowerCase();
      result = result.filter(r => 
        r.invoiceIntakeId.toLowerCase().includes(s) ||
        r.source.toLowerCase().includes(s) ||
        (r.vendorName || "").toLowerCase().includes(s) ||
        (r.billDescription || "").toLowerCase().includes(s) ||
        (r.externalReference || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [data?.data, tableprops.globalSearch]);

  return (
    <DataTable
      data={displayData}
      isLoading={isLoading}
      manualPagination={true}
      columns={columns as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={false}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) => router.push(`/bill-pay/invoice/${(row as BillPayIntake).invoiceIntakeId}`)}
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
