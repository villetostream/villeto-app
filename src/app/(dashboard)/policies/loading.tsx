import { PersonalExpensesSkeleton } from "@/components/expenses/PersonalExpensesSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PersonalExpensesSkeleton statsCount={4} />
    </div>
  );
}
