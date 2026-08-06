"use client";

import { Button } from "@/components/ui/button";
import { Activity, ArrowRight } from "lucide-react";

const activities: Array<{
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
}> = [];

export const RecentActivity = () => {
  return (
    <div className="flex h-full flex-col rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
        <div>
          <h3 className="text-[13px] font-semibold text-[#0b100e]">Recent Activity</h3>
          <p className="mt-0.5 text-[11px] text-[#84908a]">Significant system actions</p>
        </div>
        {activities.length > 0 && (
          <button className="flex items-center gap-1 text-[11px] font-semibold text-[#087f70] hover:text-[#0ea894] transition-colors">
            See all <ArrowRight className="size-3" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#f0faf8]">
              <Activity className="size-5 text-[#087f70]" />
            </span>
            <p className="mt-3 text-[13px] font-semibold text-[#303834]">No recent activity</p>
            <p className="mt-1 text-[12px] text-[#84908a]">Approvals and submissions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-[8px] border border-black/[0.06] p-3 transition-colors hover:bg-[#f9faf9]"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#f0faf8]">
                  <activity.icon className="size-4 text-[#087f70]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#0b100e]">{activity.title}</p>
                  <p className="truncate text-[11px] text-[#84908a]">{activity.description}</p>
                </div>
                <span className="shrink-0 text-[10px] text-[#84908a]">{activity.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
