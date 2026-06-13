import { useState } from "react";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { cn } from "@/lib/utils";
import { getCurrencyConfig } from "@/lib/utils/currency";

export const SpendingSlider = () => {
    const { monthlySpend, setMonthlySpend, businessSnapshot } = useOnboardingStore();
    const config = getCurrencyConfig(businessSnapshot.countryOfRegistration);
    const spendingRanges = config.spendingRanges;

    // Derive the displayed label from the current position + country config.
    // This ensures the correct currency label shows immediately when country changes,
    // without waiting for the slider to be moved.
    const displayLabel = spendingRanges[monthlySpend]?.label ?? spendingRanges[0].label;

    const country = businessSnapshot.countryOfRegistration;
    const [syncedCountry, setSyncedCountry] = useState(country);
    if (country !== syncedCountry) {
        setSyncedCountry(country);
        setMonthlySpend(monthlySpend, spendingRanges[monthlySpend]?.label);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-normal leading-[100%] tracking-[0%] text-black">
                        What&apos;s your team&apos;s expected monthly spend?
                        <span className="text-red-500">*</span>
                    </h3>
                </div>
                <div className="text-primary text-lg font-bold leading-[100%] tracking-[0%]">
                    {displayLabel}
                </div>
            </div>

            {/* Custom slider */}
            <div className="relative">
                {/* Track */}
                <div className="h-0.5 bg-gray-400 rounded-full relative">
                    {/* Active track */}
                    <div
                        className="h-1 bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(monthlySpend / 3) * 100}%` }}
                    />

                    {/* Slider thumb */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-primary shadow-lg cursor-pointer transition-all duration-300"
                        style={{ left: `calc(${(monthlySpend / 3) * 100}% - 12px)` }}
                    />
                </div>

                {/* Range labels */}
                <div className="flex justify-between mt-4 text-sm text-villeto-gray">
                    {spendingRanges.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setMonthlySpend(range.value, range.label)}
                            className={cn(
                                "transition-colors duration-200",
                                monthlySpend === range.value ? "text-primary font-medium" : "hover:text-primary/80"
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                {/* Hidden input for actual slider functionality */}
                <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={monthlySpend}
                    onChange={(e) => setMonthlySpend(parseInt(e.target.value), spendingRanges[parseInt(e.target.value)]?.label)}
                    className="absolute w-full h-8 -top-3 opacity-0 cursor-pointer z-10"
                />
            </div>
        </div>
    );
};
