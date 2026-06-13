"use client";
"use no memo";

import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "Sep 25", spend: 3200, budget: 2800 },
  { date: "Sep 26", spend: 3600, budget: 3400 },
  { date: "Sep 27", spend: 2100, budget: 3900 },
  { date: "Sep 28", spend: 4100, budget: 4400 },
  { date: "Sep 29", spend: 2800, budget: 4200 },
  { date: "Sep 30", spend: 5200, budget: 4800 },
  { date: "Oct 1", spend: 3400, budget: 3200 },
  { date: "Oct 2", spend: 4200, budget: 5800 },
  { date: "Oct 3", spend: 3900, budget: 4600 },
  { date: "Oct 4", spend: 6800, budget: 6400 },
  { date: "Oct 5", spend: 5100, budget: 7200 },
  { date: "Oct 6", spend: 4600, budget: 5400 },
  { date: "Oct 7", spend: 3800, budget: 4100 },
  { date: "Oct 8", spend: 5600, budget: 5200 },
  { date: "Oct 9", spend: 4200, budget: 3900 },
  { date: "Oct 10", spend: 3200, budget: 2800 },
  { date: "Oct 12", spend: 5800, budget: 6200 },
  { date: "Oct 13", spend: 4400, budget: 4800 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currencySymbol: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  currencySymbol,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <p className="text-sm font-semibold">
          {currencySymbol}
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface ExpenseChartRechartsProps {
  chartType: "bar" | "line";
  currencySymbol: string;
}

export function ExpenseChartRecharts({
  chartType,
  currencySymbol,
}: ExpenseChartRechartsProps) {
  return (
    <ResponsiveContainer width="100%" height={252}>
      {chartType === "bar" ? (
        <BarChart data={data} barGap={2}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
          />
          <Tooltip
            content={<CustomTooltip currencySymbol={currencySymbol} />}
            cursor={{ fill: "var(--muted)" }}
          />
          <Bar
            dataKey="spend"
            fill="var(--chart-spend)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="budget"
            fill="var(--chart-budget)"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      ) : (
        <RechartsLineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
          />
          <Tooltip
            content={<CustomTooltip currencySymbol={currencySymbol} />}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="var(--chart-spend)"
            strokeWidth={2}
            dot={{ fill: "var(--chart-spend)", r: 0 }}
          />
          <Line
            type="monotone"
            dataKey="budget"
            stroke="var(--chart-budget)"
            strokeWidth={2}
            dot={{ fill: "var(--chart-budget)", r: 0 }}
          />
        </RechartsLineChart>
      )}
    </ResponsiveContainer>
  );
}
