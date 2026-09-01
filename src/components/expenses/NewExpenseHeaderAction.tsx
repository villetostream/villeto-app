"use client";

import { useEffect } from "react";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import useModal from "@/hooks/useModal";
import AddNewReport from "./AddNewReport";
import FlightBooking from "./reservations/FlightReservations";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetExpenseCategoriesWithPoliciesApi } from "@/queries/companies/get-expense-categories";
import { useAuthStore } from "@/stores/auth-stores";

export default function NewExpenseHeaderAction() {
  const { setAction, clearAction } = useHeaderActionStore();
  const { open, close, toggle, isOpen } = useModal();
  const {
    open: openReservation,
    toggle: toggleReservation,
    isOpen: isOpenReservation,
  } = useModal();
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoriesWithPoliciesApi = useGetExpenseCategoriesWithPoliciesApi();
  const hasPolicies = categoriesWithPoliciesApi.data?.meta?.totalCount 
    ? categoriesWithPoliciesApi.data.meta.totalCount > 0 
    : (Array.isArray(categoriesWithPoliciesApi.data?.data) && categoriesWithPoliciesApi.data.data.length > 0);
  const isLoadingPolicies = categoriesWithPoliciesApi.isLoading;
  const canCreatePolicy = useAuthStore((s) => s.can)("policy", "create");

  // Check for openAddReport query param and open modal
  useEffect(() => {
    if (searchParams.get("openAddReport") === "true") {
      open();
      // Remove openAddReport param but keep current URL state
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openAddReport");
      const queryString = params.toString();
      const newUrl = `/expenses${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, open, router]);

  useEffect(() => {
    const isStartDisabled = isLoadingPolicies || (!hasPolicies && !canCreatePolicy);
    const tooltipText = isLoadingPolicies
      ? "Checking permissions..."
      : (!hasPolicies && !canCreatePolicy)
        ? "You cannot create a report because no expense policy has been set up yet. Please inform your administrator to create a policy first." 
        : undefined;

    const isSetupMode = !isLoadingPolicies && !hasPolicies && canCreatePolicy;

    if (isStartDisabled) {
      setAction({
        label: "New Report",
        dataTourId: "new-report-button",
        disabled: true,
        tooltip: tooltipText,
      });
    } else if (isSetupMode) {
      setAction({
        label: "New Report",
        dataTourId: "new-report-button",
        onClick: toggle,
      });
    } else {
      setAction({
        label: "New Report",
        dataTourId: "new-report-button",
        items: [
          {
            label: "Start New Report",
            onClick: toggle,
          },
          {
            label: "Start New Reservation",
            onClick: toggleReservation,
          },
        ],
      });
    }

    return () => clearAction();
  }, [setAction, clearAction, toggle, toggleReservation, isLoadingPolicies, hasPolicies, canCreatePolicy, router]);

  return (
    <>
      <AddNewReport isOpen={isOpen} close={close} toggle={toggle} />
      <FlightBooking
        isOpen={isOpenReservation}
        toggle={toggleReservation}
        open={openReservation}
      />
    </>
  );
}
