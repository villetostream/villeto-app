// components/booking/FlightBooking.tsx
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import useModal from "@/hooks/useModal";

interface ExpenseFormSheetProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  open?: () => void;
  toggle?: () => void;
}
import FlightResults from "./FlightResults";
import { CITIES, FLIGHT_CLASSES } from "./constants";
import FlightBookingForm from "./FlightBookingForm";
import HotelBookingForm from "./HotelBookingForm";
import BookingTabs, { BookingTab } from "./RservationTabs";
import { FlightFormData, HotelFormData } from "./schema";
import { logger } from "@/lib/logger";

const FlightBooking = ({ trigger: _trigger, isOpen, toggle }: ExpenseFormSheetProps) => {
    const [activeTab, setActiveTab] = useState<BookingTab>("flight");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { open: openResults, toggle: toggleResults, isOpen: isOpenResults } = useModal();
    const [flightFormData, setFlightFormData] = useState<FlightFormData | null>(null);

    const handleFlightSubmit = async (data: FlightFormData) => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setFlightFormData(data);
        openResults();
        setIsSubmitting(false);
    };

    const handleHotelSubmit = async (data: HotelFormData) => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        logger.log("Hotel booking data:", data);
        // Handle hotel booking logic here
        setIsSubmitting(false);
    };

    const handleReset = () => {
        toggleResults();
        setFlightFormData(null);
    };

    if (isOpenResults && flightFormData) {
        return (
            <FlightResults
                fromCity={CITIES.find(c => c.value === flightFormData.fromCity)?.label || ""}
                toCity={CITIES.find(c => c.value === flightFormData.toCity)?.label || ""}
                departureDate={flightFormData.departureDate}
                returnDate={flightFormData.returnDate}
                flightClass={FLIGHT_CLASSES.find(c => c.value === flightFormData.flightClass)?.label || ""}
                tripType={flightFormData.tripType}
                onBack={handleReset}
                toggle={toggleResults}
                isOpen={isOpenResults}
                open={openResults}
            />
        );
    }

    return (
        <>
            <Sheet open={isOpen} onOpenChange={toggle}>
                <SheetContent side="right" className="w-full lg:w-[500px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="text-xl font-semibold text-dashboard-text-primary">
                            {activeTab === "flight" ? "Book Flight" : "Hotel Accommodation"}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="w-full">
                        <BookingTabs activeTab={activeTab} onTabChange={setActiveTab} />

                        {activeTab === "flight" ? (
                            <FlightBookingForm
                                onSubmit={handleFlightSubmit}
                                isSubmitting={isSubmitting}
                            />
                        ) : (
                            <HotelBookingForm
                                onSubmit={handleHotelSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default FlightBooking;
