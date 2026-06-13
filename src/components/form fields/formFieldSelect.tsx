// components/form fields/formFieldSelect.tsx
import React from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Control, FieldValues, Path } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { X } from "lucide-react";

interface FormFieldSelectProps<T extends FieldValues = FieldValues> {
  placeholder: string;
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  values: Array<{ label: string; value: string | number | boolean }>;
  clearable?: boolean;
  prefixIcon?: React.ReactNode;
}

const sharedInputClasses =
  "w-full text-left font-normal rounded-lg h-12 border border-gray-200 bg-gray-50 text-gray-600";

const focusVariants =
  "focus:outline-none focus-visible:outline-none focus:border-primary focus-visible:border-primary focus:ring-primary/50 focus-visible:ring-primary/50 focus:ring-2 data-[state=open]:border-primary data-[state=open]:ring-primary/50 data-[state=open]:ring-2";

const FormFieldSelect = <T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  values,
  placeholder,
  clearable = true,
  prefixIcon,
}: FormFieldSelectProps<T>) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, formState }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>

          <FormControl>
            <div className="relative">
              {prefixIcon && (
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                  {prefixIcon}
                </div>
              )}

              <Select
                open={isOpen}
                onOpenChange={setIsOpen}
                onValueChange={(val) => {
                  if (val === "__CLEAR__") {
                    const defaults = formState.defaultValues as Partial<T> | undefined;
                    field.onChange(defaults?.[name] ?? undefined);
                    return;
                  }

                  const original = values.find(
                    (v) => v.value?.toString() === val
                  )?.value;

                  field.onChange(original ?? val);
                }}
                value={field.value?.toString() ?? ""}
              >
                {/* NOTE: make trigger classes identical to Input */}
               <SelectTrigger
  className={`
    ${sharedInputClasses}
    ${focusVariants}

    h-12 min-h-[3rem] max-h-[3rem]
    py-0 leading-none

    grid grid-cols-[1fr_auto]
    items-center

    ${prefixIcon ? "pl-12" : "pl-4"} pr-10
    ${clearable && field.value ? "[&>svg]:hidden" : ""}
  `}
>
  <SelectValue
    className="leading-none flex items-center"
    placeholder={placeholder}
  />
</SelectTrigger>

                <SelectContent>
                  {clearable &&
                    field.value !== undefined &&
                    field.value !== "" && (
                      <SelectItem
                        value="__CLEAR__"
                        className="text-red-600 hover:text-red-700 focus:text-red-700"
                      >
                        Clear selection
                      </SelectItem>
                    )}

                  {values
                    .filter(
                      (item) =>
                        item.value !== undefined &&
                        item.value !== null &&
                        item.value.toString() !== ""
                    )
                    .map((item) => (
                      <SelectItem
                        key={item.value.toString()}
                        value={item.value.toString()}
                        className="capitalize text-black"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {clearable &&
                field.value !== undefined &&
                field.value !== "" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      field.onChange(
                        (formState.defaultValues as Partial<T> | undefined)?.[name] ?? ""
                      );
                      setIsOpen(true);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-600 focus:outline-none p-1 z-50 bg-inherit"
                    aria-label="Clear selection"
                  >
                    <X size={16} />
                  </button>
                )}
            </div>
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormFieldSelect;
