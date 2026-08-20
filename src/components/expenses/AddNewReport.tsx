"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormFieldInput from "../form fields/formFieldInput";
import { Form } from "../ui/form";
import { useRouter } from "next/navigation";
import { useGetExpenseCategoriesWithPoliciesApi } from "@/queries/companies/get-expense-categories";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";

// Zod schema for form validation
const reportSchema = z.object({
  reportName: z
    .string()
    .min(1, "Report name is required")
    .max(100, "Report name is too long"),
});

type ReportFormData = z.infer<typeof reportSchema>;

const AddNewReport = ({
  isOpen,
  close,
  toggle,
}: {
  isOpen: boolean;
  close: () => void;
  toggle: (open: boolean) => void;
}) => {
  const router = useRouter();

  const canCreatePolicy = useAuthStore((s) => s.can)("policy", "create");
  
  const categoriesApi = useGetExpenseCategoriesWithPoliciesApi();
  const hasPolicies = Array.isArray(categoriesApi.data?.data) && categoriesApi.data.data.length > 0;
  const isLoadingPolicies = categoriesApi.isLoading;

  const getPreservedValues = () => {
    if (typeof window === "undefined") return { reportName: "" };
    const reportName = sessionStorage.getItem("pendingReportName") || "";
    return { reportName };
  };

  const formHook = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: "onChange",
    defaultValues: { reportName: "" },
  });

  React.useEffect(() => {
    if (isOpen) {
      formHook.reset();
      const { reportName } = getPreservedValues();
      if (reportName) formHook.setValue("reportName", reportName);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pendingReportName");
        sessionStorage.removeItem("pendingReportDate");
      }
    }
  }, [isOpen, formHook]);
  
  const {
    handleSubmit,
    formState: { isSubmitting, isValid },
    reset,
    control,
  } = formHook;

  const onSubmit = (data: ReportFormData) => {
    const capitalizedName = data.reportName.charAt(0).toUpperCase() + data.reportName.slice(1);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("uploadedReceipts");
    }
    router.push(`/expenses/new-report?name=${encodeURIComponent(capitalizedName)}`);
    close();
    reset();
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(isOpenState: boolean) => (isOpenState ? open() : close())}
      >
        <DialogContent className="sm:max-w-[520px] rounded-[14px] border border-black/[0.08]" showCloseButton={false}>
          {isLoadingPolicies ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#087f70]" />
              <p className="text-[13px] font-medium text-[#84908a]">Checking permissions...</p>
            </div>
          ) : !hasPolicies ? (
            <div className="py-10 px-4 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#fdf2f2] text-[#d33d44] rounded-[12px] flex items-center justify-center mb-6">
                <AlertCircle className="w-7 h-7" strokeWidth={1.5} />
              </div>
               
              {canCreatePolicy ? (
                <>
                  <h2 className="text-[18px] font-bold mb-2 text-[#0b100e]">Setup Required</h2>
                  <p className="text-[13px] text-[#68726d] mb-8 max-w-sm leading-relaxed">
                    You need to set up at least one expense policy before any reports can be created. Let&apos;s create your first policy.
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => { close(); reset(); }}
                      className="flex-1 sm:flex-none h-10 px-5 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { close(); reset(); router.push("/policies"); }}
                      className="flex-1 sm:flex-none h-10 px-5 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm"
                    >
                      Create First Policy
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[18px] font-bold mb-2 text-[#0b100e]">Action Required</h2>
                  <p className="text-[13px] text-[#68726d] mb-8 max-w-sm leading-relaxed">
                    You cannot create a report because no expense policy has been set up yet. Please inform your administrator to create a policy first.
                  </p>
                  <button
                    onClick={() => { close(); reset(); }}
                    className="w-full sm:w-auto h-10 px-6 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm"
                  >
                    Understood
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-[18px] font-bold text-[#0b100e]">
                  Report Title
                </DialogTitle>
                <p className="text-[13px] text-[#68726d] mt-0.5">Give your expense report a clear, descriptive name.</p>
              </DialogHeader>

              <div className="w-full h-px bg-black/[0.08] my-1" />

              <Form {...formHook}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid gap-4">
                    <FormFieldInput
                      label=""
                      name="reportName"
                      placeholder="Enter title"
                      control={control}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { close(); reset(); }}
                      className="h-10 px-5 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors min-w-[90px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="h-10 px-5 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-[90px]"
                    >
                      {isSubmitting ? "Processing..." : "Confirm"}
                    </button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddNewReport;