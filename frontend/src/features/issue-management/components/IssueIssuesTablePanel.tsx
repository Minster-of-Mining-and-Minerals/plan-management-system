"use client";

import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton } from "@/types/tableLayout";
import { useIssuesTable } from "../hooks/useIssuesTable";
import type { IssueListScope } from "@/redux/types/issue";

interface IssueIssuesTablePanelProps {
  title?: string;
  description?: string;
  actions?: ActionButton[];
  sideActions?: ActionButton[];
  filterColumnsPerRow?: number;
  className?: string;
  listScope: IssueListScope;
  tableState?: ReturnType<typeof useIssuesTable>;
}

export function IssueIssuesTablePanel({
  title = "Issues",
  description,
  actions = [],
  sideActions = [],
  filterColumnsPerRow = 2,
  className,
  listScope,
  tableState: externalState,
}: IssueIssuesTablePanelProps) {
  const internalState = useIssuesTable({ listScope });
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
        sideActions={sideActions}
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
