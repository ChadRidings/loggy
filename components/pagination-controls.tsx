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
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const lastPage = totalPages;

  const compactPages = (() => {
    if (totalPages <= 4) {
      return pages;
    }

    if (currentPage <= 2) {
      return [1, 2, 3, lastPage];
    }

    if (currentPage >= lastPage - 1) {
      return [1, lastPage - 2, lastPage - 1, lastPage];
    }

    return [1, currentPage - 1, currentPage, currentPage + 1, lastPage];
  })();
  const pageButtonBaseClass =
    "min-w-10 rounded-md border px-2 py-1.5 text-sm transition-colors duration-300 ease-in-out";
  const pageButtonActiveClass = "border-(--accent) bg-(--accent) text-(--textdark)";
  const pageButtonInactiveClass = "border-(--border) bg-white/5 text-(--accent) hover:border-(--accent)";

  return (
    <nav
      aria-label={ariaLabel}
      className={className ?? "mt-4 flex items-center justify-center text-xs"}
    >
      <div className="flex w-full items-center justify-center gap-1">
        {compactPages.map((page, index) => {
          const previous = compactPages[index - 1];
          const showEllipsis = previous !== undefined && page - previous > 1;

          return (
            <div key={page} className="flex items-center gap-1">
              {showEllipsis ? <span className="px-1 text-(--accent)">...</span> : null}
              <button
                type="button"
                className={`${pageButtonBaseClass} ${
                  page === currentPage
                    ? pageButtonActiveClass
                    : pageButtonInactiveClass
                }`}
                onClick={() => onPageChange(page)}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
