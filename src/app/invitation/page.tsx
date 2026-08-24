"use client";

import { logger } from "@/lib/logger";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import SetPasswordModal from "@/components/invitation/SetPasswordModal";
import Link from "next/link";
import Image from "next/image";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";

const CODE_LENGTH = 6;

export default function InvitationPage() {
    const _router = useRouter();
    const searchParams = useSearchParams();
    const axios = useAxios();

    // Read email, company name, and optional name from URL params
    const email = searchParams.get("email") ?? "";
    const companyName = searchParams.get("company") ?? "your company";
    const nameParam = searchParams.get("name") ?? "";

    // Derive first name: use param if provided, else extract from email prefix
    const firstName = nameParam
        ? nameParam.charAt(0).toUpperCase() + nameParam.slice(1)
        : email
        ? email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1)
        : "there";

    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
    const [isLoading, setIsLoading] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isComplete = code.every((c) => c !== "");

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...code];
        next[index] = value.slice(-1);
        setCode(next);
        if (value && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
        const next = [...code];
        pasted.split("").forEach((char, i) => { next[i] = char; });
        setCode(next);
        const nextEmpty = next.findIndex((v) => !v);
        const focusIndex = nextEmpty === -1 ? CODE_LENGTH - 1 : nextEmpty;
        inputRefs.current[focusIndex]?.focus();
    };

    const handleContinue = async () => {
        if (!isComplete) return;
        setIsLoading(true);
        try {
            await axios.post(
                API_KEYS.USER.VERIFICATION,
                {
                    email,
                    otp: code.join("")
                },
                { _skipErrorToast: true }
            );
            setShowPasswordModal(true);
        } catch (error: unknown) {
            logger.error(error);
            toast.error("Invalid invitation code. Please check and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="flex h-full flex-col bg-white">
                <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14">
                    <Link href="/" aria-label="Villeto home">
                        <Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover" priority />
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="hidden text-[11px] font-medium text-[#737d78] sm:inline">Invitation</span>
                        <span className="rounded-full border border-black/[0.08] bg-[#f5f7f6] px-3 py-1.5 text-[10px] font-semibold text-[#303834] truncate max-w-[200px]">
                            {email || "your email"}
                        </span>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-[560px] flex-1 min-h-0 flex-col justify-center px-6 py-10 sm:px-10 lg:py-14">
                    <div className="w-full">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]">
                            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                            Secure invitation
                        </span>
                        
                        <h1 className="mt-6 text-[clamp(2.1rem,4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e]">
                            Welcome {firstName}!
                        </h1>
                        <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-[#66706b] sm:text-[15px]">
                            You have been invited by <span className="text-[#0ea894] font-semibold">{companyName.toUpperCase()}.</span><br />
                            Enter your 6-digit invitation code to access your account.
                        </p>

                        <div className="mt-9 space-y-6">
                            <div className="flex items-center gap-2.5">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className={`h-[56px] flex-1 min-w-0 text-center text-xl font-semibold border rounded-[10px] outline-none transition-all
                                            ${digit ? "border-[#0ea894]/40 bg-[#e7f6f2]" : "border-black/[0.1] bg-white"}
                                            focus:border-[#0ea894] focus:ring-1 focus:ring-[#0ea894]/20 shadow-[0_4px_16px_rgba(14,28,23,0.04)]`}
                                    />
                                ))}
                            </div>

                            <Button
                                onClick={handleContinue}
                                disabled={!isComplete || isLoading}
                                className="h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] disabled:bg-[#f5f7f6] disabled:text-[#98a09c] disabled:shadow-none disabled:hover:translate-y-0 transition-all"
                            >
                                {isLoading ? (
                                    <>Verifying... <Loader2 className="ml-2 size-4 animate-spin" /></>
                                ) : (
                                    <>Continue <ArrowRight className="ml-2 size-4" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <footer className="px-20 pb-6 text-center text-[9px] leading-4 text-[#9aa29e] sm:px-10 sm:text-left sm:text-[10px] xl:px-14">
                    By continuing, you agree to Villeto&apos;s Terms and Privacy Policy.
                </footer>
            </div>

            <SetPasswordModal
                open={showPasswordModal}
                onOpenChange={setShowPasswordModal}
                email={email}
            />
        </>
    );
}
