"use client";

import type { LucideIcon } from "lucide-react";
import { ReceiptText, ShoppingCart } from "lucide-react";

export function PolicyWorkspaceHeader({
  policyType,
  onPolicyTypeChange,
}: {
  policyType: "expense" | "procurement";
  onPolicyTypeChange: (type: "expense" | "procurement") => void;
}) {
  return (
    <section className="flex flex-col gap-5 border-b border-black/[0.07] pb-5 pt-1 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b8f7d]">Governance center</p>
        <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.035em] text-[#10231d] md:text-[28px]">Policies and controls</h1>
        <p className="mt-2 text-[12px] leading-5 text-[#718079]">
          Define how money is spent, who approves it, and which controls apply before an expense or purchase moves forward.
        </p>
      </div>
      <div className="inline-flex w-full rounded-[11px] border border-black/[0.07] bg-[#eaf0ed] p-1 sm:w-auto">
        <PolicyTypeButton
          active={policyType === "expense"}
          icon={ReceiptText}
          label="Expense policies"
          detail="Claims and reimbursements"
          tourId="expenses-policy-type-tab"
          onClick={() => onPolicyTypeChange("expense")}
        />
        <PolicyTypeButton
          active={policyType === "procurement"}
          icon={ShoppingCart}
          label="Procurement policies"
          detail="Requests and purchase orders"
          tourId="procurement-policy-type-tab"
          onClick={() => onPolicyTypeChange("procurement")}
        />
      </div>
    </section>
  );
}

function PolicyTypeButton({
  active,
  icon: Icon,
  label,
  detail,
  tourId,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  detail: string;
  tourId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onClick}
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[8px] px-3 py-2 text-left transition sm:min-w-52 ${active ? "bg-white text-[#10231d] shadow-sm" : "text-[#68756f] hover:text-[#10231d]"}`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] ${active ? "bg-[#e7f7f3] text-[#087f70]" : "bg-black/[0.035] text-[#7d8984]"}`}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-semibold sm:text-[11px]">{label}</span>
        <span className="hidden truncate text-[8px] text-[#929c97] sm:block">{detail}</span>
      </span>
    </button>
  );
}

export interface PolicySummaryItem {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "amber" | "blue" | "slate";
}

export function PolicySummaryStrip({ items, isLoading = false }: { items: PolicySummaryItem[]; isLoading?: boolean }) {
  const tones = {
    teal: "bg-[#e8f8f5] text-[#087f70]",
    amber: "bg-[#fff6df] text-[#9a650b]",
    blue: "bg-[#edf4ff] text-[#3b67b0]",
    slate: "bg-[#eef1f0] text-[#5f6c66]",
  };

  return (
    <section className="grid overflow-hidden rounded-[15px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-3 border-b border-black/[0.06] p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tones[item.tone || "teal"]}`}><Icon className="size-4" /></span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                {isLoading ? <span className="h-5 w-8 animate-pulse rounded bg-[#edf1ef]" /> : <span className="text-[19px] font-semibold tracking-[-0.035em] text-[#15231e]">{item.value}</span>}
                <span className="truncate text-[10px] font-medium text-[#64716b]">{item.label}</span>
              </div>
              <p className="mt-0.5 truncate text-[8px] text-[#98a19d]">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
