"use client";

import { useEffect, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { getPageCount, getPaginationRange } from "@/utils/tableUtils";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100] as const;

interface DataTableBaseProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  /** Change when filters/search change to reset to page 1 */
  resetKey?: string | number;
  defaultPageSize?: number;
  tableClassName?: string;
}

interface ClientDataTableProps<TData, TValue> extends DataTableBaseProps<TData, TValue> {
  paginationMode?: "client";
}

interface ServerDataTableProps<TData, TValue> extends DataTableBaseProps<TData, TValue> {
  paginationMode: "server";
  totalRowCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
}

export type DataTableProps<TData, TValue> =
  | ClientDataTableProps<TData, TValue>
  | ServerDataTableProps<TData, TValue>;

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const {
    columns,
    data,
    isLoading = false,
    resetKey,
    defaultPageSize = 10,
    tableClassName,
  } = props;

  const isServerMode = props.paginationMode === "server";

  const [clientPageIndex, setClientPageIndex] = useState(0);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);

  const pageIndex = isServerMode ? props.pageIndex : clientPageIndex;
  const pageSize = isServerMode ? props.pageSize : clientPageSize;

  useEffect(() => {
    if (!isServerMode) {
      setClientPageIndex(0);
    }
  }, [resetKey, isServerMode]);

  useEffect(() => {
    if (!isServerMode) {
      const maxPageIndex = Math.max(getPageCount(data.length, pageSize) - 1, 0);
      if (clientPageIndex > maxPageIndex) {
        setClientPageIndex(maxPageIndex);
      }
    }
  }, [data.length, pageSize, clientPageIndex, isServerMode]);

  const totalRows = isServerMode ? props.totalRowCount : data.length;
  const pageCount = Math.max(1, getPageCount(totalRows, pageSize));

  const setPagination = (nextPageIndex: number, nextPageSize: number) => {
    if (isServerMode) {
      props.onPaginationChange(nextPageIndex, nextPageSize);
    } else {
      setClientPageIndex(nextPageIndex);
      setClientPageSize(nextPageSize);
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: isServerMode,
    pageCount: isServerMode ? pageCount : undefined,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const nextState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;

      setPagination(nextState.pageIndex, nextState.pageSize);
    },
  });

  const { from, to } = getPaginationRange(pageIndex, pageSize, totalRows);
  const rows = table.getPaginationRowModel().rows;

  return (
    <div className="overflow-auto w-full">
      <Table className={cn("border-separate border-spacing-y-2.5 min-w-full", tableClassName)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="bg-golden-dark hover:bg-golden-darkHover rounded-md overflow-clip"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "text-primary-foreground font-bold first:rounded-l-md last:rounded-r-md py-5",
                    header.column.columnDef.meta?.headerClassName
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="divide-none max-h-[500px] overflow-y-scroll">
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
            rows.map((row, i) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={`bg-white shadow-sm transition-shadow duration-200 even:bg-[#F7F9FF] ${
                  i === 0 ? "first:rounded-t-lg" : "rounded-lg"
                } ${
                  i === rows.length - 1 ? "last:rounded-b-lg" : "rounded-xl"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-4 py-3.5",
                      cell.column.columnDef.meta?.cellClassName
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap pb-1 pt-3 justify-between items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {totalRows > 0
            ? `Showing ${from}-${to} of ${totalRows}`
            : "Showing 0 of 0"}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Rows per page
          </span>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPagination(0, Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex min-w-[120px] items-center justify-center text-sm font-medium">
            Page {pageIndex + 1} of {pageCount}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <DoubleArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
