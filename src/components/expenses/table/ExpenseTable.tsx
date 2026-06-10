import { logger } from "@/lib/logger";
import React, { useState, useEffect } from "react";
import { useDataTable } from "@/components/datatable/useDataTable";
import { DataTable } from "@/components/datatable";
import { useDateFilterStore } from "@/stores/useDateFilterStore";
import type { ColumnDef } from "@tanstack/react-table";

const ExpenseTable = ({
  actionButton = <></>,
  statusFilter = null,
  data = [],
  onFilteredDataChange,
  columnsOverride,
  page = 1,
}: {
  actionButton?: React.ReactElement;
  statusFilter?: string | null;
  data?: any[];
  onFilteredDataChange?: (filteredData: any[]) => void;
  columnsOverride?: ColumnDef<any, any>[];
  page?: number;
  scope?: string;
}) => {
  const [filteredData, setFilteredData] = useState(data);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(
    {}
  );
  const { fromDate, toDate } = useDateFilterStore();

  const tableprops = useDataTable({
    initialPage: page,
    initialPageSize: 10,
    totalItems: data.length,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });
  const { globalSearch, setTotalItems } = tableprops;

  // Helper function to parse date strings
  const parseDate = (dateString: string): Date | null => {
    try {
      // Try parsing common formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Combine search and filter logic
  useEffect(() => {
    let filtered = [...data];

    // Apply status filter from tab
    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Apply search filter
    if (globalSearch && globalSearch.trim() !== "") {
      const searchTerm = globalSearch.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.description?.toLowerCase().includes(searchTerm) ||
          item.employee?.toLowerCase().includes(searchTerm) ||
          item.category?.toLowerCase().includes(searchTerm) ||
          item.amount?.toString().includes(searchTerm) ||
          item.date?.toLowerCase().includes(searchTerm) ||
          item.status?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter from dropdown
    if (appliedFilters["filters[status]"]) {
      filtered = filtered.filter(
        (item) => item.status === appliedFilters["filters[status]"]
      );
    }

    // Apply category filter
    if (appliedFilters["filters[category]"]) {
      filtered = filtered.filter(
        (item) => item.category === appliedFilters["filters[category]"]
      );
    }

    // Apply date range filter from date picker
    if (fromDate && toDate) {
      filtered = filtered.filter((item) => {
        const itemDate = parseDate(item.date);
        if (!itemDate) return true; // Include items with invalid dates

        // Create date range (inclusive on both ends)
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    }

    setFilteredData(filtered);
    setTotalItems(filtered.length);

    // Notify parent component of filtered data changes
    if (onFilteredDataChange) {
      onFilteredDataChange(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, globalSearch, appliedFilters, statusFilter, fromDate, toDate]);
  return (
    <DataTable
      initialColumnVisibility={{ actions: false }}
      data={filteredData}
      columns={(columnsOverride ?? []) as any}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={true}
      enableColumnVisibility={true}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      tableHeader={{
        actionButton: actionButton,
        isSearchable: true,
        isExportable: false,
        isFilter: true,
        enableColumnVisibility: true,
        search: tableprops.globalSearch,
        searchQuery: tableprops.setGlobalSearch,
        filterProps: {
          title: "Reimbursements",
          filterData: [
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Declined", value: "declined" },
              ],
            },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: [
                {
                  label: "Meals & Entertainment",
                  value: "Meals & Entertainment",
                },
                { label: "Transportation", value: "Transportation" },
                { label: "Office Supplies", value: "Office Supplies" },
                { label: "Travel", value: "Travel" },
                { label: "Software", value: "Software" },
              ],
            },
          ],
          onFilter: (filters: Record<string, unknown>) => {
            setAppliedFilters(filters as Record<string, string>);
          },
        },
        bulkActions: [
          {
            label: "Approve Selected",
            onClick: () => {
              logger.log(
                "Approving selected items:",
                Array.from(tableprops.selectedDataIds)
              );
            },
          },
          {
            label: "Decline Selected",
            onClick: () => {
              logger.log(
                "Declining selected items:",
                Array.from(tableprops.selectedDataIds)
              );
            },
          },
        ],
      }}
    />
  );
};

export default ExpenseTable;
