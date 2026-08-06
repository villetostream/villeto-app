"use client";

import { useState } from "react";
import { AlertTriangle, MoreHorizontal, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PolicyAlert = {
  id: string;
  name: string;
  department: string;
  alert: "High" | "Medium" | "Low";
  date: string;
};

const data: PolicyAlert[] = [];

const alertBadge = (alert: PolicyAlert["alert"]) => {
  const map = {
    High: "bg-red-50 text-red-600 border-red-200",
    Medium: "bg-amber-50 text-amber-600 border-amber-200",
    Low: "bg-[#f0faf8] text-[#087f70] border-[#c3ece7]",
  };
  return map[alert];
};

export const PolicyAlertsTable = () => {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string, checked: boolean) => {
    setRowSelection((prev) => {
      const next = { ...prev };
      if (checked) next[id] = true;
      else delete next[id];
      return next;
    });
  };

  return (
    <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
        <div>
          <h3 className="text-[13px] font-semibold text-[#0b100e]">Policy Alerts</h3>
          <p className="mt-0.5 text-[11px] text-[#84908a]">Your latest flagged policy violations</p>
        </div>
        <button
          aria-label="Refresh policy alerts"
          className="flex size-8 items-center justify-center rounded-[8px] border border-black/[0.08] text-[#84908a] transition-colors hover:bg-[#f5f7f6] hover:text-[#0b100e]"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {/* Body */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#f0faf8]">
            <ShieldAlert className="size-5 text-[#087f70]" />
          </span>
          <p className="mt-3 text-[13px] font-semibold text-[#303834]">No policy alerts</p>
          <p className="mt-1 text-[12px] text-[#84908a]">Expense policy violations will appear here as they're flagged.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-black/[0.06] bg-[#f9faf9]">
              <TableHead className="w-10" />
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#84908a]">ID</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#84908a]">Employee</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#84908a]">Department</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#84908a]">Alert</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#84908a]">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className="border-black/[0.04]" data-state={rowSelection[row.id] ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={!!rowSelection[row.id]}
                    onCheckedChange={(value) => toggleRow(row.id, !!value)}
                    aria-label={`Select alert for ${row.name}`}
                  />
                </TableCell>
                <TableCell className="text-[12px] text-[#68726d]">{row.id}</TableCell>
                <TableCell className="text-[12px] font-medium text-[#0b100e]">{row.name}</TableCell>
                <TableCell className="text-[12px] text-[#68726d]">{row.department}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${alertBadge(row.alert)}`}>
                    <AlertTriangle className="size-3" />
                    {row.alert}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-[#68726d]">{row.date}</TableCell>
                <TableCell>
                  <button className="flex size-7 items-center justify-center rounded-[6px] text-[#84908a] transition-colors hover:bg-[#f5f7f6] hover:text-[#0b100e]" aria-label={`Actions for ${row.name}`}>
                    <MoreHorizontal className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};