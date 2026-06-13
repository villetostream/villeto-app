"use client";

import React from "react";
import { Button } from "../ui/button";
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

  // Get preserved values from sessionStorage
  const getPreservedValues = () => {
    if (typeof window === "undefined")
      return { reportName: "" };
    const reportName = sessionStorage.getItem("pendingReportName") || "";
    return { reportName };
  };

  // Initialize react-hook-form with zod resolver
  const formHook = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: "onChange",
    defaultValues: {
      reportName: "",
    },
  });

  // Restore values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      formHook.reset();
      const { reportName } = getPreservedValues();
      if (reportName) {
        formHook.setValue("reportName", reportName);
      }
      // Clear sessionStorage after restoring
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
    // Capitalize the first letter of the report name
    const capitalizedName = data.reportName.charAt(0).toUpperCase() + data.reportName.slice(1);
    
    // Ensure a brand-new report starts with a clean receipt state.
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("uploadedReceipts");
    }
    router.push(
      `/expenses/new-report?name=${encodeURIComponent(
        capitalizedName,
      )}`,
    );
    close();
    reset();
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open: boolean) => (open ? toggle(true) : close())}
      >
        <DialogContent className="sm:max-w-[560px] rounded-lg" showCloseButton={false}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-dashboard-text-primary">
              Report Title
            </DialogTitle>
          </DialogHeader>
          <Form {...formHook}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                <FormFieldInput
                  label=""
                  name="reportName"
                  placeholder="Enter title"
                  control={control}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    close();
                    reset();
                  }}
                  className="min-w-24"
                >
                  Cancel
                </Button>
                <Button
                  size={"md"}
                  type="submit"
                  disabled={!isValid || isSubmitting}
                  className="min-w-24 bg-[#7FE3DB] hover:bg-[#7FE3DB]/90 text-[#344054]"
                >
                  {isSubmitting ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddNewReport;