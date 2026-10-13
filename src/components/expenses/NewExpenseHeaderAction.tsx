"use client";

import { useEffect } from "react";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import useModal from "@/hooks/useModal";
import AddNewReport from "./AddNewReport";
import FlightBooking from "./reservations/FlightReservations";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetExpenseCategoriesWithPoliciesApi, hasCategoryWithPolicy } from "@/queries/companies/get-expense-categories";
import { useAuthStore } from "@/stores/auth-stores";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";

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

  const policies = useAuthorizationPolicies();
  const canCreateExpense = policies.expenses.canCreate;
  const categoriesWithPoliciesApi = useGetExpenseCategoriesWithPoliciesApi({ enabled: canCreateExpense });
  const hasPolicies = hasCategoryWithPolicy(categoriesWithPoliciesApi.data?.data);
  const isLoadingPolicies = categoriesWithPoliciesApi.isLoading;
  const canCreatePolicy = useAuthStore((s) => s.can)("policy", "create");

  // Check for openAddReport query param and open modal only if policies exist
  useEffect(() => {
    if (canCreateExpense && searchParams.get("openAddReport") === "true") {
      if (hasPolicies) {
        open();
      }
      // Remove openAddReport param but keep current URL state
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openAddReport");
      const queryString = params.toString();
      const newUrl = `/expenses${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [canCreateExpense, hasPolicies, searchParams, open, router]);

  useEffect(() => {
    if (!canCreateExpense) {
      clearAction();
      return () => clearAction();
    }

    const isStartDisabled = isLoadingPolicies || !hasPolicies;
    const tooltipText = isLoadingPolicies
      ? "Checking for applicable expense policies..."
      : !hasPolicies
        ? canCreatePolicy
          ? "No expense policy has been attached to any category yet. Please add an expense policy before creating a report."
          : "You cannot create an expense report because no expense policy has been set up yet. Please inform your administrator to create a policy first."
        : undefined;

    if (isStartDisabled) {
      setAction({
        label: "New Report",
        dataTourId: "new-report-button",
        disabled: true,
        tooltip: tooltipText,
        secondaryAction: (!isLoadingPolicies && !hasPolicies && canCreatePolicy)
          ? {
              label: "Create Policy",
              onClick: () => router.push("/policies"),
            }
          : undefined,
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
  }, [setAction, clearAction, toggle, toggleReservation, isLoadingPolicies, hasPolicies, canCreatePolicy, canCreateExpense, router]);

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
