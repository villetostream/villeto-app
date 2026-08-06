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
        <div className="space-y-5 select-none">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-[13px] font-semibold text-[#202723]">
                        What&apos;s your team&apos;s expected monthly spend?<span className="text-destructive">*</span>
                    </h3>
                </div>
                <div className="text-[13px] font-semibold text-[#0ea894]">
                    {displayLabel}
                </div>
            </div>

            {/* Custom slider */}
            <div className="relative pt-2 pb-1">
                {/* Track */}
                <div className="h-1 bg-[#e7ece9] rounded-full relative">
                    {/* Active track */}
                    <div
                        className="h-1 bg-[#0ea894] rounded-full transition-all duration-300"
                        style={{ width: `${(monthlySpend / 3) * 100}%` }}
                    />

                    {/* Slider thumb */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-[22px] h-[22px] bg-white rounded-full border-[3px] border-[#0ea894] shadow-[0_2px_8px_rgba(14,28,23,0.12)] cursor-grab active:cursor-grabbing transition-all duration-300"
                        style={{ left: `calc(${(monthlySpend / 3) * 100}% - 11px)` }}
                    />
                </div>

                {/* Range labels */}
                <div className="flex justify-between mt-5">
                    {spendingRanges.map((range) => (
                        <button
                            key={range.value}
                            type="button"
                            onClick={() => setMonthlySpend(range.value, range.label)}
                            className={cn(
                                "text-[12px] transition-colors duration-200",
                                monthlySpend === range.value ? "text-[#0ea894] font-semibold" : "text-[#68726d] hover:text-[#0b100e]"
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
