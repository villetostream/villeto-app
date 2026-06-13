// components/forms/FlightBookingForm.tsx
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Form } from "@/components/ui/form";
import FormFieldSelect from "@/components/form fields/formFieldSelect";
import FormFieldCalendar from "@/components/form fields/FormFieldCalendar";
import { CITIES, FLIGHT_CLASSES } from "./constants";
import { FlightFormData, flightFormSchema } from "./schema";

interface FlightBookingFormProps {
    onSubmit: (data: FlightFormData) => void;
    isSubmitting?: boolean;
}

const FlightBookingForm = ({ onSubmit, isSubmitting = false }: FlightBookingFormProps) => {
    const form = useForm<FlightFormData>({
        resolver: zodResolver(flightFormSchema),
        defaultValues: {
            tripType: "oneway",
            fromCity: "",
            toCity: "",
            flightClass: ""
        },
        mode: "onChange"
    });

    const { control, handleSubmit, setValue } = form;
    const values = useWatch({ control });
    const tripType = values?.tripType;

    const isFormValid = values?.fromCity && values?.toCity && values?.departureDate && values?.flightClass &&
        (tripType === "oneway" || (tripType === "roundtrip" && values?.returnDate));

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="p-2.5 space-y-4">
                {/* Trip Type Toggle */}
                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 justify-center">
                    <Button
                        type="button"
                        size="md"
                        variant={tripType === "oneway" ? "default" : "outlinePrimary"}
                        onClick={() => setValue("tripType", "oneway")}
                        className="gap-2 rounded"
                    >
                        <ArrowRight className="h-4 w-4" />
                        One Way
                    </Button>
                    <Button
                        type="button"
                        size="md"
                        variant={tripType === "roundtrip" ? "default" : "outlinePrimary"}
                        onClick={() => setValue("tripType", "roundtrip")}
                        className="gap-2 rounded"
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                        Round Trip
                    </Button>
                </div>

                {/* From/To Cities */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormFieldSelect
                        name="fromCity"
                        control={control}
                        label="From"
                        placeholder="Select City"
                        values={CITIES}
                    />
                    <FormFieldSelect
                        name="toCity"
                        control={control}
                        values={CITIES}
                        label="To"
                        placeholder="Select City"
                    />

                    {/* Dates */}

                    <FormFieldCalendar
                        name="departureDate"
                        control={control}
                        label="Departure Date"
                    />
                    {tripType === "roundtrip" && (
                        <FormFieldCalendar
                            name="returnDate"
                            control={control}
                            label="Return Date"
                        />
                    )}


                    {/* Class */}
                    <FormFieldSelect
                        name="flightClass"
                        control={control}
                        label="Class"
                        placeholder="Select Class"
                        values={FLIGHT_CLASSES}
                    />
                </div>

                {/* Search Button */}
                <Button
                    type="submit"
                    className="w-fit mt-2"
                    size="md"
                    disabled={!isFormValid || isSubmitting}

                >
                    {tripType === "oneway" ? "Search Flight" : "Book Flight"}
                </Button>
            </form>
        </Form>
    );
};

export default FlightBookingForm;