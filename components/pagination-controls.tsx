import { ToggleGroup } from "radix-ui";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel: string;
  className?: string;
};

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  ariaLabel,
  className
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className={className ?? "mt-4 flex items-center justify-between text-xs"}>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <ToggleGroup.Root
        type="single"
        value={String(currentPage)}
        onValueChange={(value) => {
          if (value) {
            onPageChange(Number(value));
          }
        }}
        aria-label={ariaLabel}
        className="flex items-center gap-1"
      >
        {pages.map((page) => (
          <ToggleGroup.Item
            key={page}
            value={String(page)}
            className="rounded border border-slate-300 px-2 py-1 data-[state=on]:bg-slate-900 data-[state=on]:text-white"
            aria-label={`Go to page ${page}`}
          >
            {page}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}
