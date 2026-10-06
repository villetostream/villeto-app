"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowLeft } from "lucide-react";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ForgotPasswordForm {
    email: string;
}

const inputClass = "h-[56px] rounded-[10px] border-black/[0.1] bg-white pl-12 pr-4 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15";

export default function ForgotPassword() {
    const form = useForm<ForgotPasswordForm>({
        defaultValues: { email: "" }
    });
    const { isSubmitting } = form.formState;
    const router = useRouter();
    const axios = useAxios();

    const onSubmit = async (data: ForgotPasswordForm) => {
        try {
            await axios.post(API_KEYS.AUTH.PASSWORD_RESET_INITIATE, {
                email: data.email,
            });
            toast.success("OTP code sent to your email");
            router.push(`/forgot-password/reset?email=${encodeURIComponent(data.email)}`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to send reset code. Please try again.");
        }
    };

    return (
        <div className="flex h-full flex-col bg-white overflow-hidden">
            {/* Fixed Header */}
            <header className="shrink-0 flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14">
                <Link href="/" aria-label="Villeto home">
                    <Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover" priority />
                </Link>
                <div className="flex items-center gap-3">
                    <Link href="/login" className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-[#f5f7f6] px-3 py-1.5 text-[10px] font-semibold text-[#303834] hover:bg-[#eaedeb] transition-colors">
                        <ArrowLeft className="size-3" /> Back to login
                    </Link>
                </div>
            </header>

            {/* Fixed Title Area */}
            <div className="shrink-0 mx-auto w-full max-w-[560px] px-6 sm:px-10 pt-2 sm:pt-4">
                <div className="w-full">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]">
                        <Lock className="size-3.5" /> Password recovery
                    </span>
                    <h1 className="mt-6 text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e]">
                        Forgot Password?
                    </h1>
                    <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-[#66706b] sm:text-[15px]">
                        Enter your email address to receive an OTP code to reset your password.
                    </p>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto mt-6">
                <div className="mx-auto w-full max-w-[560px] px-6 sm:px-10 pb-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            {/* Email */}
                            <FormField control={form.control} name="email" rules={{
                                required: "Please enter your email address",
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Please enter a valid email address"
                                }
                            }} render={({ field }) => (
                                <FormItem className="space-y-2.5">
                                    <FormLabel className="text-[13px] font-semibold !normal-case text-[#202723]">Work email address</FormLabel>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                                        <FormControl>
                                            <Input {...field} type="email" placeholder="you@company.com" disabled={isSubmitting} className={inputClass} />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all"
                            >
                                {isSubmitting ? "Sending..." : "Receive OTP Code"}
                                {isSubmitting && <Loader2 className="ml-2 size-4 animate-spin" />}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>

            {/* Fixed Footer */}
            <footer className="shrink-0 bg-white border-t border-black/[0.04] px-20 py-4 text-center text-[9px] leading-4 text-[#9aa29e] sm:px-10 sm:text-left sm:text-[10px] xl:px-14">
                Having trouble? Contact support at support@villeto.com.
            </footer>
        </div>
    );
}