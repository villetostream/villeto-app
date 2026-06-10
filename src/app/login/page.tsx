// app/login/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuthStore, User } from '@/stores/auth-stores';
import { MailAtSign01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import FormFieldInput from '@/components/form fields/formFieldInput';
import CircleProgress from '@/components/HalfProgressCircle';
import Link from 'next/link';
import { useLogin } from '@/actions/auth/auth-login';
import { AxiosError } from 'axios';
import { loginSchema } from '@/lib/schemas/schemas';

type FormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const login = useLogin();
    const isLoading = login.isPending;
    const setUser = useAuthStore().login;
    const setAccessToken = useAuthStore().setAccessToken;
    const setCompanyPermissions = useAuthStore().setCompanyPermissions;
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        },
    });

    const onSubmit = async (data: FormData) => {
        try {
            setError(null);
            const response = await login.mutateAsync(data);
            setAccessToken(response.data.accessToken);
            setUser(response.data.user as User);
            setCompanyPermissions(response.data.user?.companyRole?.permissions ?? []);
            router.push('/dashboard');
        } catch (err: any) {
            setError(((err as AxiosError).response?.data as any)?.message as string ?? "Invalid email or password");
        }
    };

    return (
        <div className="h-full flex-col flex items-center justify-center">
            <div className='absolute top-0 left-0 mb-auto p-10 flex w-full items-center justify-between'>
                <div>
                    <img src="/images/logo.png" className='h-14 w-32 object-cover' alt="Villeto" />
                </div>
                {/* Optional: Remove CircleProgress or set to full if it's a single step now */}
                {/* <CircleProgress currentStep={1} /> */}
            </div>
            <Card className="w-full bg-white !border-0 shadow-none max-w-md">
                <CardHeader className="space-y-2.5 ">

                    <HugeiconsIcon icon={MailAtSign01Icon} className="w-10 h-10 text-primary mb-2.5" />

                    <CardTitle className="text-2xl font-semibold leading-[100%]">Sign In to Villeto</CardTitle>
                    <CardDescription>
                        Enter your email and password to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className='pt-10'>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 mb-4">
                                    {error}
                                </div>
                            )}

                            <FormFieldInput
                                label='Email Address'
                                placeholder="Enter official email"
                                control={form.control}
                                name='email'
                                type='email'
                                inputMode='email'
                            />

                            <div className="space-y-1">
                                <FormFieldInput
                                    label='Password'
                                    placeholder="Enter your password"
                                    control={form.control}
                                    name='password'
                                    type='password'
                                    showPasswordToggle={true}
                                />
                                <div className="flex justify-end pt-1">
                                    <Link 
                                        href="/forgot-password" 
                                        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-6"
                                disabled={isLoading}
                                size={"md"}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                        </form>
                    </Form>
                    <div className='flex justify-center items-center gap-2 text-lg font-medium mt-10'>
                        New to Villeto? <Link href="/pre-onboarding" className="text-primary text-lg font-medium text-no-underline hover:text-no-underline">Sign up</Link>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}