"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown2,
  Calendar,
  Filter,
  Money2,
} from "iconsax-reactjs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ExpenseChartRecharts = dynamic(
  () =>
    import("./ExpenseChartRecharts").then((m) => m.ExpenseChartRecharts),
  {
    ssr: false,
    loading: () => <div className="h-[252px] w-full animate-pulse rounded-md bg-muted/40" />,
  }
);

export const ExpenseChart = () => {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState<"expenseTrigger" | "cashFlow">(
    "expenseTrigger"
  );
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  return (
    <Card className="p-5">
      <div className="flex items-center mb-6 relative">
        <Tabs
          className="flex gap-2"
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "expenseTrigger" | "cashFlow")
          }
        >
          <TabsList>
            <TabsTrigger value="expenseTrigger">Expense Overview</TabsTrigger>
            <TabsTrigger value="cashFlow">Cash Flow</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-spend" />
            <span className="text-sm">Spend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-chart-budget" />
            <span className="text-sm">Budget</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"outline"} size={"sm"}>
                <Filter className="w-4 h-4 mr-2" />
                Filter
                <ArrowDown2 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 h-fit">
              <DropdownMenuItem>
                <Money2 /> Amount
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar /> Date
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Money2 /> Spend
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Money2 /> Budget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex rounded-2xl">
            <Button
              variant={chartType === "line" ? "outline" : "ghostNavy"}
              size="sm"
              onClick={() => setChartType("line")}
              className="rounded-r-none"
            >
              <LineChart className="w-4 h-4" />
              Line
            </Button>
            <Button
              variant={chartType === "bar" ? "outline" : "ghostNavy"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setChartType("bar")}
            >
              <BarChart3 className="w-4 h-4" />
              Bar
            </Button>
          </div>
        </div>
      </div>

      <div className="h-[252px]">
        <ExpenseChartRecharts chartType={chartType} currencySymbol={currencySymbol} />
      </div>
    </Card>
  );
};
