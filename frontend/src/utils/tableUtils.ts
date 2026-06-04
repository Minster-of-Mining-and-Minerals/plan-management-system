export function getPageCount(totalRows: number, pageSize: number): number {
  if (!pageSize || totalRows <= 0) return 1;
  return Math.ceil(totalRows / pageSize);
}

export function getPaginationRange(
  pageIndex: number,
  pageSize: number,
  totalRows: number
): { from: number; to: number } {
  if (totalRows === 0) return { from: 0, to: 0 };
  const from = pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);
  return { from, to };
}

export function matchesActiveInactiveFilter(
  statusFilter: string,
  isActive: boolean
): boolean {
  if (!statusFilter) return true;
  const selected = statusFilter
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (selected.length === 0) return true;

  const wantsActive = selected.includes("active");
  const wantsInactive = selected.includes("inactive");
  if (wantsActive && wantsInactive) return true;
  if (wantsActive) return isActive;
  if (wantsInactive) return !isActive;
  return true;
}

export function matchesMultiValueFilter(
  filterValue: string,
  itemValue: string
): boolean {
  if (!filterValue) return true;
  const selected = filterValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (selected.length === 0) return true;
  return selected.includes(itemValue);
}

export function matchesSearchQuery(
  searchQuery: string,
  values: Array<string | null | undefined>
): boolean {
  if (!searchQuery.trim()) return true;
  const query = searchQuery.trim().toLowerCase();
  return values.some((value) =>
    (value ?? "").toString().toLowerCase().includes(query)
  );
}
