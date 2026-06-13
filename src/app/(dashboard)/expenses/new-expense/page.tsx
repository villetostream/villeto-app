"use client";
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { ManualExpenseForm } from '@/components/expenses/ManualExpenseForm'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function ExpenseFormContent() {
  const searchParams = useSearchParams()
  const ocrParam = searchParams.get("ocr")
  
  // If ocr param exists, use original ExpenseForm (OCR/upload flow)
  // Otherwise, use ManualExpenseForm (manual entry flow)
  if (ocrParam) {
    return <ExpenseForm />
  }
  
  return <ManualExpenseForm />
}

const Page = () => {
    return (
        <Suspense 
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading form...</span>
            </div>
          }
        >
          <ExpenseFormContent />
        </Suspense>
    )
}

export default Page