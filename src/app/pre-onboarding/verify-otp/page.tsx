"use client"

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { useVerifyOtpApi } from "@/queries/pre-onboarding/verify-otp";
import { useConfirmationOnboardingApi } from "@/queries/pre-onboarding/confirm-onbarding-status";
import { toast } from "sonner";
import { OnboardingSidebar } from "@/components/onboarding/_shared/OnboardingSidebar";

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 5 * 60;

export default function VerifyOtp() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailParam = searchParams.get("email");

    const onboarding = useOnboardingStore();
    const verifyOtp = useVerifyOtpApi();
    const loading = verifyOtp.isPending;

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isExistingUser = onboarding.isExistingUser;
    const email = onboarding.contactEmail || emailParam || "";

    useEffect(() => {
        if (emailParam && !onboarding.contactEmail) {
            onboarding.setContactEmail(emailParam);
        }
    }, [emailParam, onboarding.contactEmail, onboarding]);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "Enter") handleProceed();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        const newOtp = [...otp];
        pasted.split("").forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        const nextEmpty = newOtp.findIndex((v) => !v);
        inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
    };

    const handleProceed = async () => {
        const otpString = otp.join("");
        if (otpString.length !== OTP_LENGTH) {
            toast.error("Please enter the complete OTP");
            return;
        }
        try {
            const response = await verifyOtp.mutateAsync({ email, otp: otpString });
            const onboardingData = response.data;

            if (isExistingUser && onboardingData) {
                const step = onboardingData.step;
                const company = onboardingData.company;

                onboarding.setOnboardingId(onboardingData.onboardingId);
                onboarding.setPreOnboarding({
                    contactEmail: company.contactEmail,
                    contactFirstName: company.contactFirstName,
                    contactLastName: company.contactLastName,
                    accountType: company.accountType,
                });
                onboarding.updateBusinessSnapshot({
                    contactNumber: company.contactPhone ?? "",
                    countryOfRegistration: company?.countryOfRegistration ?? "",
                    website: company?.websiteUrl ?? "",
                });

                if ((onboardingData as any).onboardingStatus === "COMPLETED") {
                    onboarding.reset();
                    toast.success("Your onboarding is already complete! Please log in to your account.");
                    router.push("/login");
                    return;
                }

                if (step === 1) {
                    router.push(company.websiteUrl ? "/onboarding/leadership" : "/onboarding/business");
                } else if (step === 2) {
                    router.push("/onboarding/financial");
                } else if (step === 3) {
                    router.push("/onboarding/products");
                } else if (step === 4) {
                    router.push("/onboarding/review");
                }
            } else {
                if (onboardingData?.onboardingId) {
                    onboarding.setOnboardingId(onboardingData.onboardingId);
                }
                router.push("/onboarding");
            }
        } catch (_e: unknown) {
            toast.error("Invalid or expired OTP. Please try again");
        }
    };

    const confirmAccount = useConfirmationOnboardingApi();
    const loadingResend = confirmAccount.isPending;

    const handleResend = async () => {
        if (resendTimer > 0) return;
        try {
            const data = await confirmAccount.mutateAsync({ email });
            if (data) {
                onboarding.setStoppedAtStep(data.data.step);
                onboarding.setOnboardingId(data.data.onboardingId);
                if (data.data.status) onboarding.setIsExistingUser(true);
                setResendTimer(RESEND_TIMER_SECONDS);
                toast.success("OTP resent to your email");
            }
        } catch {
            toast.error("Failed to resend OTP. Please try again.");
        }
    };

    const isComplete = otp.join("").length === OTP_LENGTH;

    return (
        <div className="fixed inset-0 z-50 flex bg-[#0b100e]">
            <OnboardingSidebar />

            {/* Right panel */}
            <div className="flex flex-1 flex-col overflow-y-auto bg-white lg:rounded-l-none">
                {/* Mobile: top spacing, Desktop: vertically centred */}
                <div className="flex flex-1 flex-col items-start justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-20">
                    <div className="w-full max-w-[440px]">

                        {/* Email chip */}
                        {email && (
                            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#f6f8f7] px-3.5 py-2 text-[12px] font-medium text-[#3d4740]">
                                <Mail className="size-3.5 text-[#737d78]" />
                                {email}
                            </div>
                        )}

                        {/* Heading */}
                        <h1 className="text-[clamp(1.75rem,3.5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0b100e]">
                            {isExistingUser
                                ? "Continue where\nyou left off."
                                : "Check your\nemail."}
                        </h1>
                        <p className="mt-3 text-[13px] leading-6 text-[#68726d]">
                            We sent a 6-digit code to{" "}
                            <span className="font-semibold text-[#0b100e]">{email || "your email"}</span>.
                            Enter it below to continue.
                        </p>

                        {/* OTP inputs */}
                        <div className="mt-9">
                            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9aa49e]">
                                Verification code
                            </label>
                            <div className="flex items-center gap-2">
                                {otp.map((digit, index) => (
                                    <React.Fragment key={index}>
                                        {index === 3 && (
                                            <span className="shrink-0 text-[18px] font-light text-[#c2c9c5] select-none">–</span>
                                        )}
                                        <input
                                            ref={(el) => { inputRefs.current[index] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            autoFocus={index === 0}
                                            onChange={(e) => handleChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onPaste={index === 0 ? handlePaste : undefined}
                                            className={[
                                                "h-[58px] w-full rounded-[10px] border text-center text-[22px] font-semibold outline-none transition-all duration-150",
                                                "shadow-[0_2px_8px_rgba(14,28,23,0.05)]",
                                                digit
                                                    ? "border-[#0ea894] bg-[#e7f6f2]/50 text-[#0b100e]"
                                                    : "border-black/[0.1] bg-white text-[#0b100e]",
                                                "focus:border-[#0ea894] focus:ring-4 focus:ring-[#0ea894]/10",
                                            ].join(" ")}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            type="button"
                            onClick={handleProceed}
                            disabled={loading || !isComplete}
                            className={[
                                "mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold text-white transition-all duration-150",
                                isComplete && !loading
                                    ? "bg-[#0ea894] hover:bg-[#0c9785] active:scale-[0.99] shadow-[0_8px_20px_rgba(14,168,148,0.25)]"
                                    : "cursor-not-allowed bg-[#0ea894]/35",
                            ].join(" ")}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Verifying…
                                </>
                            ) : (
                                "Verify & continue"
                            )}
                        </button>

                        {/* Resend */}
                        <p className="mt-5 text-center text-[12px] text-[#9aa49e]">
                            Didn&apos;t receive it?{" "}
                            {resendTimer > 0 ? (
                                <span className="font-medium text-[#68726d]">
                                    Resend in <span className="font-semibold text-[#0b100e]">{formatTime(resendTimer)}</span>
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={loadingResend}
                                    className="font-semibold text-[#0ea894] hover:underline disabled:opacity-50"
                                >
                                    {loadingResend ? "Sending…" : "Resend code"}
                                </button>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
