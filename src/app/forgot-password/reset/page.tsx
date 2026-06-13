"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AuthCard from "@/components/auth/AuthCard";
import Image from "next/image";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  return score;
}

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

  const handleSubmit = async () => {
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
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E6F8F6] flex flex-col">
      <div>
        <Image src="/images/logo.png" width={128} height={56} className="h-14 w-32 object-cover" alt="Logo" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <AuthCard
          icon={<HugeiconsIcon icon={LockKeyIcon} className="size-10 text-primary" />}
          title="Reset Password"
          description="Enter your reset token, email, and your new password."
        >
          <div className="space-y-4 mt-5">
            <div className="space-y-2">
              <Label htmlFor="token">Token<span className="text-destructive">*</span></Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter token from email"
                className="h-12 rounded-xl border-input bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address<span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-input bg-card"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="newPassword">New Password<span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-1">
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
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl border-input bg-card pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password<span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`h-12 rounded-xl border-input bg-card pr-10 ${
                    confirmPassword && !passwordsMatch ? "border-red-300 focus:border-red-400" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${hasMinLength ? "border-primary/40 text-primary bg-primary/5" : "border-red-300 text-gray-500 bg-white"}`}>8+ characters</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${hasNumber ? "border-primary/40 text-primary bg-primary/5" : "border-red-300 text-gray-500 bg-white"}`}>Number</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${hasUpper ? "border-primary/40 text-primary bg-primary/5" : "border-red-300 text-gray-500 bg-white"}`}>Uppercase</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${hasLower ? "border-primary/40 text-primary bg-primary/5" : "border-red-300 text-gray-500 bg-white"}`}>Lowercase</span>
            </div>

            <Button
              type="button"
              size="md"
              className="w-full"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>Resetting... <Loader2 className="ml-2 h-5 w-5 animate-spin" /></>
              ) : (
                <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
