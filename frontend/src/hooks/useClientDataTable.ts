"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type SearchableAccessor<T> = keyof T | ((row: T) => string | number | null | undefined);

function getSearchableText<T>(row: T, accessor: SearchableAccessor<T>): string {
  if (typeof accessor === "function") {
    const v = accessor(row);
    return v == null ? "" : String(v);
  }
  const v = row[accessor];
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export interface UseClientDataTableOptions<T> {
  /** Fields (or getters) included in header search */
  searchKeys: SearchableAccessor<T>[];
  initialPageSize?: number;
  /** Applied after search */
  filterFn?: (row: T) => boolean;
  /** Sort before filter/paginate */
  sortFn?: (a: T, b: T) => number;
  /** Reset to page 1 when these change (e.g. status filters) */
  resetDeps?: unknown[];
}

export function useClientDataTable<T>(
  data: T[],
  {
    searchKeys,
    initialPageSize = 10,
    filterFn,
    sortFn,
    resetDeps = [],
  }: UseClientDataTableOptions<T>
) {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPageIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetDeps are caller-provided triggers
  }, [searchQuery, pageSize, ...resetDeps]);

  const sorted = useMemo(() => {
    const copy = [...data];
    if (sortFn) copy.sort(sortFn);
    return copy;
  }, [data, sortFn]);

  const filtered = useMemo(() => {
    let rows = sorted;
    if (filterFn) {
      rows = rows.filter(filterFn);
    }
    if (!searchQuery) return rows;

    return rows.filter((row) =>
      searchKeys.some((key) =>
        getSearchableText(row, key).toLowerCase().includes(searchQuery)
      )
    );
  }, [sorted, searchQuery, searchKeys, filterFn]);

  const totalPageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);

  useEffect(() => {
    if (pageIndex > totalPageCount - 1) {
      setPageIndex(Math.max(0, totalPageCount - 1));
    }
  }, [pageIndex, totalPageCount]);

  const paginated = useMemo(
    () => filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filtered, pageIndex, pageSize]
  );

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

  return {
    searchQuery,
    filtered,
    paginated,
    totalCount: filtered.length,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
    setPageIndex,
  };
}
