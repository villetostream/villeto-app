"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail, Key, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getPasswordStrength(password: string): number {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    return score;
}

const inputClass = "h-[56px] rounded-[10px] border-black/[0.1] bg-white pl-12 pr-4 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15";

export default function CompleteResetPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const axios = useAxios();

    const emailFromQuery = searchParams.get("email") ?? "";

    const [token, setToken] = useState("");
    const [email, setEmail] = useState(emailFromQuery);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasMinLength = newPassword.length >= 8;
    const hasNumber = /[0-9]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
    const strength = getPasswordStrength(newPassword);

    const isValid =
        token.trim().length > 0 &&
        email.trim().length > 0 &&
        hasMinLength &&
        hasNumber &&
        hasUpper &&
        hasLower &&
        passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setIsSubmitting(true);
        try {
            await axios.patch(API_KEYS.AUTH.PASSWORD_RESET_COMPLETE, {
                token: token.trim(),
                email: email.trim(),
                newPassword,
                confirmPassword,
            });
            toast.success("Password reset successful. Please sign in.");
            router.push("/login");
        } catch (error: any) {
            const message = error?.response?.data?.message;
            toast.error(message ?? "Failed to reset password. Please try again.");
        } finally {
            setIsSubmitting(false);
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
                        <ShieldCheck className="size-3.5" /> Secure reset
                    </span>
                    <h1 className="mt-6 text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e]">
                        Create New Password
                    </h1>
                    <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-[#66706b] sm:text-[15px]">
                        Enter the verification code sent to your email and your new password.
                    </p>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto mt-6">
                <div className="mx-auto w-full max-w-[560px] px-6 sm:px-10 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        
                        {/* Email */}
                        <div className="space-y-2.5">
                            <Label className="text-[13px] font-semibold !normal-case text-[#202723]">Email address</Label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    disabled={isSubmitting}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Token */}
                        <div className="space-y-2.5">
                            <Label className="text-[13px] font-semibold !normal-case text-[#202723]">Verification code</Label>
                            <div className="relative">
                                <Key className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                                <Input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    disabled={isSubmitting}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-[13px] font-semibold !normal-case text-[#202723]">New Password</Label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3].map((seg) => (
                                        <div
                                            key={seg}
                                            className={`h-1.5 w-6 rounded-full transition-colors ${
                                                strength >= seg + 1
                                                    ? strength === 4
                                                        ? "bg-green-500"
                                                        : strength === 3
                                                        ? "bg-yellow-400"
                                                        : "bg-orange-400"
                                                    : "bg-[#e5e9e7]"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                                <Input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isSubmitting}
                                    className={`${inputClass} pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <Eye className="size-[18px]" strokeWidth={1.7} /> : <EyeOff className="size-[18px]" strokeWidth={1.7} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2.5">
                            <Label className="text-[13px] font-semibold !normal-case text-[#202723]">Confirm Password</Label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                                <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    disabled={isSubmitting}
                                    className={`${inputClass} pr-12 ${confirmPassword && !passwordsMatch ? "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-400/15" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <Eye className="size-[18px]" strokeWidth={1.7} /> : <EyeOff className="size-[18px]" strokeWidth={1.7} />}
                                </button>
                            </div>
                            {confirmPassword && !passwordsMatch && (
                                <p className="text-[12px] font-medium text-red-500">Passwords do not match</p>
                            )}
                        </div>

                        {/* Password rules */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${hasMinLength ? "border-[#0ea894]/30 text-[#0ea894] bg-[#0ea894]/5" : "border-black/[0.08] text-[#84908a] bg-[#f9faf9]"}`}>8+ characters</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${hasNumber ? "border-[#0ea894]/30 text-[#0ea894] bg-[#0ea894]/5" : "border-black/[0.08] text-[#84908a] bg-[#f9faf9]"}`}>Number</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${hasUpper ? "border-[#0ea894]/30 text-[#0ea894] bg-[#0ea894]/5" : "border-black/[0.08] text-[#84908a] bg-[#f9faf9]"}`}>Uppercase</span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${hasLower ? "border-[#0ea894]/30 text-[#0ea894] bg-[#0ea894]/5" : "border-black/[0.08] text-[#84908a] bg-[#f9faf9]"}`}>Lowercase</span>
                        </div>

                        <Button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="mt-4 h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                            {isSubmitting ? <Loader2 className="ml-2 size-4 animate-spin" /> : <ArrowRight className="ml-2 size-4" />}
                        </Button>
                    </form>
                </div>
            </div>
            
            {/* Fixed Footer */}
            <footer className="shrink-0 bg-white border-t border-black/[0.04] px-20 py-4 text-center text-[9px] leading-4 text-[#9aa29e] sm:px-10 sm:text-left sm:text-[10px] xl:px-14">
                Having trouble? Contact support at support@villeto.com.
            </footer>
        </div>
    );
}
