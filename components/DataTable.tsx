import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DataTable = <T,>({
  columns,
  data,
  rowKey,
  rowHref,
  rowAriaLabel,
  tableClassName,
  headerClassName,
  headerRowClassName,
  headerCellClassName,
  bodyRowClassName,
  bodyCellClassName,
}: DataTableProps<T>) => {
  return (
    <Table className={cn('custom-scrollbar', tableClassName)}>
      <TableHeader className={headerClassName}>
        <TableRow
          className={cn('hover:bg-transparent! border-b border-white/10', headerRowClassName)}
        >
          {columns.map((column, i) => (
            <TableHead
              key={i}
              className={cn(
                'bg-white/5 text-muted-foreground font-semibold py-5 first:pl-6 last:pr-6 border-b border-white/10',
                headerCellClassName,
                column.headClassName,
              )}
            >
              <span className="text-sm tracking-tight">{column.header}</span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIndex) => {
          const href = rowHref?.(row, rowIndex);
          const isClickable = Boolean(href);

          return (
            <TableRow
              key={rowKey(row, rowIndex)}
              className={cn(
                'group overflow-hidden border-b border-white/5 hover:bg-white/[0.03] transition-colors relative',
                isClickable && 'cursor-pointer',
                bodyRowClassName,
              )}
            >
              {columns.map((column, columnIndex) => (
                <TableCell
                  key={columnIndex}
                  className={cn(
                    'py-5 first:pl-6 last:pr-6 text-foreground/90 font-medium',
                    bodyCellClassName,
                    column.cellClassName,
                  )}
                >
                  {isClickable && columnIndex === 0 ? (
                    <Link
                      href={href!}
                      aria-label={rowAriaLabel?.(row, rowIndex)}
                      className="absolute inset-0 z-10 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60 focus-visible:ring-inset"
                    />
                  ) : null}
                  {column.cell(row, rowIndex)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default DataTable;
