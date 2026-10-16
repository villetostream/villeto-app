"use client";

import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { StandardBillsTable } from "./StandardBillsTable";
import { RecurringBillsTable } from "./RecurringBillsTable";

interface BillPayTabsProps {
  activeTab: string;
  setActiveTab: (val: string) => void;
}

export function BillPayTabs({ activeTab, setActiveTab }: BillPayTabsProps) {
  const workspaceEnabled = useEntityWorkspaceStore(
    (state) => !!state.snapshot?.enabled
  );

  const isRecurring = activeTab === "recurring";

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Top View Switcher (Standard Bills vs Recurring Bills) */}
      <div className="flex items-center justify-between gap-4 shrink-0">
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
        <div id="tab-actions" className="flex items-center gap-2" />
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {isRecurring ? (
          workspaceEnabled ? (
            <div className="rounded-xl border bg-white p-6 text-sm text-[#68726d]">
              Recurring bills are a placeholder. Scheduling is not connected to
              the payment workflow.
            </div>
          ) : (
            <RecurringBillsTable />
          )
        ) : (
          <StandardBillsTable />
        )}
      </div>
    </div>
  );
}
