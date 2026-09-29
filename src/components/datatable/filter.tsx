import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";
import { DatePicker } from "../ui/date-picker";

import FormFieldSelect from "../form fields/formFieldSelect";
import { Button } from "../ui/button";
import { format } from "date-fns";
import ModalComponent from "../modals/ModalComponent";
import { Form } from "../ui/form";
import useModal from "@/hooks/useModal";
import { FilterIcon } from "lucide-react";

export type FilterData = {
  label: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
  inputType?: string;
  name: string;
  placeholder?: string;
  type: "select" | "input" | "checkbox" | "dateRange" | "range";
};

interface FilterProps {
  title: string;
  filterData: FilterData[];
  onFilter: (data: Record<string, unknown>) => void;
}

export function Filter({ filterProps }: { filterProps: FilterProps }) {
  const { title, filterData, onFilter } = filterProps;
  const form = useForm();
  const { control, handleSubmit, reset } = form;
  const { toggle, isOpen, close } = useModal();

  const onSubmit = (data: Record<string, unknown>) => {
    const processedData: Record<string, unknown> = {};

    // Create a lookup map for faster type checking
    const dateRangeFields = new Set(
      filterData
        .filter((filter) => filter.type === "dateRange")
        .map((filter) => filter.name),
    );

    // Single loop through data entries
    Object.entries(data).forEach(([key, value]) => {
      if (dateRangeFields.has(key)) {
        if (value && typeof value === "object") {
          const rangeData = value as Record<string, unknown>;

          const startDate = rangeData.startDate
            ? format(new Date(rangeData.startDate as string), "yyyy-MM-dd")
            : undefined;
          const endDate = rangeData.endDate
            ? format(new Date(rangeData.endDate as string), "yyyy-MM-dd")
            : undefined;

          // Add formatted date ranges if at least one date exists
          if (startDate || endDate) {
            processedData[`dateRanges[${key}][startDate]`] = startDate;
            processedData[`dateRanges[${key}][endDate]`] = endDate;
          }
        }
      } else {
        processedData[`filters[${key}]`] = value;
      }
    });

    onFilter(processedData);
    close();
  };
  return (
    <ModalComponent
      onOpen={() => {
        toggle();
      }}
      isOpen={isOpen}
      title={title}
      buttonText={""}
      icon={FilterIcon}
    >
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-6 px-1 py-2"
        >
          {filterData?.map((filter, _index) => (
            <div key={filter.label}>
              {filter.type === "input" && (
                <Controller
                  control={control}
                  name={filter.name}
                  render={({ field }) => (
                    <Input
                      placeholder={
                        filter.placeholder || `Enter ${filter.label}`
                      }
                      {...field}
                    />
                  )}
                />
              )}

              {filter.type === "select" && filter.options && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {filter.label}
                  </label>
                  <Controller
                    control={control}
                    name={filter.name}
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString()}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="h-10 px-4 w-full bg-white border-gray-200 text-gray-700 rounded-[10px] focus:ring-1 focus:ring-primary focus:border-primary">
                          <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
                        </SelectTrigger>
                        <SelectContent className="rounded-[12px] shadow-lg">
                          {filter.options?.map((opt) => (
                            <SelectItem key={opt.value.toString()} value={opt.value.toString()}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {filter.type === "dateRange" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {filter.label}
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name={`${filter.name}.startDate`}
                        render={({ field }) => (
                          <div className="space-y-1">
                            <label className="block text-xs text-gray-500">
                              Start Date
                            </label>
                            <DatePicker
                              date={field.value ? new Date(field.value) : undefined}
                              setDate={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : undefined)}
                              className="h-10 w-full rounded-[10px] border-gray-200 bg-white text-gray-700"
                              placeholder="Start Date"
                            />
                          </div>
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name={`${filter.name}.endDate`}
                        render={({ field }) => (
                          <div className="space-y-1">
                            <label className="block text-xs text-gray-500">
                              End Date
                            </label>
                            <DatePicker
                              date={field.value ? new Date(field.value) : undefined}
                              setDate={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : undefined)}
                              className="h-10 w-full rounded-[10px] border-gray-200 bg-white text-gray-700"
                              placeholder="End Date"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset({});
                close();
              }}
              className="h-10 px-6 rounded-[10px] border-gray-200 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="h-10 px-6 rounded-[10px] font-medium"
            >
              Apply Filter
            </Button>
          </div>
        </form>
      </Form>
    </ModalComponent>
  );
}
