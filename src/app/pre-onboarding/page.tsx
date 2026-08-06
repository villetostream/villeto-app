"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { ArrowRight, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useConfirmationOnboardingApi } from "@/queries/pre-onboarding/confirm-onbarding-status";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { emailSchema } from "@/lib/schemas/schemas";

type EmailForm = z.infer<typeof emailSchema>;

export default function Page() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const confirmAccount = useConfirmationOnboardingApi();
  const loading = confirmAccount.isPending;
  const form = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });

  const onSubmit = async (data: EmailForm) => {
    try {
      onboarding.setContactEmail(data.email);
      const response = await confirmAccount.mutateAsync(data);
      onboarding.setOnboardingId(response.data.onboardingId);
      onboarding.setIsExistingUser(true);
      onboarding.setStoppedAtStep(response.data.step);
      router.push("/pre-onboarding/verify-otp");
    } catch (error: unknown) {
      if ((error as AxiosError).status === 404) {
        onboarding.reset();
        onboarding.setContactEmail(data.email);
        onboarding.setIsExistingUser(false);
        onboarding.setStoppedAtStep(null);
        router.push("/pre-onboarding/registration");
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14">
        <Link href="/" aria-label="Villeto home"><Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover" priority /></Link>
        <div className="flex items-center gap-3"><span className="hidden text-[11px] font-medium text-[#737d78] sm:inline">Account setup</span><span className="rounded-full border border-black/[0.08] bg-[#f5f7f6] px-3 py-1.5 text-[10px] font-semibold text-[#303834]">1 of 2</span></div>
      </header>

      <div className="mx-auto flex w-full max-w-[590px] flex-1 min-h-0 flex-col justify-center px-6 py-10 sm:px-10 lg:py-14 xl:px-14">
        <div className="max-w-[470px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]"><ShieldCheck className="size-3.5" /> Secure account setup</span>
          <h1 className="mt-6 text-[clamp(2.1rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e]">Start with your work email.</h1>
          <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-[#66706b] sm:text-[15px]">We&apos;ll find your existing company or help you create a new Villeto account.</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-9 space-y-5" noValidate>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-[13px] font-semibold !normal-case text-[#202723]">Work email address</FormLabel>
                  <div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} /><FormControl><Input {...field} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" disabled={loading} className="h-[56px] rounded-[10px] border-black/[0.1] bg-white pl-12 pr-4 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15" /></FormControl></div>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={loading} className="h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785]">{loading ? "Checking your workspace..." : "Continue"}{loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
            </form>
          </Form>

          <div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-[#78827d]"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /><p>We&apos;ll use this email to find or create your Villeto workspace.</p></div>
          <div className="mt-9 border-t border-black/[0.07] pt-6 text-center text-[13px] text-[#69736e]">Already have an account? <Link href="/login" className="font-semibold text-[#087f70] hover:text-[#065f55]">Sign in</Link></div>

        </div>
      </div>
      <footer className="px-20 pb-6 text-center text-[9px] leading-4 text-[#9aa29e] sm:px-10 sm:text-left sm:text-[10px] xl:px-14">By continuing, you agree to Villeto&apos;s Terms and Privacy Policy.</footer>
    </div>
  );
}
