"use client"

import OnboardingTitle from '@/components/onboarding/_shared/OnboardingTitle'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { ArrowRight, Loader2 } from 'lucide-react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'
import FormFieldInput from '@/components/form fields/formFieldInput'
import CircleProgress from '@/components/HalfProgressCircle'
import { useConfirmationOnboardingApi } from '@/queries/pre-onboarding/confirm-onbarding-status'
import { useOnboardingStore } from '@/stores/useVilletoStore'
import { emailSchema } from '@/lib/schemas/schemas'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'



type EmailForm = z.infer<typeof emailSchema>

const Page = () => {
  const router = useRouter()
  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  const confirmAccount = useConfirmationOnboardingApi();
  const onboarding = useOnboardingStore()

  const loading = confirmAccount.isPending;

  const onSubmit = async (data: EmailForm) => {
    try {
      // Step 1: Confirm account — if found, this is an existing user
      onboarding.setContactEmail(data.email)
      const confirmResponse = await confirmAccount.mutateAsync(data);

      // Existing user — store info and go to OTP with "continue from where you left"
      const onboardingData = confirmResponse.data;

      onboarding.setOnboardingId(onboardingData.onboardingId);
      onboarding.setIsExistingUser(true);
      onboarding.setStoppedAtStep(onboardingData.step);
      router.push('/pre-onboarding/verify-otp')

    } catch (e: unknown) {
      const error = e as AxiosError
      if (error.status === 404) {
        // New user — reset and go to registration
        onboarding.reset()
        onboarding.setContactEmail(data.email)
        onboarding.setIsExistingUser(false)
        onboarding.setStoppedAtStep(null)
        router.push('/pre-onboarding/registration')
      }
    }
  }

  return (
    <div className="flex-col flex justify-center h-full">
      <div className='  p-10 flex w-full items-center justify-between'>
        <Link href={"/"}>
          <Image src="/images/logo.png" width={128} height={56} className='h-14 w-32 object-cover' alt="Villeto logo" />
        </Link>
        <CircleProgress currentStep={1} />
      </div>
      <div className='p-8 pt-10 px-[4.43777%] my-auto -translate-y-[20%] max-w-[600px]'>

        <div className="mb-8">
          <Image
            src="/images/svgs/chart-rose.svg"
            alt="Welcome celebration"
            width={64}
            height={64}
            className="size-16 mb-6"
          />
        </div>

        <div className="space-y-3.5 pr-10">
          <OnboardingTitle
            title="Get Started with Villeto"
            subtitle="Fill in your details to access a live demo or apply for a Villeto account."
          />
        </div>

        <Form {...form} >
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pt-10 ">
            <FormFieldInput
              control={form.control}
              name="email"
              label="What is your Corporate Email Address?*"
              type="email"
              placeholder="Enter your corporate email address"
            />
            <Button
              type="submit"
              variant={"hero"}
              disabled={loading}
              className="text-lg font-medium min-w-[250px] w-full ml-auto"
            >
              {loading ? "Checking..." : "Next"}
              {loading ? (
                <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="ml-2 h-5 w-5" />
              )}
            </Button>
          </form>
        </Form>
        <div className='flex justify-center items-center gap-2 text-lg font-medium mt-12 pt-8 border-t border-gray-100'>
          <span className="text-gray-500">Already have an account?</span>
          <Link href="/login" className="text-primary font-bold hover:text-primary/80 transition-all">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page;