"use client"

import { reimbursements } from "@/lib/mock-data";
import { useDataTable } from "@/components/datatable/useDataTable";

export const useTableData = () => {

    return useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems: reimbursements.length,
        manualSorting: false,
        manualFiltering: false,
        manualPagination: false,
    });
} 