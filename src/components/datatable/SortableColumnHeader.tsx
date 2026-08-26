"use client";

import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function SortableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: SortableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  const handleClick = () => {
    if (!sorted) {
      column.toggleSorting(false); // asc
    } else if (sorted === "asc") {
      column.toggleSorting(true); // desc
    } else {
      column.clearSorting(); // remove
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold tracking-wider text-[#68726d] hover:text-[#0b100e] transition-colors focus:outline-none cursor-pointer select-none",
        sorted && "text-[#087f70]",
        className
      )}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
