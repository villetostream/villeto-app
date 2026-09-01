// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/stores/auth-stores";
import { User } from "@/features/auth/types";
import { useLogin } from "@/queries/auth/auth-login";
import { loginSchema } from "@/lib/schemas/schemas";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";
import { getEffectiveCompanyPermissions } from "@/features/auth/role-access";

type FormData = z.infer<typeof loginSchema>;

const inputClass = "h-[56px] rounded-[10px] border-black/[0.1] bg-white pl-12 pr-4 text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const isLoading = login.isPending;
  const setUser = useAuthStore().login;
  const setAccessToken = useAuthStore().setAccessToken;
  const setCompanyPermissions = useAuthStore().setCompanyPermissions;
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      const response = await login.mutateAsync(data);
      setAccessToken(response.data.accessToken);
      setUser(response.data.user as User);
      const rootData = response.data;
      const userPermissions = getEffectiveCompanyPermissions(rootData.user ?? rootData);
      setCompanyPermissions(userPermissions);
      // Start proactive refresh so the token is renewed 5 min before expiry
      const expiresInMs = response.data.accessTokenExpiresInMs ?? 3600000;
      scheduleTokenRefresh(expiresInMs);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Invalid email or password"));
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 sm:py-7 xl:px-14">
        <Link href="/" aria-label="Villeto home">
          <Image src="/images/logo.png" alt="Villeto" width={118} height={36} className="h-9 w-[118px] object-cover" priority />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] font-medium text-[#737d78] sm:inline">No account yet?</span>
          <Link href="/pre-onboarding" className="rounded-full border border-black/[0.08] bg-[#f5f7f6] px-3 py-1.5 text-[10px] font-semibold text-[#303834] hover:bg-[#eaedeb] transition-colors">
            Sign up
          </Link>
        </div>
      </header>

      {/* Form area */}
      <div className="mx-auto flex w-full max-w-[560px] flex-1 min-h-0 flex-col justify-center px-6 py-10 sm:px-10 lg:py-14">
        <div className="w-full">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f6f2] px-3 py-1.5 text-[11px] font-semibold text-[#087f70]">
            <Lock className="size-3.5" /> Secure workspace login
          </span>
          <h1 className="mt-6 text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[#0b100e]">
            Welcome back.
          </h1>
          <p className="mt-4 max-w-[44ch] text-[14px] leading-6 text-[#66706b] sm:text-[15px]">
            Sign in to your Villeto workspace to manage spend, teams, and budgets.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-9 space-y-5" noValidate>
              {/* Server-side error */}
              {error && (
                <div className="rounded-[10px] border border-red-200/60 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              {/* Email */}
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <FormLabel className="text-[13px] font-semibold !normal-case text-[#202723]">Work email address</FormLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                    <FormControl>
                      <Input {...field} type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" disabled={isLoading} className={inputClass} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Password */}
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[13px] font-semibold !normal-case text-[#202723]">Password</FormLabel>
                    <Link href="/forgot-password" className="text-[12px] font-semibold text-[#087f70] hover:text-[#065f55] transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#84908a]" strokeWidth={1.7} />
                    <FormControl>
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        className={`${inputClass} pr-12`}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84908a] hover:text-[#303834] transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-[18px]" strokeWidth={1.7} /> : <Eye className="size-[18px]" strokeWidth={1.7} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[54px] w-full rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all"
              >
                {isLoading ? "Signing in..." : "Sign in"}
                {isLoading && <Loader2 className="size-4 animate-spin" />}
              </Button>
            </form>
          </Form>

          <div className="mt-9 border-t border-black/[0.07] pt-6 text-center text-[13px] text-[#69736e]">
            New to Villeto?{" "}
            <Link href="/pre-onboarding" className="font-semibold text-[#087f70] hover:text-[#065f55] transition-colors">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      <footer className="px-20 pb-6 text-center text-[9px] leading-4 text-[#9aa29e] sm:px-10 sm:text-left sm:text-[10px] xl:px-14">
        By signing in, you agree to Villeto&apos;s Terms and Privacy Policy.
      </footer>
    </div>
  );
}
