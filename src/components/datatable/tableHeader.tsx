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
import { cn } from "@/lib/utils";

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
    <div className="flex flex-wrap items-center gap-2">
      {tableHeader?.actionButton && <div>{tableHeader.actionButton}</div>}

      {tableHeader?.isSearchable && (
        <div className="relative w-full sm:w-[280px]">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder="Search..."
            className="pl-10 h-[41px] w-full bg-white border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-[12px] text-sm"
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
              size="md"
              className="w-[41px] border-gray-200 hover:bg-gray-50 text-gray-600 rounded-[12px] flex items-center justify-center p-0 shrink-0"
            >
              <Settings size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-2 max-h-[18rem] overflow-y-auto rounded-[12px] shadow-lg border-black/[0.055] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-black/[0.1] [&::-webkit-scrollbar-thumb]:rounded-full pr-1 mr-1">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuItem
                  key={column.id}
                  className="uppercase py-2 px-3 cursor-pointer border border-black/[0.055] rounded-[9px] mb-1.5 last:mb-0 hover:border-[#0ea894]/25 hover:bg-[#f8fbfa] focus:bg-[#f8fbfa] text-[10px] font-semibold tracking-wider text-[#17211d] flex items-center gap-2.5 transition-colors shadow-none"
                  onClick={(e) => {
                    e.preventDefault();
                    column.toggleVisibility(!column.getIsVisible());
                  }}
                >
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 transition-colors",
                      column.getIsVisible() 
                        ? "bg-[#087f70] border-[#087f70]" 
                        : "border border-black/[0.1] bg-white"
                    )}
                  >
                    {column.getIsVisible() && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="truncate">
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </span>
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

      <div className={cn("flex flex-col md:flex-row md:items-center justify-between", (tableHeader?.title || !portalTarget) && "mb-4")}>
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
