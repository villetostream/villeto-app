import { Control, FieldValues, Path } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '../ui/form'
import { Textarea } from "@/components/ui/textarea";

const FormFieldTextArea = <T extends FieldValues = FieldValues>({ name, label, placeholder, control, description }: { name: Path<T>, label: string, placeholder: string, control: Control<T>, description?: string }) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Textarea placeholder={placeholder} {...field} rows={5} className='input' />
                    </FormControl>
                    <FormDescription>
                        {description}
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

export default FormFieldTextArea