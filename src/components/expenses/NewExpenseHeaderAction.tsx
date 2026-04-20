"use client";

import { useEffect } from "react";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import useModal from "@/hooks/useModal";
import AddNewReport from "./AddNewReport";
import FlightBooking from "./reservations/FlightReservations";
import { useSearchParams, useRouter } from "next/navigation";

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

    return () => clearAction();
  }, [setAction, clearAction, toggle, toggleReservation]);

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
