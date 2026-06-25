"use client";

import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton } from "@/types/tableLayout";
import { useIssuesTable } from "../hooks/useIssuesTable";

interface IssueIssuesTablePanelProps {
  title?: string;
  description?: string;
  actions?: ActionButton[];
  filterColumnsPerRow?: number;
  className?: string;
  tableState?: ReturnType<typeof useIssuesTable>;
}

export function IssueIssuesTablePanel({
  title = "Issues",
  description,
  actions = [],
  filterColumnsPerRow = 2,
  className,
  tableState: externalState,
}: IssueIssuesTablePanelProps) {
  const internalState = useIssuesTable();
  const {
    issues,
    totalRows,
    isLoading,
    columns,
    filters,
    resetKey,
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
  } = externalState ?? internalState;

  return (
    <div className={className}>
      <TableLayout
        title={title}
        description={description}
        actions={actions}
        filters={filters}
        filterColumnsPerRow={filterColumnsPerRow}
      >
        <DataTable
          columns={columns}
          data={issues}
          isLoading={isLoading}
          paginationMode="server"
          totalRowCount={totalRows}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPaginationChange={(index, size) => {
            setPageIndex(index);
            setPageSize(size);
          }}
          resetKey={resetKey}
        />
      </TableLayout>
    </div>
  );
}
