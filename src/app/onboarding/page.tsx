"use client";



import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Clock3, Landmark, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";





























const setupItems = [
  { icon: Building2, label: "Business profile", detail: "Company and registration details" },
  { icon: UsersRound, label: "Leadership", detail: "Owners and controlling officers" },
  { icon: Landmark, label: "Financial profile", detail: "Spend range and product needs" },
] as const;

export default function Welcome() {
  const router = useRouter();
  return (
    <div className="mx-auto flex min-h-full max-w-[760px] flex-col justify-center py-4">
      <span className="inline-flex w-max items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]"><ShieldCheck className="size-3.5" /> Workspace setup</span>
      <h1 className="mt-6 max-w-[650px] text-[clamp(2.2rem,4vw,3.35rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-[#0b100e]">Let&apos;s set up your Villeto workspace.</h1>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-6 text-[#68726d]">We&apos;ll collect the essential company information needed to configure your account and controls.</p>
      <div className="mt-9 divide-y divide-black/[0.06] border-y border-black/[0.07]">
        {setupItems.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-4 py-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-[#f0f4f2] text-[#35413b]"><Icon className="size-4" /></span><div><p className="text-[12px] font-semibold text-[#111714]">{item.label}</p><p className="mt-0.5 text-[10px] text-[#78827d]">{item.detail}</p></div></div>; })}
      </div>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2 text-[11px] text-[#78827d]"><Clock3 className="size-3.5" /> Usually takes about 5 minutes</span><Button onClick={() => router.push("/onboarding/business")} className="h-[50px] w-full rounded-[10px] bg-[#0ea894] px-8 text-[13px] font-semibold text-white hover:bg-[#0c9785] sm:w-auto">Begin setup <ArrowRight className="size-4" /></Button></div>
    </div>
  );
}
