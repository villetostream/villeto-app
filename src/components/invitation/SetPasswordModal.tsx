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
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                met
                    ? "border-primary/40 text-primary bg-primary/5"
                    : "border-red-300 text-gray-500 bg-white"
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
                className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-0 shadow-2xl"
            >
                <div className="p-8">

                    {/* Lock icon */}
                    <div className="flex flex-col items-center mb-5">
                        <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center mb-4">
                            <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>

                        {/* Email pill */}
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 mb-4">
                            {email}
                        </span>

                        <DialogTitle className="text-2xl font-bold text-gray-900 mb-1">
                            {requireOldPassword ? "Update Password" : "Set Password"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 text-center">
                            {requireOldPassword
                                ? "Enter your old password, then choose a stronger new password."
                                : "Set your password to enhance account security."}
                        </DialogDescription>
                    </div>

                    {requireOldPassword && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-800 mb-1.5">
                                Old Password<span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Input
                                    type={showOldPassword ? "text" : "password"}
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="pr-10 h-11 border-gray-200 focus:border-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOldPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showOldPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New password */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-gray-800">
                                {requireOldPassword ? "New Password" : "Create a Password"}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 mr-1">Security level</span>
                                {[1, 2, 3].map((seg) => (
                                    <div
                                        key={seg}
                                        className={`h-1.5 w-8 rounded-full transition-colors ${
                                            strength >= seg + 1
                                                ? strength === 4
                                                    ? "bg-green-500"
                                                    : strength === 3
                                                    ? "bg-yellow-400"
                                                    : "bg-red-400"
                                                : "bg-gray-200"
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
                                className="pr-10 h-11 border-gray-200 focus:border-primary"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-800 mb-1.5">
                            Confirm Password<span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Input
                                type={showConfirm ? "text" : "password"}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                className={`pr-10 h-11 border-gray-200 focus:border-primary ${
                                    confirm && !passwordsMatch ? "border-red-300 focus:border-red-400" : ""
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirm && !passwordsMatch && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                    </div>

                    {/* Validation badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <ValidationBadge label="8+ characters" met={hasMinLength} />
                        <ValidationBadge label="Number" met={hasNumber} />
                        <ValidationBadge label="Uppercase Letter" met={hasUpper} />
                        <ValidationBadge label="Lowercase Letter" met={hasLower} />
                    </div>

                    {/* Continue button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isLoading}
                        className={`w-full h-12 text-base font-semibold rounded-xl transition-all ${
                            isValid
                                ? "bg-primary hover:bg-primary/90 text-white"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        {isLoading ? (
                            <>
                                {requireOldPassword ? "Updating password..." : "Setting password..."}
                                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                            </>
                        ) : (
                            <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
