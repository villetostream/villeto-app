"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { useLegalEntities } from "@/queries/legal-entities";
import { useGetBillPayInvoices, BillPayInvoice } from "@/queries/bill-pay";
import { format } from "date-fns";

const columnHelper = createColumnHelper<BillPayInvoice>();

export function RegisteredVendorsTable() {
  const router = useRouter();
  
  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "";

  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  const [filters, setFilters] = useState<Record<string, any>>({});

  const { data: invoicesResponse, isLoading } = useGetBillPayInvoices({
    legalEntityId,
    page: tableprops.page,
    limit: tableprops.pageSize,
    search: tableprops.globalSearch,
    source: "vendor_portal",
    workflowStage: filters["filters[workflowStage]"] as string,
    invoiceDateFrom: filters["dateRanges[invoiceDate][startDate]"] as string,
    invoiceDateTo: filters["dateRanges[invoiceDate][endDate]"] as string,
    dueDateFrom: filters["dateRanges[dueDate][startDate]"] as string,
    dueDateTo: filters["dateRanges[dueDate][endDate]"] as string,
  }, { refetchInterval: 60_000 });

  const invoices = invoicesResponse?.data?.data || [];
  const meta = invoicesResponse?.data?.meta;

  useEffect(() => {
    if (meta?.totalCount !== undefined) {
      tableprops.setTotalItems(meta.totalCount);
    }
  }, [meta?.totalCount, tableprops.setTotalItems]);

  const columns = useMemo(() => [
    columnHelper.accessor("invoiceNumber", {
      header: "INVOICE NUMBER",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("description", {
      header: "DESCRIPTION / VENDOR",
      cell: (info) => <p className="font-bold text-gray-900">{info.getValue() || "N/A"}</p>,
    }),
    columnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => {
        const val = parseFloat(info.getValue());
        const currency = info.row.original.currency || "NGN";
        return <p className="font-bold text-gray-900">{new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(val)}</p>;
      },
    }),
    columnHelper.accessor("invoiceDate", {
      header: "INVOICE DATE",
      cell: (info) => <p className="text-gray-500">{info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "N/A"}</p>,
    }),
    columnHelper.accessor("dueDate", {
      header: "DUE DATE",
      cell: (info) => <p className="text-gray-500">{info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "N/A"}</p>,
    }),
    columnHelper.accessor("workflowStage", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue()?.toLowerCase() || "";
        if (status === "awaiting_approval") {
          return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50 font-normal">Awaiting Approval</Badge>;
        } else if (status === "approved") {
          return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-50 font-normal">Approved</Badge>;
        } else if (status === "paid") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-normal">Paid</Badge>;
        } else if (status === "ready_for_payment") {
          return <Badge variant="outline" className="bg-[#f0f4ff] text-[#4b7cf3] border-[#d8e2fd] hover:bg-[#f0f4ff] font-normal">Ready for Payment</Badge>;
        }
        return <Badge variant="outline" className="capitalize">{status.replace(/_/g, " ")}</Badge>;
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
      data={invoices}
      isLoading={isLoading}
      manualPagination={true}
      columns={columns as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={false}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) => {
        const id = (row as BillPayInvoice).vendorInvoiceId;
        router.push(`/bill-pay/${id}`);
      }}
      tableHeader={{
        actionButton: <></>,
        isSearchable: true,
        isExportable: false,
        isFilter: true,
        enableColumnVisibility: false,
        search: tableprops.globalSearch,
        searchQuery: tableprops.setGlobalSearch,
        filterProps: {
          title: "Invoices",
          filterData: [
            {
              label: "Status",
              name: "workflowStage",
              type: "select",
              options: [
                { label: "Awaiting Approval", value: "awaiting_approval" },
                { label: "Approved", value: "approved" },
                { label: "Ready for Payment", value: "ready_for_payment" },
                { label: "Paid", value: "paid" },
              ]
            },
            {
              label: "Invoice Date",
              name: "invoiceDate",
              type: "dateRange"
            },
            {
              label: "Due Date",
              name: "dueDate",
              type: "dateRange"
            }
          ],
          onFilter: (data) => {
            setFilters(data);
            tableprops.setPage(1);
          },
        },
        bulkActions: [],
      }}
    />
  );
}
