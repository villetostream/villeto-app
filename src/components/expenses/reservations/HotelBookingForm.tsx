// components/forms/HotelBookingForm.tsx
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import FormFieldSelect from "@/components/form fields/formFieldSelect";
import FormFieldCalendar from "@/components/form fields/FormFieldCalendar";
import { HotelFormData, hotelFormSchema } from "./schema";
import { CITIES, HOTELS, ROOM_TYPES } from "./constants";

interface HotelBookingFormProps {
    onSubmit: (data: HotelFormData) => void;
    isSubmitting?: boolean;
}

const HotelBookingForm = ({ onSubmit, isSubmitting = false }: HotelBookingFormProps) => {
    const form = useForm<HotelFormData>({
        resolver: zodResolver(hotelFormSchema),
        defaultValues: {
            destinationCity: "",
            hotelName: "",
            roomType: ""
        },
        mode: "onChange"
    });

    const { control, handleSubmit } = form;
    const values = useWatch({ control });

    const isFormValid = values?.destinationCity && values?.hotelName &&
        values?.checkInDate && values?.checkOutDate && values?.roomType;

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="p-2.5 space-y-4 mt-7">
                <div className="grid grid-cols-2 gap-4">
                    {/* Destination City */}
                    <FormFieldSelect
                        name="destinationCity"
                        control={control}
                        label="Destination City"
                        placeholder="Select City"
                        values={CITIES}
                    />

                    {/* Hotel Name */}
                    <FormFieldSelect
                        name="hotelName"
                        control={control}
                        label="Hotel Name"
                        placeholder="Select Hotel"
                        values={HOTELS}
                    />

                    {/* Check-in and Check-out Dates */}
                    <FormFieldCalendar
                        name="checkInDate"
                        control={control}
                        label="Check-in Date"
                    />
                    <FormFieldCalendar
                        name="checkOutDate"
                        control={control}
                        label="Check-out Date"
                    />


                    {/* Room Type */}
                    <FormFieldSelect
                        name="roomType"
                        control={control}
                        label="Room Type"
                        placeholder="Select Room Type"
                        values={ROOM_TYPES}
                    />

                </div>
                {/* Reserve Button */}
                <Button
                    type="submit"
                    className="w-fit"
                    size="md"
                    disabled={!isFormValid || isSubmitting}

                >
                    Reserve Hotel
                </Button>
            </form>
        </Form>
    );
};

export default HotelBookingForm;