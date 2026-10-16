import React, { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import AddNewReport from "./AddNewReport";
import useModal from "@/hooks/useModal";
import FlightBooking from "./reservations/FlightReservations";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useGetExpenseCategoriesWithPoliciesApi, hasCategoryWithPolicy } from "@/queries/companies/get-expense-categories";
import { useAuthStore } from "@/stores/auth-stores";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NewExpenseButtonTrigger = () => {
  const { open, close, toggle, isOpen } = useModal();
  const {
    open: openReservation,
    toggle: toggleReservation,
    isOpen: isOpenReservation,
  } = useModal();
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoriesApi = useGetExpenseCategoriesWithPoliciesApi();
  const hasPolicies = hasCategoryWithPolicy(categoriesApi.data?.data);
  const isLoadingPolicies = categoriesApi.isLoading;
  const canCreatePolicy = useAuthStore((s) => s.can)("policy", "create");

  // Check for openAddReport query param and open modal only if policies exist
  useEffect(() => {
    if (searchParams.get("openAddReport") === "true") {
      if (hasPolicies) {
        open();
      }
      // Remove openAddReport param but keep tab param
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openAddReport");
      const tabParam = searchParams.get("tab");
      const newUrl = tabParam 
        ? `/expenses?tab=${tabParam}${params.toString() ? `&${params.toString()}` : ''}`
        : `/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [hasPolicies, searchParams, open, router]);

  const isStartDisabled = isLoadingPolicies || !hasPolicies;
  const tooltipText = isLoadingPolicies 
    ? "Checking for applicable policies..."
    : !hasPolicies
      ? (canCreatePolicy 
          ? "No expense policy has been attached to any category yet. Please set up an expense policy before creating a report."
          : "You cannot create an expense report because no expense policy has been set up yet. Please inform your administrator to create a policy first.")
      : undefined;

  const handleStartReport = (e: React.MouseEvent) => {
    if (isStartDisabled) {
       e.preventDefault();
       return;
    }
    open();
  };

  const mainBtnContent = (
    <>
      <PlusCircle className="w-4 h-4 mr-2" />
      New Report
    </>
  );

  const renderContent = () => {
    if (isStartDisabled) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button size="lg" disabled className="opacity-50 cursor-not-allowed">
                  {mainBtnContent}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="max-w-[280px]">
              <p className="text-sm font-medium">{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg">
            {mainBtnContent}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => open()}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Start New Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleReservation}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Start New Reservation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div>
      <AddNewReport isOpen={isOpen} close={close} toggle={toggle} />
      <FlightBooking
        isOpen={isOpenReservation}
        toggle={toggleReservation}
        open={openReservation}
      />
      {renderContent()}
    </div>
  );
};

export default NewExpenseButtonTrigger;
