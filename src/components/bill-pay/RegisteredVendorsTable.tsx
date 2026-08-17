"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

type RegisteredVendor = {
  vendor: string;
  contact: string;
  category: string;
  totalPaid: string;
  status: string;
};

const mockRegisteredVendors: RegisteredVendor[] = [
  { vendor: "Atlas Partners", contact: "contact@atlas.com", category: "Equipment", totalPaid: "₦12,500,000.00", status: "Active" },
  { vendor: "Nexa Solutions", contact: "billing@nexa.com", category: "Software", totalPaid: "₦3,200,000.00", status: "Active" },
  { vendor: "Global Office Supplies", contact: "sales@globaloffice.com", category: "Office Supplies", totalPaid: "₦1,450,000.00", status: "Inactive" },
  { vendor: "TechCorp Inc.", contact: "finance@techcorp.com", category: "Hardware", totalPaid: "₦8,900,000.00", status: "Active" },
  { vendor: "Marketing Masters", contact: "hello@marketingmasters.com", category: "Marketing", totalPaid: "₦5,600,000.00", status: "Active" },
];

const columnHelper = createColumnHelper<RegisteredVendor>();

export function RegisteredVendorsTable() {
  const router = useRouter();
  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const filteredVendors = useMemo(() => {
    let result = mockRegisteredVendors;
    if (tableprops.globalSearch) {
      const searchLower = tableprops.globalSearch.toLowerCase();
      result = result.filter(r => 
        r.vendor.toLowerCase().includes(searchLower) || 
        r.contact.toLowerCase().includes(searchLower) ||
        r.category.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [tableprops.globalSearch]);

  useEffect(() => {
    tableprops.setTotalItems(filteredVendors.length);
  }, [filteredVendors.length, tableprops.setTotalItems]);

  const columns = useMemo(() => [
    columnHelper.accessor("vendor", {
      header: "VENDOR NAME",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("contact", {
      header: "CONTACT EMAIL",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("category", {
      header: "CATEGORY",
      cell: (info) => <p className="text-gray-500">{info.getValue()}</p>,
    }),
    columnHelper.accessor("totalPaid", {
      header: "TOTAL PAID (YTD)",
      cell: (info) => <p className="font-medium text-gray-900">{info.getValue()}</p>,
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue().toLowerCase();
        if (status === "active") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-normal">Active</Badge>;
        } else if (status === "inactive") {
          return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50 font-normal">Inactive</Badge>;
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
      data={filteredVendors}
      manualPagination={false}
      columns={columns as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={false}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) => {
        // Navigate to the newly designed invoice details page using a slugified vendor name
        const slug = (row as RegisteredVendor).vendor.replace(/\s+/g, '-').toLowerCase();
        router.push(`/bill-pay/${slug}`);
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
