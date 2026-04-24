import React, { useCallback, useMemo } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash } from "iconsax-reactjs";
import FormFieldInput from "@/components/form fields/formFieldInput";
import FormFieldSelect from "@/components/form fields/formFieldSelect";
import { useAuthStore } from "@/stores/auth-stores";

interface SplitExpenseProps {
    control: any;
    expenseIndex: number;
    totalAmount: number;
}

const splitOptions = {
    department: [
        { label: "Engineering", value: "engineering" },
        { label: "Marketing", value: "marketing" },
        { label: "Sales", value: "sales" },
        { label: "HR", value: "hr" },
    ],
    category: [
        { label: "Development", value: "development" },
        { label: "Design", value: "design" },
        { label: "Research", value: "research" },
    ],
    project: [
        { label: "Project Alpha", value: "alpha" },
        { label: "Project Beta", value: "beta" },
        { label: "Project Gamma", value: "gamma" },
    ],
    colleagues: [
        { label: "John Doe", value: "john" },
        { label: "Jane Smith", value: "jane" },
        { label: "Mike Johnson", value: "mike" },
    ],
};

export function SplitExpense({ control, expenseIndex, totalAmount }: SplitExpenseProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `expenses.${expenseIndex}.splits`,
    });

    // Watch splits for this expense
    const watchedSplits = useWatch({
        control,
        name: `expenses.${expenseIndex}.splits`,
    });

    // ✅ Debounce the totalAmount to avoid jitter when typing
    const [debouncedTotalAmount] = useDebounce(totalAmount, 300);

    // ✅ Properly memoized calculations
    const { remainingAmount, splitTypes } = useMemo(() => {
        const splits = watchedSplits || [];
        const allocatedAmount = splits.reduce((sum: number, split: any) => {
            return sum + (parseFloat(split?.amount) || 0);
        }, 0);

        const types = splits.map((split: any) => split?.type || "department");

        return {
            remainingAmount: debouncedTotalAmount - allocatedAmount,
            splitTypes: types,
        };
    }, [watchedSplits, debouncedTotalAmount]);

    const addSplit = useCallback(() => {
        append({
            type: "department",
            option: null,
            amount: 0,
        });
    }, [append]);

    const removeSplit = useCallback((index: number) => {
        remove(index);
    }, [remove]);

    const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
    const currencySymbol = getCurrencySymbol();
    return (
        <div className="space-y-4">
            <Button
                type="button"
                variant="link"
                disabled={remainingAmount <= 0}
                size="sm"
                onClick={addSplit}
                className="text-primary underline text-base font-bold leading-[150%] !p-0 disabled:bg-transparent disabled:text-primary/40"
            >
                Split Expense
            </Button>

            <div className="space-y-3">
                {fields.map((field, splitIndex) => (
                    <SplitItem
                        key={field.id}
                        control={control}
                        expenseIndex={expenseIndex}
                        splitIndex={splitIndex}
                        splitType={splitTypes[splitIndex] || "department"}
                        onRemove={() => removeSplit(splitIndex)}
                    />
                ))}

                {remainingAmount < 0 && (
                    <div className="text-sm text-destructive font-medium">
                        Total split amount exceeds expense amount by {currencySymbol}
                        {Math.abs(remainingAmount).toFixed(2)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ✅ SplitItem memoized to prevent unnecessary re-renders
const SplitItem = React.memo(
    ({
        control,
        expenseIndex,
        splitIndex,
        splitType,
        onRemove,
    }: {
        control: any;
        expenseIndex: number;
        splitIndex: number;
        splitType: string;
        onRemove: () => void;
    }) => {
        const getOptions = useCallback((type: string) => {
            return splitOptions[type as keyof typeof splitOptions] || [];
        }, []);

        return (
            <div className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Split {splitIndex + 1}</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                        <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormFieldSelect
                        control={control}
                        name={`expenses.${expenseIndex}.splits.${splitIndex}.type`}
                        values={[
                            { label: "Department", value: "department" },
                            { label: "Category", value: "category" },
                            { label: "Project", value: "project" },
                            { label: "Colleagues", value: "colleagues" },
                        ]}
                        placeholder="Select Type"
                        label="Split Type"
                    />

                    <FormFieldSelect
                        control={control}
                        name={`expenses.${expenseIndex}.splits.${splitIndex}.option`}
                        values={getOptions(splitType)}
                        placeholder={`Select ${splitType}`}
                        label={`Select ${splitType}`}
                    />
                </div>

                <FormFieldInput
                    control={control}
                    name={`expenses.${expenseIndex}.splits.${splitIndex}.amount`}
                    label="Split Amount"
                    placeholder="Enter amount"
                    type="number"
                    inputMode="numeric"
                />
            </div>
        );
    }
);
