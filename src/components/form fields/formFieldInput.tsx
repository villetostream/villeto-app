import React, { useState } from "react";
import { Control, FieldValues, Path } from "react-hook-form";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "../ui/form";
import { Input } from "../ui/input";
import { Eye, EyeOff } from "lucide-react";

interface FormFieldInputProps<T extends FieldValues = FieldValues> {
  type?: React.HTMLInputTypeAttribute;
  name: Path<T>;
  label: string;
  placeholder: string;
  control: Control<T>;
  description?: string;
  inputMode?:
    | "search"
    | "text"
    | "none"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | undefined;
  showPasswordToggle?: boolean;
  pattern?: string;
  prefixIcon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  isCurrency?: boolean;
}

const FormFieldInput = <T extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  control,
  description,
  type = "text",
  inputMode,
  pattern,
  showPasswordToggle = false,
  prefixIcon = null,
  disabled = false,
  required = false,
  isCurrency = false,
}: FormFieldInputProps<T>) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isCurrency
    ? "text"
    : showPasswordToggle && type === "password"
      ? showPassword
        ? "text"
        : "password"
      : type;

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === "") return "";
    const str = val.toString();
    const parts = str.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-2.5">
          <FormLabel className="text-[13px] font-semibold !normal-case text-[#202723]">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              {prefixIcon && (
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#84908a] [&>svg]:size-[18px] [&>svg]:stroke-[1.7]">
                  {prefixIcon}
                </div>
              )}
              <Input
                className={`h-[56px] w-full rounded-[10px] border-black/[0.1] bg-white text-[14px] shadow-[0_4px_16px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15 ${prefixIcon ? "pl-12" : "pl-4"} pr-4 ${showPasswordToggle && type === "password" ? "pr-10" : ""} ${disabled ? "opacity-60 cursor-not-allowed bg-muted/40" : ""}`}
                type={inputType}
                placeholder={placeholder}
                inputMode={inputMode}
                pattern={pattern}
                disabled={disabled}
                {...field}
                value={isCurrency ? formatCurrency(field.value) : field.value}
                onChange={(e) => {
                  if (isCurrency) {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    if (raw === "") return field.onChange("");
                    const parts = raw.split(".");
                    if (parts.length > 2) {
                      return field.onChange(parts[0] + "." + parts.slice(1).join(""));
                    }
                    return field.onChange(raw);
                  }
                  if (type === "number") {
                    const raw = e.target.value;
                    // Keep empty input as empty (lets validation decide).
                    if (raw === "") return field.onChange(raw);
                    const next = Number(raw);
                    return field.onChange(Number.isNaN(next) ? raw : next);
                  }
                  return field.onChange(e);
                }}
              />
              {showPasswordToggle && type === "password" && (
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default FormFieldInput;
