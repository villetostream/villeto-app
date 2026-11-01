import { Button } from "@/components/ui/button";

export function ListPagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
  isFetching = false,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t p-3 text-sm"
    >
      <span>
        {totalCount} results · Page {page} of {Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
