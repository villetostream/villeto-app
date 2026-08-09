import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";

export function ProcurementWorkspaceHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className="relative overflow-hidden rounded-[18px] bg-[#0b1714] px-6 py-6 text-white shadow-[0_18px_50px_-28px_rgba(8,44,38,0.75)] md:px-8 md:py-7">
      <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-[#21c3aa]/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-48 bg-gradient-to-t from-[#0ea894]/10 to-transparent" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] md:text-[32px]">{title}</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-white/55">{description}</p>
        </div>
        {action && (
          <Link href={action.href} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover">
            <Plus className="size-4" /> {action.label}
          </Link>
        )}
      </div>
    </section>
  );
}

export function ProcurementPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-black/[0.07] pb-5 pt-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[#10231d] md:text-[25px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[12px] leading-5 text-[#718079]">{description}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-[9px] bg-primary px-4 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary-hover sm:self-auto"
        >
          <Plus className="size-3.5" /> {action.label}
        </Link>
      )}
    </section>
  );
}

export function ProcurementMetric({
  label,
  value,
  detail,
  icon,
  tone = "teal",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone?: "teal" | "amber" | "blue" | "rose";
}) {
  const tones = {
    teal: "bg-[#e8f8f5] text-[#087f70]",
    amber: "bg-[#fff6df] text-[#a46709]",
    blue: "bg-[#edf4ff] text-[#3b67b0]",
    rose: "bg-[#fff0f1] text-[#b93643]",
  };
  return (
    <div className="rounded-[14px] border border-black/[0.07] bg-white p-4 shadow-[0_8px_24px_-22px_rgba(14,28,23,0.6)]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-medium text-[#7a8580]">{label}</p><p className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#0b100e]">{value}</p></div>
        <span className={`flex size-9 items-center justify-center rounded-[10px] ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 text-[11px] text-[#89918d]">{detail}</p>
    </div>
  );
}

export function ProcurementSection({ title, description, action, children }: { title: string; description?: string; action?: { label: string; href: string }; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[15px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)]">
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
        <div><h2 className="text-[14px] font-semibold text-[#111815]">{title}</h2>{description && <p className="mt-0.5 text-[11px] text-[#84908a]">{description}</p>}</div>
        {action && <Link href={action.href} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087f70] hover:text-[#065f55]">{action.label}<ArrowRight className="size-3.5" /></Link>}
      </div>
      {children}
    </section>
  );
}
