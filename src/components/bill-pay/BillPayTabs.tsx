"use client";

import type { ReactNode } from "react";
import { StandardBillsTable } from "./StandardBillsTable";
import { RecurringBillsTable } from "./RecurringBillsTable";

interface BillPayTabsProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
  periodFilter?: ReactNode;
  children?: ReactNode;
}

export function BillPayTabs({ activeTab, setActiveTab, periodFilter, children }: BillPayTabsProps) {
  const isRecurring = activeTab === "recurring";

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Top View Switcher (Standard Bills vs Recurring Bills) */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="inline-flex p-1 bg-[#edeef0] rounded-xl border border-black/[0.04]">
          <button
            onClick={() => setActiveTab("standard")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              !isRecurring
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Standard Bills
          </button>
          <button
            onClick={() => setActiveTab("recurring")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
              isRecurring
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Recurring Bills
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div id="tab-actions" className="flex items-center gap-2" />
          {periodFilter}
        </div>
      </div>

      {children}

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {isRecurring ? (
          <RecurringBillsTable />
        ) : (
          <StandardBillsTable />
        )}
      </div>
    </div>
  );
}
