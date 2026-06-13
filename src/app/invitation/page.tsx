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
            {/* Two-column layout matching pre-onboarding style */}
            <div className="fixed inset-0 z-50 flex bg-background h-screen overflow-hidden">
                {/* Left panel — form */}
                <div className="flex-1 flex flex-col w-full h-full bg-white overflow-y-auto relative">
                    {/* Villeto logo — top left */}
                    <Link href="/" className="absolute top-8 left-8">
                        <Image src="/images/logo.png" width={112} height={48} className="h-12 w-28 object-cover" alt="Villeto" />
                    </Link>

                    {/* Email badge — top right */}
                    <div className="absolute top-8 right-8">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="truncate max-w-[220px]">{email || "your email"}</span>
                        </div>
                    </div>

                    {/* Centered form content */}
                    <div className="flex flex-col justify-center flex-1 px-10 md:px-[10%] pt-24 pb-10">
                        <div className="max-w-md w-full">
                            {/* Avatar icon - single user profile */}
                            <div className="w-14 h-14 rounded-full border-2 border-primary/50 flex items-center justify-center mb-6">
                                <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>

                            {/* Greeting */}
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Welcome {firstName}!
                            </h1>
                            <p className="text-sm text-gray-500 mb-1">
                                You have been invited by{" "}
                                <span className="text-primary font-semibold">{companyName.toUpperCase()}.</span>
                            </p>
                            <p className="text-sm text-gray-500 mb-8">
                                Enter your 6-digit invitation code to access your account.
                            </p>

                            {/* Code input boxes */}
                            <div className="flex items-center gap-2.5 mb-8">
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
                                        className={`w-12 h-14 text-center text-xl font-semibold border-2 rounded-lg outline-none transition-all
                                            ${digit ? "border-primary/40 bg-gray-50" : "border-gray-200"}
                                            focus:border-primary focus:ring-2 focus:ring-primary/20`}
                                    />
                                ))}
                            </div>

                            {/* Continue button */}
                            <Button
                                onClick={handleContinue}
                                disabled={!isComplete || isLoading}
                                className="w-full h-13 text-base font-semibold bg-primary hover:bg-primary/90 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-all"
                                style={{ height: "52px" }}
                            >
                                {isLoading ? (
                                    <>Verifying... <Loader2 className="ml-2 h-5 w-5 animate-spin" /></>
                                ) : (
                                    <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right panel — teal sidebar */}
                <div
                    className="hidden lg:flex lg:flex-1 bg-[#E6F8F6] h-full p-8 flex-col bg-no-repeat bg-contain bg-center"
                    style={{ backgroundImage: "url('/layout.png')" }}
                />
            </div>

            {/* Set Password Modal */}
            <SetPasswordModal
                open={showPasswordModal}
                onOpenChange={setShowPasswordModal}
                email={email}
            />
        </>
    );
}
