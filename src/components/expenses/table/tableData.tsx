"use client"

import { useDataTable } from "@/components/datatable/useDataTable";

export const useTableData = () => {
    return useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems: 0,
        manualSorting: false,
        manualFiltering: false,
        manualPagination: false,
    });
} 