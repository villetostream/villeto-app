"use client"

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { useVerifyOtpApi } from "@/queries/pre-onboarding/verify-otp";
import { useConfirmationOnboardingApi } from "@/queries/pre-onboarding/confirm-onbarding-status";
import { toast } from "sonner";
import { OnboardingSidebar } from "@/components/onboarding/_shared/OnboardingSidebar";

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 5 * 60; // 5 minutes

export default function VerifyOtp() {
    const router = useRouter();
    const onboarding = useOnboardingStore();
    const verifyOtp = useVerifyOtpApi();
    const loading = verifyOtp.isPending;

    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isExistingUser = onboarding.isExistingUser;
    const _stoppedAtStep = onboarding.stoppedAtStep;
    const email = onboarding.contactEmail;

    // Resend countdown timer
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
        if (!/^\d*$/.test(value)) return; // Only digits
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Take only last char
        setOtp(newOtp);
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "Enter") {
            handleProceed();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        const newOtp = [...otp];
        pasted.split("").forEach((char, i) => {
            newOtp[i] = char;
        });
        setOtp(newOtp);
        const nextEmpty = newOtp.findIndex((v) => !v);
        const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
        inputRefs.current[focusIndex]?.focus();
    };

    const handleProceed = async () => {
        const otpString = otp.join("");
        if (otpString.length !== OTP_LENGTH) {
            toast.error("Please enter the complete OTP");
            return;
        }

        try {
            const response = await verifyOtp.mutateAsync({
                email,
                otp: otpString,
            });

            const onboardingData = response.data;

            if (isExistingUser && onboardingData) {
                // Existing user — navigate to where they stopped
                const step = onboardingData.step;
                const company = onboardingData.company;

                // Store the data
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

                // Navigate based on step
                if (step === 1) {
                    if (company.websiteUrl) {
                        router.push("/onboarding/leadership");
                    } else {
                        router.push("/onboarding/business");
                    }
                } else if (step === 2) {
                    router.push("/onboarding/financial");
                } else if (step === 3) {
                    router.push("/onboarding/products");
                } else if (step === 4) {
                    onboarding.reset();
                    toast.success("Your onboarding is already complete! Please log in to your account.");
                    router.push("/login");
                }
            } else {
                // New user — store the onboardingId and go to welcome page
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
    const _loadingResend = confirmAccount.isPending;

    const handleResend = async () => {
        if (resendTimer > 0) return;
        
        try {
            const data = await confirmAccount.mutateAsync({ email });
            
            if (data) {
                // Ensure store is updated with fresh data
                const step = data.data.step;
                onboarding.setStoppedAtStep(step);
                onboarding.setOnboardingId(data.data.onboardingId);
                if (data.data.status) {
                     onboarding.setIsExistingUser(true);
                }

                setResendTimer(RESEND_TIMER_SECONDS);
                toast.success("OTP resent to your email");
            }
        } catch (_error) {
             toast.error("Failed to resend OTP. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex p-5 gap-5 bg-background h-screen overflow-hidden">
            <OnboardingSidebar />
            <div className="flex-1 p-8 px-[5.43777%] w-full h-full bg-white overflow-y-auto relative rounded-lg">
                {/* Email badge in top-right */}
                <div className="flex justify-end mb-12">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700">
                        <svg
                            className="h-5 w-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                        </svg>
                        {email}
                    </div>
                </div>

                <div className="flex flex-col items-start justify-center max-w-lg">
                    {/* Icon */}
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <svg
                                className="h-8 w-8 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Title & subtitle */}
                    <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 leading-tight">
                        {isExistingUser
                            ? "Continue from where you left off"
                            : "Enter Your Verification Code"}
                    </h1>
                    <p className="text-base text-muted-foreground mb-6">
                        Enter the OTP code we sent to your corporate email address
                    </p>

                    {/* Stopped at step badge (existing users only) */}
                    {/* {isExistingUser && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg mb-6 w-full">
                            <Info className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                                You stopped at {ONBOARDING_STEPS.find((s: { id: number; title: string }) => s.id === (stoppedAtStep || 1))?.title}
                            </span>
                        </div>
                    )} */}

                    {/* OTP Input boxes */}
                    <div className="flex items-center gap-2 mb-6">
                        {otp.map((digit, index) => (
                            <React.Fragment key={index}>
                                {index === 3 && (
                                    <span className="text-2xl text-gray-400 mx-1">-</span>
                                )}
                                <input
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    className="w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none transition-all"
                                />
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Proceed Button */}
                    <Button
                        onClick={handleProceed}
                        variant={"hero"}
                        disabled={loading || otp.join("").length !== OTP_LENGTH}
                        className="text-lg font-medium min-w-[250px] w-full max-w-md mb-4"
                    >
                        {loading ? "Verifying..." : "Proceed"}
                        {loading ? (
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        ) : (
                            <ArrowRight className="ml-2 h-5 w-5" />
                        )}
                    </Button>

                    {/* Resend timer */}
                    <div className="text-sm text-center w-full max-w-md">
                        {resendTimer > 0 ? (
                            <span className="text-primary">
                                I didn&apos;t receive a code. Resend in {formatTime(resendTimer)}
                            </span>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="text-primary hover:underline cursor-pointer"
                            >
                                I didn&apos;t receive a code. Resend now
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
