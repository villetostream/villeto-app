"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  type JSX,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { FaSortDown, FaSortUp } from "react-icons/fa";
import {
  useReactTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type TableOptions,
  type PaginationState,
  type SortingState,
  type RowSelectionState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
// import MyLoader from "../loader-components";
import exportCSV from "@/lib/exportCSV";
import { ITableHeader, TableHeader } from "./tableHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableHeader as TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE_OPTIONS = [
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "20", value: "20" },
  { label: "30", value: "30" },
  { label: "40", value: "40" },
  { label: "50", value: "50" },
  { label: "100", value: "100" },
];

export type DataTableProps<Data extends object, Value = unknown> = {
  data: Data[];
  columns: ColumnDef<Data, Value>[];
  paginationProps?: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (e: number) => void;
    setPageSize: (e: number) => void;
  };
  tableProps?: Partial<TableOptions<Data>>;
  isLoading?: boolean;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
  height?: string | number;
  tableHeader?: ITableHeader;
  selectedDataIds?: Set<string>;
  setSelectedDataIds?: (selection: Set<string>) => void;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  getRowId?: (row: Data) => string;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  onRowClick?: (row: Data) => void;
};

function DataTable<Data extends object, Value = unknown>(
  props: DataTableProps<Data, Value> & {
    onSearch?: (query: string) => void;
    onFilter?: (filters: Record<string, any>) => void;
    showCreateBulkButton?: boolean;
    onCreateBulk?: () => void;
  }
): JSX.Element {
  const {
    data,
    columns,
    paginationProps,
    tableProps,
    isLoading,
    manualPagination = false,
    manualSorting = false,
    manualFiltering = false,
    height = "400px",
    initialSorting = [],
    initialColumnFilters = [],
    initialColumnVisibility = {},
    tableHeader,
    selectedDataIds = new Set(),
    setSelectedDataIds,
    enableRowSelection = false,
    enableColumnVisibility = false,
    getRowId = (row: any) => row.id || row._id,
    onSortingChange,
    onColumnFiltersChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
    onRowClick,
  } = props;

  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialColumnFilters);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Navigation context for conditional row click behavior
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isExpensesIndex = pathname === "/expenses";
  const currentTab = searchParams?.get("tab") ?? null;
  const expensesClickMode = isExpensesIndex
    ? currentTab === "personal-expenses"
      ? "personal"
      : "company"
    : null;

  // Derive scope for company expense row-click navigation
  const expensesScope = currentTab === "team-expenses" ? "team" : "company";

  const memoizedColumns = useMemo(() => columns, [columns]);
  const memoizedData = useMemo(() => data, [data]);

  // Create select column for multi-select
  const selectColumn = enableRowSelection
    ? {
        id: "select",
        header: ({ table }: any) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }: any) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }
    : null;

  const allColumns = useMemo(() => {
    return selectColumn ? [selectColumn, ...memoizedColumns] : memoizedColumns;
  }, [selectColumn, memoizedColumns]);

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: paginationProps ? paginationProps.page - 1 : 0,
      pageSize: paginationProps?.pageSize || 10,
    }),
    [paginationProps?.page, paginationProps?.pageSize]
  );

  const table = useReactTable({
    columns: allColumns,
    data: memoizedData,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination,
    manualSorting,
    manualFiltering,
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      const newVisibility =
        typeof updater === "function" ? updater(columnVisibility) : updater;
      setColumnVisibility(newVisibility);
      onColumnVisibilityChange?.(newVisibility);
    },
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onRowSelectionChange?.(newSelection);
    },
    enableRowSelection: enableRowSelection,
    enableColumnFilters: true,
    pageCount: paginationProps
      ? Math.ceil(paginationProps.total / pagination.pageSize)
      : -1,
    ...tableProps,
  });

  const rowModel = table.getRowModel();

  // Get selected data for bulk actions
  const selectedData = useMemo(() => {
    return data.filter((row) => selectedDataIds.has(getRowId(row)));
  }, [data, selectedDataIds, getRowId]);

  // Replace your useEffect hooks with this optimized version:

  // Sync row selection with selectedDataIds (one-way sync from props to state)
  useEffect(() => {
    if (!enableRowSelection || !setSelectedDataIds) return;

    const newSelection: RowSelectionState = {};
    data.forEach((row, index) => {
      if (selectedDataIds.has(getRowId(row))) {
        newSelection[index] = true;
      }
    });

    // Only update if there's an actual change to prevent loops
    if (JSON.stringify(newSelection) !== JSON.stringify(rowSelection)) {
      setRowSelection(newSelection);
    }
  }, [data, selectedDataIds, getRowId]); // Remove rowSelection from dependencies

  // Update selectedDataIds when row selection changes (one-way sync from state to props)
  useEffect(() => {
    if (!enableRowSelection || !setSelectedDataIds) return;

    const newSelectedIds = new Set<string>();
    Object.keys(rowSelection).forEach((index) => {
      if (rowSelection[parseInt(index)]) {
        const row = data[parseInt(index)];
        if (row) {
          newSelectedIds.add(getRowId(row));
        }
      }
    });

    // Only update if there's an actual change to prevent loops
    const currentIds = Array.from(selectedDataIds).sort().join(",");
    const newIds = Array.from(newSelectedIds).sort().join(",");

    if (currentIds !== newIds) {
      setSelectedDataIds(newSelectedIds);
    }
  }, [rowSelection, data, getRowId]); // Remove selectedDataIds and setSelectedDataIds from dependencies

  const handleRowChange = useCallback(
    (e: { value: string[] }) => {
      paginationProps?.setPageSize?.(Number(e.value[0]));
    },
    [paginationProps]
  );

  const handleExport = async () => {
    if (tableHeader?.downloadExportDataFunc) {
      const exportData = await tableHeader.downloadExportDataFunc();
      exportCSV(exportData, "exported-data");
      return;
    }
    exportCSV(data, "exported-data");
  };

  //  pagination helpers here
  const currentPage = paginationProps?.page ?? 1;
  const pageSize = paginationProps?.pageSize ?? 10;
  const total = paginationProps?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const getPageNumbers = (current: number, total: number) => {
    const delta = 2; // how many pages before/after current
    const pages: number[] = [];
    for (
      let i = Math.max(1, current - delta);
      i <= Math.min(total, current + delta);
      i++
    ) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col w-full border-0">
      <TableHeader
        tableHeader={tableHeader}
        handleExport={handleExport}
        selectedCount={selectedDataIds.size}
        selectedData={selectedData}
        enableColumnVisibility={enableColumnVisibility}
        table={table}
      />
      <div className="overflow-x-auto rounded-md border bg-white h-full ">
        <Table className="min-w-full divide-y divide-gray-200">
          <TableHead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-700 tracking-wider select-none"
                    >
                      <div className="flex items-center justify-start gap-1">
                        {header.id !== "select" &&
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </TableHead>
          <TableBody className="bg-white divide-y divide-gray-200">
            {!isLoading ? (
              table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      expensesClickMode || onRowClick ? "cursor-pointer" : undefined
                    }
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      // Ignore clicks on interactive elements
                      if (
                        target.closest(
                          'button, a, input, select, textarea, [role="menu"], [role="checkbox"], [data-prevent-row-click]'
                        )
                      ) {
                        return;
                      }
                      // Generic row click handler
                      if (onRowClick) {
                        onRowClick(row.original);
                        return;
                      }
                      if (!expensesClickMode) return;
                      const original: any = row.original as any;
                      // For personal expenses, use reportId (UUID); for company expenses, use id (numeric)
                      const id = expensesClickMode === "personal" ? original?.reportId : original?.reportId;
                      if (id) {
                      // For personal expenses:
                      // - Draft -> Edit page (/expenses/personal/[id]/edit)
                      // - Pending/Others -> Detail page (/expenses/personal/[id])
                      if (expensesClickMode === "personal") {
                        if (original?.status === "draft") {
                            router.push(`/expenses/personal/${id}/edit`);
                        } else {
                            router.push(`/expenses/personal/${id}`);
                        }
                      } else {
                        // Company expenses -> Detail page (/expenses/company/[id])
                        router.push(`/expenses/company/${id}?scope=${expensesScope}`);
                      }
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-4 py-2.5 whitespace-nowrap text-left text-[#181D27]"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={table.getVisibleFlatColumns().length}
                    className="text-center py-20 text-lg hover:bg-transparent"
                  >
                    Oops, No data available!!!
                  </TableCell>
                </TableRow>
              )
            ) : (
              // Skeleton Loading State
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="hover:bg-transparent">
                  {table.getVisibleFlatColumns().map((column, colIndex) => (
                    <TableCell key={`skeleton-cell-${rowIndex}-${colIndex}`} className="px-4 py-2.5">
                      <Skeleton className="h-4 w-full rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {paginationProps?.total ? (
        <>
          <div className="flex  md:flex-row items-center justify-between bg-gray-50 py-2 px-4 rounded-b-md w-full mt-[-6px]">
            <div className="flex items-center gap-2 w-full sm:w-auto mb-2 md:mb-0">
              <span className="text-sm text-gray-700 whitespace-nowrap">
                {total > 0 ? (
                  <>
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, total)} of {total} entries
                  </>
                ) : (
                  <>Showing 0 of 0 entries</>
                )}
              </span>
              <Select
                value={String(paginationProps.pageSize)}
                onValueChange={(value) => {
                  handleRowChange({ value: [value] });
                  paginationProps.setPage(1);
                }}
              >
                <SelectTrigger className="w-fit min-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full md:w-auto justify-end gap-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        paginationProps.setPage(
                          Math.max(1, paginationProps.page - 1)
                        );
                      }}
                      href="#"
                      isDisabled={currentPage === 1}
                      isActive={currentPage > 1}
                      size={"sm"}
                    />
                  </PaginationItem>
                  {/* First page + Ellipsis */}
                  {pageNumbers[0] > 1 && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          onClick={(e) => {
                            e.preventDefault();
                            paginationProps.setPage(1);
                          }}
                          href="#"
                          isActive={1 === paginationProps.page}
                          size={"sm"}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {pageNumbers[0] > 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}
                  <div className="hidden md:flex ">
                    {/* Visible page numbers */}
                    {pageNumbers.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          className={`${
                            paginationProps.page !== page
                              ? "text-muted-foreground"
                              : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            paginationProps.setPage(page);
                          }}
                          href="#"
                          isActive={page === paginationProps.page}
                          size={"sm"}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    {/* Ellipsis + Last page */}
                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>
                        {pageNumbers[pageNumbers.length - 1] <
                          totalPages - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            size="sm"
                            isActive={totalPages === currentPage}
                            onClick={(e) => {
                              e.preventDefault();
                              paginationProps?.setPage(totalPages);
                            }}
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    )}
                  </div>
                  <div className="md:hidden block">
                    {/* Current Page - always visible */}
                    <PaginationItem>
                      <PaginationLink isActive size="sm" href={""}>
                        {paginationProps.page}
                      </PaginationLink>
                    </PaginationItem>
                  </div>
                  {/* Next */}
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        paginationProps.setPage(paginationProps.page + 1);
                      }}
                      href="#"
                      size={"sm"}
                      isActive={paginationProps.page < totalPages}
                      isDisabled={paginationProps.page === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export { DataTable };
