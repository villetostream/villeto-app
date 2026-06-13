import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Input } from "../ui/input";


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
      title={`Filter ${title}`}
      buttonText={""}
      icon={FilterIcon}
    >
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8 px-4"
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
                <FormFieldSelect
                  placeholder={filter.placeholder || `Select ${filter.label}`}
                  name={filter.name}
                  label={filter.label}
                  values={filter.options}
                  control={control}
                />
              )}

              {filter.type === "dateRange" && (
                <div className="col-span-1 lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="flex-1">
                      <Controller
                        control={control}
                        name={`${filter.name}.startDate`}
                        render={({ field }) => (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Start Date
                            </label>
                            <Input
                              type="date"
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              {...field}
                              value={field.value || ""}
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
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              End Date
                            </label>
                            <Input
                              type="date"
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              {...field}
                              value={field.value || ""}
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

          <div className="col-span-2 flex justify-end space-x-4 pb-4">
            <Button
              variant={"ghost"}
              onClick={() => {
                reset({});
                close();
              }}
              className="bg-gray-200 text-gray-800"
            >
              {" "}
              Reset
            </Button>
            <Button
              variant={"default"}
              type="submit"
              className="block rounded-md  px-4 py-2 text-center text-sm font-semibold text-white"
            >
              Apply Filter
            </Button>
          </div>
        </form>
      </Form>
    </ModalComponent>
  );
}
