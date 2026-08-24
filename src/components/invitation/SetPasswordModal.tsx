"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

interface SetPasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    email: string;
    onSuccess?: () => void;
    preventDismiss?: boolean;
    requireOldPassword?: boolean;
}

function getPasswordStrength(password: string): number {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    return score; // 0–4
}

interface ValidationBadgeProps {
    label: string;
    met: boolean;
}
function ValidationBadge({ label, met }: ValidationBadgeProps) {
    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                met
                    ? "bg-[#e7f6f2] text-[#087f70]"
                    : "border border-black/[0.1] bg-white text-[#98a09c]"
            }`}
        >
            {label}
        </span>
    );
}

export default function SetPasswordModal({
    open,
    onOpenChange,
    email,
    onSuccess,
    preventDismiss,
    requireOldPassword = false,
}: SetPasswordModalProps) {
    const router = useRouter();
    const axios = useAxios();

    const [oldPassword, setOldPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const passwordsMatch = password === confirm && password.length > 0;
    const isValid =
        hasMinLength &&
        hasNumber &&
        hasUpper &&
        hasLower &&
        passwordsMatch &&
        (!requireOldPassword || oldPassword.trim().length > 0);

    const strength = getPasswordStrength(password);
    const handleSubmit = async () => {
        if (!isValid) return;
        setIsLoading(true);
        try {
            if (requireOldPassword) {
                await axios.patch(API_KEYS.AUTH.PASSWORD_UPDATE, {
                    oldPassword,
                    newPassword: password,
                    confirmPassword: confirm,
                });
            } else {
                await axios.post(API_KEYS.USER.PASSWORD_SET, {
                    password,
                    confirmPassword: confirm,
                    email,
                });
            }
            if (onSuccess) {
                toast.success(requireOldPassword ? "Password updated successfully!" : "Password set successfully!");
                onSuccess();
            } else {
                toast.success("Password set successfully! Please log in.");
                onOpenChange(false);
                router.push("/login");
            }
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(
                message ??
                (requireOldPassword
                    ? "Failed to update password. Please try again."
                    : "Failed to set password. Please try again.")
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (preventDismiss && !val) return;
            onOpenChange(val);
        }}>
            <DialogContent 
                showCloseButton={false} 
                onInteractOutside={(e) => preventDismiss && e.preventDefault()}
                className="sm:max-w-[480px] rounded-[14px] p-0 overflow-hidden border-0 shadow-2xl bg-white"
            >
                <div className="p-8 sm:p-10 flex flex-col items-center">

                    {/* Header */}
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70] mb-5">
                        <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {requireOldPassword ? "Update password" : "Set password"}
                    </span>

                    {/* Email pill */}
                    <span className="inline-flex items-center px-3 py-1 border border-black/[0.08] bg-[#f5f7f6] rounded-full text-[10px] font-semibold text-[#303834] mb-6">
                        {email}
                    </span>

                    <DialogTitle className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e] mb-3 text-center">
                        {requireOldPassword ? "Update Password" : "Set Password"}
                    </DialogTitle>
                    <DialogDescription className="text-[14px] leading-6 text-[#66706b] text-center max-w-[320px] mb-8">
                        {requireOldPassword
                            ? "Enter your old password, then choose a stronger new password."
                            : "Set your password to enhance account security."}
                    </DialogDescription>
                    
                    <div className="w-full text-left">

                    {requireOldPassword && (
                        <div className="mb-5">
                            <label className="block text-[13px] font-semibold text-[#202723] mb-2.5">
                                Old Password<span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    type={showOldPassword ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-[56px] rounded-[10px] border-black/[0.1] bg-white px-4 pr-12 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword((v) => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                                >
                                    {showOldPassword ? <Eye className="size-[18px]" strokeWidth={1.7} /> : <EyeOff className="size-[18px]" strokeWidth={1.7} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New password */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-2.5">
                            <label className="text-[13px] font-semibold text-[#202723]">
                                {requireOldPassword ? "New Password" : "Create a Password"}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[#98a09c] mr-1">Security</span>
                                {[1, 2, 3].map((seg) => (
                                    <div
                                        key={seg}
                                        className={`h-1.5 w-6 rounded-full transition-colors ${
                                            strength >= seg + 1
                                                ? strength === 4
                                                    ? "bg-[#0ea894]"
                                                    : strength === 3
                                                    ? "bg-amber-400"
                                                    : "bg-red-400"
                                                : "bg-black/[0.08]"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-[56px] rounded-[10px] border-black/[0.1] bg-white px-4 pr-12 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                            >
                                {showPassword ? <Eye className="size-[18px]" strokeWidth={1.7} /> : <EyeOff className="size-[18px]" strokeWidth={1.7} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-6">
                        <label className="block text-[13px] font-semibold text-[#202723] mb-2.5">
                            Confirm Password<span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                className={`h-[56px] rounded-[10px] bg-white px-4 pr-12 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:ring-[#0ea894]/15 transition-colors ${
                                    confirm && !passwordsMatch ? "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-400/15" : "border-black/[0.1] focus-visible:border-[#0ea894]"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                            >
                                {showConfirm ? <Eye className="size-[18px]" strokeWidth={1.7} /> : <EyeOff className="size-[18px]" strokeWidth={1.7} />}
                            </button>
                        </div>
                        {confirm && !passwordsMatch && (
                            <p className="text-[11px] text-red-500 mt-2 font-medium">Passwords do not match</p>
                        )}
                    </div>

                    {/* Validation badges */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        <ValidationBadge label="8+ characters" met={hasMinLength} />
                        <ValidationBadge label="Number" met={hasNumber} />
                        <ValidationBadge label="Uppercase Letter" met={hasUpper} />
                        <ValidationBadge label="Lowercase Letter" met={hasLower} />
                    </div>

                    {/* Continue button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isLoading}
                        className="h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] disabled:bg-[#f5f7f6] disabled:text-[#98a09c] disabled:shadow-none disabled:hover:translate-y-0 transition-all"
                    >
                        {isLoading ? (
                            <>
                                {requireOldPassword ? "Updating password..." : "Setting password..."}
                                <Loader2 className="ml-2 size-4 animate-spin" />
                            </>
                        ) : (
                            <>Continue <ArrowRight className="ml-2 size-4" /></>
                        )}
                    </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
