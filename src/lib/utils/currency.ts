export interface CurrencyConfig {
  symbol: string;
  code: string;
  name: string;
  spendingRanges: {
    value: number;
    label: string;       // display label shown in UI
    lower: number;       // raw number sent to backend
    upper: number | null;
  }[];
}

export const COUNTRY_CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
  NGA: {
    symbol: "₦", code: "NGN", name: "Nigerian Naira",
    spendingRanges: [
      { value: 0, label: "< ₦10M",        lower: 0,            upper: 10_000_000 },
      { value: 1, label: "₦10M – ₦50M",   lower: 10_000_000,   upper: 50_000_000 },
      { value: 2, label: "₦50M – ₦200M",  lower: 50_000_000,   upper: 200_000_000 },
      { value: 3, label: "₦200M+",        lower: 200_000_000,  upper: null },
    ],
  },
  GHA: {
    symbol: "₵", code: "GHS", name: "Ghanaian Cedi",
    spendingRanges: [
      { value: 0, label: "< ₵500K",        lower: 0,          upper: 500_000 },
      { value: 1, label: "₵500K – ₵2M",    lower: 500_000,    upper: 2_000_000 },
      { value: 2, label: "₵2M – ₵10M",     lower: 2_000_000,  upper: 10_000_000 },
      { value: 3, label: "₵10M+",          lower: 10_000_000, upper: null },
    ],
  },
  KEN: {
    symbol: "KSh", code: "KES", name: "Kenyan Shilling",
    spendingRanges: [
      { value: 0, label: "< KSh 5M",       lower: 0,           upper: 5_000_000 },
      { value: 1, label: "KSh 5M – 20M",   lower: 5_000_000,   upper: 20_000_000 },
      { value: 2, label: "KSh 20M – 100M", lower: 20_000_000,  upper: 100_000_000 },
      { value: 3, label: "KSh 100M+",      lower: 100_000_000, upper: null },
    ],
  },
  ZAF: {
    symbol: "R", code: "ZAR", name: "South African Rand",
    spendingRanges: [
      { value: 0, label: "< R2M",        lower: 0,           upper: 2_000_000 },
      { value: 1, label: "R2M – R10M",   lower: 2_000_000,   upper: 10_000_000 },
      { value: 2, label: "R10M – R50M",  lower: 10_000_000,  upper: 50_000_000 },
      { value: 3, label: "R50M+",        lower: 50_000_000,  upper: null },
    ],
  },
};

export function getCurrencyConfig(countryCode: string): CurrencyConfig {
  return COUNTRY_CURRENCY_CONFIG[countryCode] ?? COUNTRY_CURRENCY_CONFIG["NGA"];
}

export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = "NGN"
): string {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency || "NGN"} ${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

