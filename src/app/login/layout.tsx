import type { Metadata } from "next";
import { BarChart3, TrendingDown, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in to Villeto",
  description: "Sign in to your Villeto workspace.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-dvh overflow-hidden bg-white">
      <section className="flex h-dvh w-full flex-col overflow-y-auto lg:w-[52%] xl:w-[48%]">
        {children}
      </section>
      <aside className="relative hidden h-dvh flex-1 overflow-hidden bg-[#07100d] text-white lg:flex">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 size-[480px] rounded-full bg-[#0ea894]/10 blur-[80px]" />
          <div className="absolute bottom-0 left-0 size-[320px] rounded-full bg-[#0ea894]/6 blur-[60px]" />
        </div>
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="relative z-10 m-auto w-full max-w-[560px] px-10 py-12 xl:px-14">
          {/* Headline */}
          <div className="max-w-[440px]">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6edbca]">
              <span className="size-1.5 rounded-full bg-[#53d3c0]" />
              Real-time spend intelligence
            </span>
            <h2 className="mt-5 text-[clamp(2rem,3vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Your finances, finally in focus.
            </h2>
            <p className="mt-4 max-w-[40ch] text-[13px] leading-6 text-white/55">
              See every transaction, team, and budget in one place — updated the moment it happens.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: "Spend saved", value: "18%", icon: TrendingDown },
              { label: "Teams active", value: "240+", icon: Users },
              { label: "Faster approvals", value: "3×", icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-3.5">
                <Icon className="size-4 text-[#6edbca]" strokeWidth={1.7} />
                <p className="mt-2 text-[18px] font-semibold leading-none">{value}</p>
                <p className="mt-1.5 text-[10px] text-white/45">{label}</p>
              </div>
            ))}
          </div>

          {/* Live activity feed */}
          <div className="mt-6 rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-[#6edbca]" strokeWidth={1.7} />
                <span className="text-[11px] font-semibold text-white/70">Live spend activity</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-[#6edbca]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#53d3c0] opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#53d3c0]" />
                </span>
                Live
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { team: "Engineering", item: "AWS Infrastructure", amount: "$4,200", status: "Approved", time: "2m ago" },
                { team: "Marketing", item: "Figma Enterprise", amount: "$1,800", status: "Pending", time: "11m ago" },
                { team: "Operations", item: "Office Supplies", amount: "$320", status: "Approved", time: "34m ago" },
                { team: "HR", item: "Recruitment Tools", amount: "$990", status: "Under review", time: "1h ago" },
              ].map(({ team, item, amount, status, time }) => (
                <div key={item} className="flex items-center justify-between gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-white/[0.07] text-[9px] font-bold text-white/60">
                      {team.substring(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">{item}</p>
                      <p className="text-[9px] text-white/40">{team} · {time}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] font-semibold">{amount}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${status === "Approved" ? "bg-[#53d3c0]/15 text-[#8ce5d7]" : status === "Pending" ? "bg-amber-400/10 text-amber-300" : "bg-white/[0.07] text-white/45"}`}>
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}