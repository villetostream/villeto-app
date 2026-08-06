import { PenLine } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  showButton?: boolean;
}

const ExpenseEmptyState = ({
  title = "No expenses yet",
  subtitle = "You haven't added any expenses. Create your first expense to get started.",
  showButton = true,
}: EmptyStateProps) => {
  return (
    <>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 mb-6 relative flex items-center justify-center">
          <div className="w-full h-full bg-[#f0faf8] rounded-[14px]" />
          <PenLine
            size={40}
            className="text-[#087f70] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
        </div>
        <h3 className="text-[18px] font-semibold text-[#0b100e] mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-[#68726d] mb-6 text-center max-w-xs">
          {subtitle}
        </p>
        {showButton && (
          <p className="text-[12px] text-[#84908a] italic">
            Use the &quot;New Report&quot; button in the header to get started.
          </p>
        )}
      </div>
    </>
  );
};

export default ExpenseEmptyState;
