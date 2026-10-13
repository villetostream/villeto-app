"use client";

import { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface SortableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function SortableColumnHeader<TData, TValue>({
  title,
  className,
}: SortableColumnHeaderProps<TData, TValue>) {
  return <span className={cn(className)}>{title}</span>;
}
