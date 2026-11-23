'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useNavigationLoading } from '@/components/NavigationLoadingProvider';
import { useRouter } from 'next/navigation';
import { buildPageNumbers, cn, ELLIPSIS } from '@/lib/utils';

interface AppPaginationProps {
  currentPage: number;
  totalPages: number;
  hasMorePages: boolean;
  onPageChange?: (page: number) => void;
  baseUrl?: string;
  navigationLabel?: string;
}

const AppPagination = ({
  currentPage,
  totalPages,
  hasMorePages,
  onPageChange,
  baseUrl = '/coins',
  navigationLabel = 'Loading assets...',
}: AppPaginationProps) => {
  const router = useRouter();
  const { beginNavigation } = useNavigationLoading();

  const handlePageChange = (page: number) => {
    if (page === currentPage) return;

    if (onPageChange) {
      onPageChange(page);
    } else {
      beginNavigation(navigationLabel);
      router.push(`${baseUrl}?page=${page}`);
    }
  };

  const pageNumbers = buildPageNumbers(currentPage, totalPages);
  const isFirstPage = currentPage === 1;
  const isLastPage = !hasMorePages || currentPage === totalPages;

  return (
    <Pagination className="flex justify-center items-center mt-8 mb-12">
      <PaginationContent className="flex flex-wrap justify-center gap-2">
        <PaginationItem>
          <PaginationPrevious
            onClick={() => !isFirstPage && handlePageChange(currentPage - 1)}
            aria-disabled={isFirstPage}
            className={cn(
              'glass-card px-4 py-2 text-sm font-medium hover:text-brand-blue border-white/10 cursor-pointer',
              isFirstPage && 'pointer-events-none opacity-40',
            )}
          />
        </PaginationItem>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === ELLIPSIS) {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis className="text-muted-foreground px-2" />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageChange(page as number)}
                  isActive={currentPage === page}
                  className={cn(
                    'size-10 flex items-center justify-center rounded-lg font-semibold transition-all duration-200 border border-white/10 cursor-pointer',
                    currentPage === page
                      ? 'brand-gradient-bg text-white border-transparent neon-glow-blue'
                      : 'glass-card hover:border-brand-blue/50 text-muted-foreground hover:text-white',
                  )}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
        </div>

        <PaginationItem>
          <PaginationNext
            onClick={() => !isLastPage && handlePageChange(currentPage + 1)}
            aria-disabled={isLastPage}
            className={cn(
              'glass-card px-4 py-2 text-sm font-medium hover:text-brand-blue border-white/10 cursor-pointer',
              isLastPage && 'pointer-events-none opacity-40',
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default AppPagination;
