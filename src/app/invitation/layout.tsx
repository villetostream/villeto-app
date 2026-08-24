import type { Metadata } from "next";
import { Building2, Check, CreditCard, FileText, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Join Villeto",
  description: "Join your team on Villeto.",
};

export default function InvitationLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-dvh overflow-hidden bg-white">
      <section className="flex h-dvh w-full flex-col overflow-y-auto lg:w-[52%] xl:w-[48%]">
        {children}
      </section>
      <aside className="relative hidden h-dvh flex-1 overflow-hidden bg-[#0b100e] text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="relative z-10 m-auto w-full max-w-[600px] px-10 py-12 xl:px-14">
          <div className="max-w-[470px]">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6edbca]">
              <span className="size-1.5 rounded-full bg-[#53d3c0]" />
              The Villeto workspace
            </span>
            <h2 className="mt-5 text-[clamp(2rem,3vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Join your team's financial hub.
            </h2>
            <p className="mt-4 max-w-[43ch] text-[14px] leading-6 text-white/60">
              Collaborate on budgets, track spend, and manage approvals—all in one place.
            </p>
          </div>
          <div className="relative mt-10 max-w-[520px]">
            <div className="absolute bottom-10 left-[25px] top-10 w-px bg-white/12" />
            <div className="relative flex gap-4">
              <span className="z-10 flex size-[50px] shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-[#131a17] text-[#6edbca]">
                <FileText className="size-5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1 rounded-[12px] border border-white/10 bg-[#111714] p-4 shadow-[0_20px_45px_-28px_rgba(0,0,0,0.9)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-white/[0.06] text-white/70">
                      <Building2 className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold">Team Spending</p>
                      <p className="mt-0.5 text-[10px] text-white/45">Real-time visibility</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative mt-3 flex gap-4">
              <span className="z-10 flex size-[50px] shrink-0 items-center justify-center rounded-[10px] border border-[#53d3c0]/25 bg-[#12312b] text-[#6edbca]">
                <ShieldCheck className="size-5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1 rounded-[12px] border border-[#53d3c0]/20 bg-[#10231f] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#8ce5d7]">Secure & compliant</p>
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#53d3c0] text-[#0b100e]"><Check className="size-3" strokeWidth={2.5} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
