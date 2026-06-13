import { Button } from "@/components/ui/button";
import { ArrowLeft, Plane, Briefcase } from "lucide-react";
import { format } from "date-fns";
import {
    Sheet, SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

interface FlightResultsProps {
    fromCity: string;
    toCity: string;
    departureDate?: Date;
    returnDate?: Date;
    flightClass: string;
    tripType: "oneway" | "roundtrip";
    onBack: () => void;
    toggle: () => void;
    isOpen: boolean
    open: () => void
}

const airlines = [
    { name: "Air Peace", logo: "🛫", color: "text-red-500" },
    { name: "Arik Air", logo: "✈️", color: "text-blue-500" },
];

const FlightResults = ({
    fromCity,
    toCity,
    departureDate,
    returnDate: _returnDate,
    flightClass,
    tripType: _tripType,
    onBack,
    toggle, isOpen, open: _open
}: FlightResultsProps) => {
    const getCityCode = (city: string) => {
        const codes: Record<string, string> = {
            Lagos: "LOS",
            Abuja: "ABV",
            "Port Harcourt": "PHC",
            Kano: "KAN",
            Ibadan: "IBA",
        };
        return codes[city] || city.substring(0, 3).toUpperCase();
    };

    const formatDate = (date?: Date) => {
        if (!date) return "";
        return format(date, "do MMM").toUpperCase();
    };

    return (
        <Sheet open={isOpen} onOpenChange={toggle}>
            <SheetContent side="right" className="w-full lg:w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary">
                        Book Flight
                    </SheetTitle>

                </SheetHeader>
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-card rounded-lg shadow-lg">
                        {/* Header */}
                        <div className="flex items-center gap-3 p-6 border-b">
                            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-xl font-semibold text-foreground">Book Flight</h1>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            <div className="flex-1 py-4 text-sm font-medium text-primary relative">
                                Flight Booking
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                            </div>
                            <div className="flex-1 py-4 text-sm font-medium text-muted-foreground text-center">
                                Hotel Accommodation
                            </div>
                        </div>

                        {/* Results */}
                        <div className="p-6 space-y-6">
                            <h2 className="text-lg font-semibold text-center text-foreground">
                                Search results
                            </h2>

                            {/* Flight Cards */}
                            <div className="space-y-4">
                                {airlines.map((airline, index) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-4 bg-card shadow-sm">
                                        {/* Airline & Date */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`text-3xl ${airline.color}`}>{airline.logo}</div>
                                                <span className="font-medium text-foreground">
                                                    {formatDate(departureDate)}
                                                </span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">01 hr 40min</span>
                                        </div>

                                        {/* Flight Details */}
                                        <div className="flex items-center justify-between">
                                            <div className="text-left">
                                                <div className="text-2xl font-bold text-foreground">5.50PM</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {getCityCode(fromCity)} ({fromCity})
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-1 justify-center px-4">
                                                <div className="h-px flex-1 bg-border"></div>
                                                <div className="bg-primary rounded-full p-2">
                                                    <Plane className="h-4 w-4 text-primary-foreground" />
                                                </div>
                                                <div className="h-px flex-1 bg-border"></div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-foreground">7.30PM</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {getCityCode(toCity)} ({toCity})
                                                </div>
                                            </div>
                                        </div>

                                        {/* Class & Price */}
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-2 text-sm text-foreground">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{flightClass}</span>
                                            </div>
                                            <div className="text-xl font-bold text-foreground">₦100,500</div>
                                        </div>

                                        {/* Book Button */}
                                        <Button className="w-full" size="lg">
                                            Book Flight
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default FlightResults;