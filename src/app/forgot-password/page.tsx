"use client"

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AuthCard from "@/components/auth/AuthCard";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockKeyIcon } from "@hugeicons/core-free-icons";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

interface ForgotPasswordForm {
    email: string;
}

const ForgotPassword = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordForm>();
    const router = useRouter();
    const axios = useAxios();

    const onSubmit = async (data: ForgotPasswordForm) => {
        await axios.post(API_KEYS.AUTH.PASSWORD_RESET_INITIATE, {
            email: data.email,
        });
            toast.success("OTP code sent to your email");
            router.push(`/forgot-password/reset?email=${encodeURIComponent(data.email)}`);
    };

    const handleRememberPassword = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-[#E6F8F6] flex flex-col">
            <div>
                <Image src="/images/logo.png" width={128} height={56} className='h-14 w-32 object-cover' alt="Logo" />
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <AuthCard
                    icon={<HugeiconsIcon icon={LockKeyIcon} className="size-10 text-primary" />}
                    title="Forgot Password?"
                    description="Enter your email address to receive a OTP Code to reset your password."
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 mt-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-card-foreground">
                                Email Address<span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder=""
                                className="h-12 rounded-xl border-input bg-card"
                                {...register("email", {
                                    required: "Please enter your email address",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "Please enter a valid email address"
                                    }
                                })}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size={"md"}
                            className="w-full "
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Sending..." : "Receive OTP Code"}
                        </Button>

                        <div className="flex justify-center items-center w-full">
                            <Button
                                type="button"
                                onClick={handleRememberPassword}
                                variant={"ghost"}
                                size={"sm"}
                                className="w-fit text-sm text-card-foreground hover:text-primary transition-colors"
                            >
                                I remember my password.
                            </Button>
                        </div>
                    </form>
                </AuthCard>
            </div>
        </div>
    );
};

export default ForgotPassword;