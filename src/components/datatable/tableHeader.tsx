import React, { JSX } from "react";
import { Table } from "@tanstack/react-table";
import { createPortal } from "react-dom";

import { Filter, FilterData } from "./filter";
import { Download, Search as SearchIcon, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";

export interface ITableHeader {
  title?: string;
  subtitle?: string;
  isSearchable?: boolean;
  isExportable?: boolean;
  isFilter?: boolean;
  actionButton?: JSX.Element;
  downloadExportDataFunc?: () => Promise<Record<string, unknown>[]>;
  searchQuery?: (query: string) => void;
  search?: string;
  filterProps?: {
    title: string;
    filterData: FilterData[];
    onFilter: (data: Record<string, unknown>) => void;
  };
  bulkActions?: { label: string; onClick: () => void }[];
  enableColumnVisibility?: boolean;
}

export function TableHeader({
  tableHeader,
  handleExport,
  selectedCount = 0,
  enableColumnVisibility = false,
  table,
}: {
  tableHeader?: ITableHeader;
  handleExport: () => void;
  selectedCount?: number;
  selectedData?: unknown[];
  enableColumnVisibility?: boolean;
  table?: Table<object>;
}) {
  const portalTarget =
    typeof window !== "undefined"
      ? document.getElementById("tab-actions")
      : null;

  const actionsContent = (
    <div className="flex sm:flex-row flex-col items-center gap-2">
      {tableHeader?.actionButton && <div>{tableHeader.actionButton}</div>}

      {tableHeader?.isSearchable && (
        <div className="relative w-full sm:w-64">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder="Search..."
            className="pl-10 h-10 w-full bg-white border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm"
            value={tableHeader?.search}
            onChange={(e) => tableHeader?.searchQuery?.(e.target.value)}
          />
        </div>
      )}

      {tableHeader?.isFilter && tableHeader.filterProps && (
        <Filter filterProps={tableHeader.filterProps} />
      )}

      {enableColumnVisibility && table && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-lg flex items-center gap-2"
            >
              <Settings size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2">
            <DropdownMenuLabel className="mb-2 px-2 py-1.5 text-sm font-semibold text-gray-900 border-b border-gray-100">
              Toggle Columns
            </DropdownMenuLabel>
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  className="capitalize py-2 cursor-pointer focus:bg-primary/5"
                  onClick={(e) => {
                    e.preventDefault();
                    column.toggleVisibility(!column.getIsVisible());
                  }}
                >
                  <Checkbox
                    checked={column.getIsVisible()}
                    onCheckedChange={() => {}}
                    className="mr-2"
                  />
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {tableHeader?.isExportable && (
        <Button
          onClick={handleExport}
          variant="outline"
          size="sm"
          className="h-10 px-4 flex items-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-lg"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} item{selectedCount > 1 ? "s" : ""} selected
              </span>
              <div className="flex space-x-2">
                {tableHeader?.bulkActions?.map((bulkAction) => (
                  <button
                    key={bulkAction.label}
                    onClick={bulkAction.onClick}
                    className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                  >
                    {bulkAction.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        {tableHeader?.title && (
          <div className="flex flex-col mb-4 md:mb-0">
            <h2 className="text-xl font-bold font-primary text-gray-900">
              {tableHeader?.title}
            </h2>
            {tableHeader?.subtitle && (
              <p className="text-sm text-gray-500 mt-1">{tableHeader.subtitle}</p>
            )}
          </div>
        )}

        {portalTarget ? createPortal(actionsContent, portalTarget) : actionsContent}
      </div>
    </div>
  );
}
