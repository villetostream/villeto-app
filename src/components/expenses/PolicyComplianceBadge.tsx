import { AlertTriangle, Check } from "lucide-react";

interface PolicyComplianceBadgeProps {
  policyJustification?: string | null;
}

export function PolicyComplianceBadge({ policyJustification }: PolicyComplianceBadgeProps) {
  if (policyJustification) {
    return (
      <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
        <AlertTriangle className="h-4 w-4" />
        Warning Justified
      </span>
    );
  }

  return (
    <span className="flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-200">
      <Check className="h-4 w-4" />
      Within limit
    </span>
  );
}
