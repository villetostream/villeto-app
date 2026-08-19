import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  isLoading?: boolean;
  accentColor?: string;
}

export const StatsCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  isLoading,
  accentColor = "#0ea894",
}: StatsCardProps) => {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-[#0ea894]"
      : trend === "down"
      ? "text-red-500"
      : "text-[#84908a]";

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-black/[0.08] bg-white p-5 shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium text-[#68726d]">{title}</p>
        {icon && (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {icon}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-7 w-24 animate-pulse rounded-[6px] bg-[#f0f2f1]" />
      ) : (
        <p className="text-[22px] font-bold leading-none tracking-tight text-[#0b100e]">
          {value}
        </p>
      )}

      {subtitle && (
        <div className={`flex items-center gap-1.5 text-[11px] ${trendColor}`}>
          <TrendIcon className="size-3 shrink-0" strokeWidth={2.5} />
          {isLoading ? (
            <div className="h-3 w-20 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
          ) : (
            <span>{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
