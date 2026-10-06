import type { Metadata } from "next";
import { ShieldCheck, LockKeyhole, Key, Fingerprint, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Reset Password - Villeto",
  description: "Reset your Villeto workspace password.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
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
              Enterprise-grade security
            </span>
            <h2 className="mt-5 text-[clamp(2rem,3vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              Protecting your workspace.
            </h2>
            <p className="mt-4 max-w-[40ch] text-[13px] leading-6 text-white/55">
              We employ advanced encryption and continuous monitoring to ensure your financial data remains completely secure.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: "Data Encryption", value: "AES-256", icon: LockKeyhole },
              { label: "Uptime SLA", value: "99.99%", icon: Activity },
              { label: "Threat detection", value: "24/7", icon: ShieldCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-3.5">
                <Icon className="size-4 text-[#6edbca]" strokeWidth={1.7} />
                <p className="mt-2 text-[18px] font-semibold leading-none">{value}</p>
                <p className="mt-1.5 text-[10px] text-white/45">{label}</p>
              </div>
            ))}
          </div>

          {/* Security Features */}
          <div className="mt-6 rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="size-4 text-[#6edbca]" strokeWidth={1.7} />
                <span className="text-[11px] font-semibold text-white/70">Security & Compliance</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { title: "Multi-Factor Authentication", desc: "Available for all workspace users", status: "Active" },
                { title: "Role-Based Access Control", desc: "Granular permissions for teams", status: "Active" },
                { title: "End-to-End Encryption", desc: "Data secured at rest and in transit", status: "Active" },
              ].map(({ title, desc, status }) => (
                <div key={title} className="flex items-center justify-between gap-3 rounded-[8px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-white/[0.07] text-[12px] font-bold text-white/60">
                      <Key className="size-3.5 text-[#8ce5d7]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">{title}</p>
                      <p className="text-[9px] text-white/40">{desc}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold bg-[#53d3c0]/15 text-[#8ce5d7]`}>
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
