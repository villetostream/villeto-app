"use client"

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import OnboardingTitle from "@/components/onboarding/_shared/OnboardingTitle";
import CircleProgress from "@/components/HalfProgressCircle";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { useStartOnboardingApi } from "@/queries/pre-onboarding/get-started";
import { toast } from "sonner";
import { registrationSchema } from "@/lib/schemas/schemas";
import { getApiErrorMessage } from "@/lib/types/api-error";
import FormFieldInput from "@/components/form fields/formFieldInput";
import { Check } from "lucide-react";
import Image from "next/image";


type FormData = z.infer<typeof registrationSchema>;

export default function GetStarted() {
    const router = useRouter();
    const onboarding = useOnboardingStore()
    const startOnboarding = useStartOnboardingApi();
    const loading = startOnboarding.isPending;


    const form = useForm<FormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            contactFirstName: onboarding.preOnboarding?.contactFirstName ?? "",
            contactLastName: onboarding.preOnboarding?.contactLastName ?? "",
            accountType: onboarding.preOnboarding?.accountType ?? undefined,
            contactEmail: onboarding.contactEmail
        },
    });
    useEffect(() => {
        if (onboarding.preOnboarding) {
            form.reset({
                contactFirstName: onboarding.preOnboarding.contactFirstName || "",
                contactLastName: onboarding.preOnboarding.contactLastName || "",
                accountType: onboarding.preOnboarding.accountType || undefined,
                contactEmail: onboarding.contactEmail || "",
            });
        }
    }, [onboarding.preOnboarding, onboarding.contactEmail, form]);

    const onSubmit = async (data: FormData) => {
        try {
            const response = await startOnboarding.mutateAsync(data);
            onboarding.setPreOnboarding(data);
            onboarding.setOnboardingId(response.data.onboardingId as string);
            onboarding.setIsExistingUser(false);
            onboarding.setStoppedAtStep(null);
            router.push("/pre-onboarding/verify-otp");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Registration failed. Please try again."));
        }
    };

    useWatch({ control: form.control, name: "accountType" });

    return (
        <div className="h-full flex flex-col lg:justify-center pb-10">
            <div className=' p-10 flex w-full items-center justify-between'>
                <div>
                    <Image src="/images/logo.png" width={128} height={56} className='h-14 w-32 object-cover' alt="Villeto logo" />
                </div>
                <CircleProgress currentStep={2} />
            </div>

            <div className="px-[6.43777%] flex flex-col">
                <div className="mb-8">
                    <Image
                        src="/images/svgs/chart-rose.svg"
                        alt="Welcome celebration"
                        width={64}
                        height={64}
                        className="size-16"
                    />
                </div>

                <div className="space-y-3.5 pr-10">
                    <OnboardingTitle
                        title="Get started with Villeto"
                        subtitle="Fill in your details to access a live demo or apply for a Villeto account."
                    />
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 my-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormFieldInput
                                control={form.control}
                                name="contactFirstName"
                                label="First Name*"
                                placeholder="Enter first name"
                            />

                            <FormFieldInput
                                control={form.control}
                                name="contactLastName"
                                label="Last Name*"
                                placeholder="Enter last name"
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="accountType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        How would you like to use Villeto?<span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                            {/* DEMO OPTION */}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("demo")}
                                                className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${field.value === "demo"
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className={`h-5 w-5 rounded flex items-center justify-center border-2 transition-colors ${field.value === "demo"
                                                    ? "border-primary bg-primary"
                                                    : "border-gray-300"
                                                    }`}>
                                                    {field.value === "demo" && (
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    )}
                                                </div>
                                                <span className="font-medium">I want a Demo account</span>
                                            </button>

                                            {/* ENTERPRISE OPTION */}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("enterprise")}
                                                className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${field.value === "enterprise"
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50"
                                                    }`}
                                            >
                                                <div className={`h-5 w-5 rounded flex items-center justify-center border-2 transition-colors ${field.value === "enterprise"
                                                    ? "border-primary bg-primary"
                                                    : "border-gray-300"
                                                    }`}>
                                                    {field.value === "enterprise" && (
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    )}
                                                </div>
                                                <span className="font-medium">I want to apply for Villeto</span>
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"

                                variant="ghost"
                                className="flex-1 text-base font-semibold bg-gray-200"
                                onClick={() => window.open("mailto:sales@villeto.com")}
                                disabled={loading}

                            >
                                <MessageSquare className="mr-2 h-5 w-5" />
                                Talk to Sales
                            </Button>
                            <Button
                                variant={"hero"}
                                type="submit"

                                className="flex-1 text-base font-semibold"
                                disabled={loading}
                            >
                                {loading ? "Creating..." : "Continue"}
                                {loading ? <Loader2 className="animate-spin size-6" /> : <svg
                                    className="ml-2 h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>}
                            </Button>
                        </div>
                    </form>
                </Form >
            </div >
        </div >
    );
};