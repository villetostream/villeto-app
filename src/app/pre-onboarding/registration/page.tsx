"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, BriefcaseBusiness, Building2, Check, Loader2, MessageSquare, MonitorPlay } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useOnboardingStore } from "@/stores/useVilletoStore";
import { useStartOnboardingApi } from "@/queries/pre-onboarding/get-started";

import { registrationSchema } from "@/lib/schemas/schemas";
import { getApiErrorMessage } from "@/lib/types/api-error";

type FormData = z.infer<typeof registrationSchema>;
const inputClass = "h-[52px] rounded-[10px] border-black/[0.1] bg-white px-4 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15";

export default function GetStarted() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const onboarding = useOnboardingStore();
  const startOnboarding = useStartOnboardingApi();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailConflictError, setEmailConflictError] = useState<string | null>(null);
  const loading = startOnboarding.isPending || isPending;
  const form = useForm<FormData>({ resolver: zodResolver(registrationSchema), defaultValues: { contactFirstName: onboarding.preOnboarding?.contactFirstName ?? "", contactLastName: onboarding.preOnboarding?.contactLastName ?? "", accountType: onboarding.preOnboarding?.accountType ?? undefined, contactEmail: onboarding.contactEmail || emailParam || "" } });

  useEffect(() => {
    if (emailParam && !onboarding.contactEmail) onboarding.setContactEmail(emailParam);
    if (onboarding.preOnboarding || emailParam) form.reset({ contactFirstName: onboarding.preOnboarding?.contactFirstName || "", contactLastName: onboarding.preOnboarding?.contactLastName || "", accountType: onboarding.preOnboarding?.accountType || undefined, contactEmail: onboarding.contactEmail || emailParam || "" });
  }, [emailParam, form, onboarding]);

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitError(null);
      setEmailConflictError(null);
      const response = await startOnboarding.mutateAsync(data);
      onboarding.setPreOnboarding(data);
      onboarding.setOnboardingId(response.data.onboardingId as string);
      onboarding.setIsExistingUser(false);
      onboarding.setStoppedAtStep(null);
      startTransition(() => {
        router.push("/pre-onboarding/verify-otp");
      });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Registration failed. Please try again.");
      if (/email/i.test(message)) {
        setEmailConflictError(message);
      } else {
        setSubmitError(message);
      }
    }
  };
  useWatch({ control: form.control, name: "accountType" });

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14"><Link href="/" aria-label="Villeto home"><Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover" priority /></Link><div className="flex items-center gap-3"><span className="hidden text-[11px] font-medium text-[#737d78] sm:inline">Account setup</span><span className="rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[10px] font-semibold text-[#087f70]">2 of 2</span></div></header>
      <div className="mx-auto w-full max-w-[660px] flex-1 px-6 py-8 sm:px-10 lg:py-10 xl:px-14">
        <div className="max-w-[560px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]"><Building2 className="size-3.5" /> Company profile</span>
          <h1 className="mt-5 text-[clamp(2rem,4vw,2.8rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0b100e]">Tell us about yourself.</h1>
          <p className="mt-3 max-w-[48ch] text-[14px] leading-6 text-[#68726d]">This creates your workspace and helps us tailor the onboarding steps that follow.</p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="contactFirstName" render={({ field }) => <FormItem><FormLabel className="text-[12px] font-semibold !normal-case text-[#202723]">First name</FormLabel><FormControl><Input {...field} autoComplete="given-name" placeholder="First name" className={inputClass} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="contactLastName" render={({ field }) => <FormItem><FormLabel className="text-[12px] font-semibold !normal-case text-[#202723]">Last name</FormLabel><FormControl><Input {...field} autoComplete="family-name" placeholder="Last name" className={inputClass} /></FormControl><FormMessage /></FormItem>} />
              </div>
              <FormField control={form.control} name="accountType" render={({ field }) => (
                <FormItem><FormLabel className="text-[12px] font-semibold !normal-case text-[#202723]">How would you like to use Villeto?</FormLabel><FormControl><div className="grid gap-3 pt-1 sm:grid-cols-2">
                  <button type="button" onClick={() => field.onChange("demo")} className={`flex items-start gap-3 rounded-[11px] border p-4 text-left transition-colors ${field.value === "demo" ? "border-[#0ea894] bg-[#e7f6f2]/60" : "border-black/[0.09] hover:border-[#0ea894]/50"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#eef2f0] text-[#34403a]">{field.value === "demo" ? <Check className="size-4 text-[#087f70]" /> : <MonitorPlay className="size-4" />}</span><span><span className="block text-[12px] font-semibold text-[#111714]">Explore a demo</span><span className="mt-1 block text-[10px] leading-4 text-[#737d78]">See Villeto with sample data.</span></span></button>
                  <button type="button" onClick={() => field.onChange("enterprise")} className={`flex items-start gap-3 rounded-[11px] border p-4 text-left transition-colors ${field.value === "enterprise" ? "border-[#0ea894] bg-[#e7f6f2]/60" : "border-black/[0.09] hover:border-[#0ea894]/50"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#eef2f0] text-[#34403a]">{field.value === "enterprise" ? <Check className="size-4 text-[#087f70]" /> : <BriefcaseBusiness className="size-4" />}</span><span><span className="block text-[12px] font-semibold text-[#111714]">Set up my company</span><span className="mt-1 block text-[10px] leading-4 text-[#737d78]">Apply for a live workspace.</span></span></button>
                </div></FormControl><FormMessage /></FormItem>
              )} />
              {submitError && (
                <p role="alert" className="text-[12px] font-medium text-red-600">
                  {submitError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row"><Button type="button" variant="outline" className="h-[50px] flex-1 rounded-[10px] border-black/[0.1] text-[13px] font-semibold" onClick={() => window.open("mailto:sales@villeto.com")} disabled={loading}><MessageSquare className="size-4" /> Talk to sales</Button><Button type="submit" disabled={loading} className="h-[50px] flex-1 rounded-[10px] bg-[#0ea894] text-[13px] font-semibold text-white hover:bg-[#0c9785]">{loading ? "Creating workspace..." : "Continue"}{loading && <Loader2 className="size-4 animate-spin" />}</Button></div>
            </form>
          </Form>
        </div>
      </div>

      <Dialog open={Boolean(emailConflictError)} onOpenChange={(open) => !open && setEmailConflictError(null)}>
        <DialogContent className="max-w-md rounded-[16px] p-6">
          <DialogHeader className="space-y-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="size-5" />
            </div>
            <DialogTitle className="text-[18px] font-semibold text-[#0b100e]">
              Email already in use
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5 text-[#68726d]">
              {emailConflictError}
              {onboarding.contactEmail ? (
                <span className="mt-1.5 block font-medium text-[#202723]">
                  {onboarding.contactEmail}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/login")}
              className="h-10 rounded-[10px] border-black/[0.1] text-[13px] font-semibold"
            >
              Sign in instead
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/pre-onboarding")}
              className="h-10 rounded-[10px] bg-[#0ea894] text-[13px] font-semibold text-white hover:bg-[#0c9785]"
            >
              Use a different email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
