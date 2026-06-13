import React, { JSX, useState } from "react";
import Select, { ActionMeta, MultiValue, SingleValue } from "react-select"
import { Control, Controller, FieldValues, ControllerRenderProps, Path } from "react-hook-form";

interface ISelect {
  label: string;
  value: string | number | boolean;
}

interface CustomSelectProps<T extends FieldValues = FieldValues> {
  fieldProp?: {
    required?: boolean;
    error?: string;
    description?: string;
    invalid?: boolean;
  };
  selectProp?: {
    placeholder?: string;
    isDisabled?: boolean;
    isClearable?: boolean;
    isSearchable?: boolean;
    isMultiple?: boolean;
    isLoading?: boolean;
    onInputChange?: (inputValue: string) => void;
  };
  data: Array<ISelect>;
  label: string;
  name?: Path<T>;
  control?: Control<T>;
  value?: string | string[] | number | number[] | boolean | boolean[];
  onChange?: (
    value: string | string[] | number | number[] | boolean | boolean[] | null
  ) => void;
  getId?: (value: unknown) => void;
}

export const CustomSelect = <T extends FieldValues = FieldValues>({
  fieldProp,
  selectProp,
  data,
  label,
  name,
  control,
  value,
  getId: _getId,
  onChange,
}: CustomSelectProps<T>): JSX.Element => {
  // Local state for direct control mode (when not using react-hook-form)
  const [localValue, setLocalValue] = useState<
    string | number | boolean | string[] | number[] | boolean[] | null | undefined
  >(value);

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocalValue(value);
  }

  // Handle direct changes when not using react-hook-form
  const handleDirectChange = (
    newValue: MultiValue<ISelect> | SingleValue<ISelect>,
    _actionMeta: ActionMeta<ISelect>
  ) => {
    if (selectProp?.isMultiple) {
      const values = newValue
        ? (newValue as ISelect[]).map((item) => item.value)
        : [];

      setLocalValue(values as string[] | number[] | boolean[]);
      onChange?.(values as string[] | number[] | boolean[]);
    } else {
      const singleValue = newValue ? (newValue as ISelect).value : null;
      setLocalValue(singleValue);
      onChange?.(singleValue);
    }
  };

  // Handle react-hook-form changes
  const handleControllerChange = (
    newValue: MultiValue<ISelect> | SingleValue<ISelect>,
    _actionMeta: ActionMeta<ISelect>,
    field: ControllerRenderProps<T, Path<T>>
  ) => {
    if (selectProp?.isMultiple) {
      field.onChange(
        newValue ? (newValue as ISelect[]).map((item) => item.value) : []
      );
    } else {
      field.onChange(newValue ? (newValue as ISelect).value : null);
    }
  };

  const renderSelect = (field?: ControllerRenderProps<T, Path<T>>) => {
    // Determine if we're using react-hook-form or direct control
    const isDirectControl = !field;
    const currentValue = isDirectControl ? localValue : field?.value;

    // For direct control, use the provided onChange handler
    const handleChange = isDirectControl
      ? handleDirectChange
      : (newValue: MultiValue<ISelect> | SingleValue<ISelect>, actionMeta: ActionMeta<ISelect>) =>
        handleControllerChange(newValue, actionMeta, field);

    // Calculate the correct value for the Select component
    const selectValue = selectProp?.isMultiple
      ? data.filter((option) =>
        Array.isArray(currentValue)
          ? currentValue.map(String).includes(option.value.toString()) // normalize
          : false
      )
      : currentValue === null ||
        currentValue === undefined ||
        currentValue === ""
        ? null
        : data?.find((option) => option.value.toString() === currentValue.toString()) || null;


    // setFacilityName(currentValue)
    return (
      <div className="flex flex-col space-y-2">
        {/* Label */}
        <label className="text-sm font-medium text-gray-700">
          {label}{" "}
          {fieldProp?.required && <span className="text-red-500">*</span>}
        </label>

        {/* Select Component */}
        <Select
          options={data}
          placeholder={selectProp?.placeholder || "Select an option"}
          isDisabled={selectProp?.isDisabled}
          isClearable={selectProp?.isClearable}
          isSearchable={selectProp?.isSearchable}
          isMulti={selectProp?.isMultiple}
          className="react-select-container"
          classNamePrefix="react-select"
          value={selectValue}
          onChange={handleChange}
          onInputChange={selectProp?.onInputChange}
          isLoading={selectProp?.isLoading}
       



        />

        {/* Description */}
        {fieldProp?.description && (
          <p className="text-sm text-gray-500">{fieldProp.description}</p>
        )}

        {/* Error Message */}
        {fieldProp?.invalid && fieldProp?.error && (
          <p className="text-sm text-red-500">{fieldProp.error}</p>
        )}
      </div>
    );
  };

  if (control && name) {
    return (
      <Controller
        name={name}
        control={control}
        render={({ field }) => renderSelect(field)}
      />
    );
  }

  return renderSelect();
};
