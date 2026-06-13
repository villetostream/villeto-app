"use client";

import { logger } from "@/lib/logger";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useDataTable } from "@/components/datatable/useDataTable";
import { DataTable } from "@/components/datatable";
import { useDateFilterStore } from "@/stores/useDateFilterStore";
import type { ColumnDef } from "@tanstack/react-table";

import { useRouter } from "next/navigation";

interface ExpenseRow extends Record<string, unknown> {
  status?: string;
  description?: string;
  employee?: string;
  category?: string;
  amount?: number | string;
  reportId?: string;
  id?: string;
  date?: string;
}

const ExpenseTable = ({
  actionButton = <></>,
  statusFilter = null,
  data = [],
  onFilteredDataChange,
  columnsOverride,
  page = 1,
  scope,
}: {
  actionButton?: React.ReactElement;
  statusFilter?: string | null;
  data?: ExpenseRow[];
  onFilteredDataChange?: (filteredData: ExpenseRow[]) => void;
  columnsOverride?: ColumnDef<ExpenseRow>[];
  page?: number;
  scope?: string;
}) => {
  const router = useRouter();
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>(
    {}
  );
  
  const onFilteredDataChangeRef = useRef(onFilteredDataChange);
useEffect(() => { onFilteredDataChangeRef.current = onFilteredDataChange; });
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
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply status filter from tab
    if (statusFilter) {
      if (statusFilter === "pending") {
        filtered = filtered.filter((item) => item.status === "pending" || item.status === "pending_policy_check");
      } else {
        filtered = filtered.filter((item) => item.status === statusFilter);
      }
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
        const itemDate = item.date ? parseDate(item.date) : null;
        if (!itemDate) return true; // Include items with invalid dates

        // Create date range (inclusive on both ends)
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        return itemDate >= startOfDay && itemDate <= endOfDay;
      });
    }

    return filtered;
  }, [data, globalSearch, appliedFilters, statusFilter, fromDate, toDate]);

  useEffect(() => {
  setTotalItems(filteredData.length);
  onFilteredDataChangeRef.current?.(filteredData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filteredData, setTotalItems]);
// onFilteredDataChange intentionally excluded — use ref to always call latest version
// without making it a dependency that can retrigger the effect
  return (
    <DataTable
      initialColumnVisibility={{ actions: false }}
      data={filteredData}
      columns={columnsOverride ?? []}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={true}
      enableColumnVisibility={true}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row: ExpenseRow) => {
        // If scope is undefined, it's Personal Expenses.
        if (!scope) {
          const isDraft = row.status === "draft";
          const path = isDraft 
            ? `/expenses/personal/${row.reportId ?? row.id}/edit`
            : `/expenses/personal/${row.reportId ?? row.id}`;
          router.push(path);
        } else {
          // Company or Team scope
          router.push(`/expenses/company/${row.reportId ?? row.id}?scope=${scope}`);
        }
      }}
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
            const stringFilters: Record<string, string> = {};
            for (const [key, value] of Object.entries(filters)) {
              if (value !== undefined && value !== null) {
                stringFilters[key] = String(value);
              }
            }
            setAppliedFilters(stringFilters);
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
