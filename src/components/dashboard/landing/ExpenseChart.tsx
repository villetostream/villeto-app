"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { LineChart, BarChart3, ChevronDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, Money2 } from "iconsax-reactjs";

const ExpenseChartRecharts = dynamic(
  () => import("./ExpenseChartRecharts").then((m) => m.ExpenseChartRecharts),
  {
    ssr: false,
    loading: () => <div className="h-[252px] w-full animate-pulse rounded-[10px] bg-[#f0f2f1]" />,
  }
);

export const ExpenseChart = () => {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState<"expenseTrigger" | "cashFlow">("expenseTrigger");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  return (
    <div className="rounded-[12px] border border-black/[0.08] bg-white p-5 shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
      {/* Header row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Tabs */}
        <div className="flex rounded-[8px] border border-black/[0.08] bg-[#f5f7f6] p-0.5">
          {(["expenseTrigger", "cashFlow"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-[6px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-white text-[#0b100e] shadow-[0_1px_4px_rgba(14,28,23,0.08)]"
                  : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              {tab === "expenseTrigger" ? "Expense Overview" : "Cash Flow"}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#0ea894]" />
            <span className="text-[12px] text-[#68726d]">Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#e7ece9]" />
            <span className="text-[12px] text-[#68726d]">Budget</span>
          </div>
        </div>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[12px] font-medium text-[#68726d] shadow-[0_1px_4px_rgba(14,28,23,0.04)] transition-colors hover:text-[#0b100e]">
                <Filter className="size-3.5" /> Filter <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="text-[12px]"><Money2 className="size-3.5" /> Amount</DropdownMenuItem>
              <DropdownMenuItem className="text-[12px]"><Calendar className="size-3.5" /> Date</DropdownMenuItem>
              <DropdownMenuItem className="text-[12px]"><Money2 className="size-3.5" /> Spend</DropdownMenuItem>
              <DropdownMenuItem className="text-[12px]"><Money2 className="size-3.5" /> Budget</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chart type toggle */}
          <div className="flex rounded-[8px] border border-black/[0.08] bg-[#f5f7f6] p-0.5">
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                chartType === "bar" ? "bg-white text-[#0b100e] shadow-[0_1px_4px_rgba(14,28,23,0.08)]" : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              <BarChart3 className="size-3.5" /> Bar
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                chartType === "line" ? "bg-white text-[#0b100e] shadow-[0_1px_4px_rgba(14,28,23,0.08)]" : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              <LineChart className="size-3.5" /> Line
            </button>
          </div>
        </div>
      </div>

      <div className="h-[252px]">
        <ExpenseChartRecharts chartType={chartType} currencySymbol={currencySymbol} />
      </div>
    </div>
  );
};
