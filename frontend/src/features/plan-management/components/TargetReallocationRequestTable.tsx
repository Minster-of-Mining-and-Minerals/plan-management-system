"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useGetTargetReallocationsQuery } from "@/redux/api/planApi";
import type { TargetReallocationRequest } from "@/redux/types/plan";
import {
  TARGET_REALLOCATION_STATUS,
  targetReallocationStatusBadgeClass,
  targetReallocationStatusLabel,
} from "@/utils/planTargetReallocationWorkflowUtils";
import { matchesSearchQuery } from "@/utils/tableUtils";
import { cn } from "@/lib/utils";

type TargetReallocationRequestTableProps = {
  draftId: string;
  className?: string;
  sideActions?: ActionButton[];
  actions?: ActionButton[];
  onViewRequest: (requestId: string) => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function TargetReallocationRequestTable({
  draftId,
  className,
  sideActions = [],
  actions = [],
  onViewRequest,
}: TargetReallocationRequestTableProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useGetTargetReallocationsQuery(
    {
      draft_id: draftId,
      limit: 100,
      sort_by: "requested_at",
      sort_order: "DESC",
    },
    { skip: !draftId }
  );

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    return list.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      return matchesSearchQuery(searchQuery, [
        row.kpi_title,
        row.from_period_label,
        row.to_period_label,
        row.reason,
        row.requested_by_user?.full_name,
        row.status,
      ]);
    });
  }, [data?.data, searchQuery, statusFilter]);

  const columns = useMemo<ColumnDef<TargetReallocationRequest>[]>(
    () => [
      {
        accessorKey: "kpi_title",
        header: "KPI",
        cell: ({ row }) => (
          <span className="font-medium text-primary">
            {row.original.kpi_title || "KPI"}
          </span>
        ),
      },
      {
        id: "move",
        header: "From → To",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.from_period_label || "Source"} →{" "}
            {row.original.to_period_label || "Destination"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.amount}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              targetReallocationStatusBadgeClass(row.original.status)
            )}
          >
            {targetReallocationStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "requested",
        header: "Requested",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <p>{row.original.requested_by_user?.full_name || "Unknown"}</p>
            <p>{formatDateTime(row.original.requested_at)}</p>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            title="View"
            onClick={() =>
              onViewRequest(row.original.target_reallocation_request_id)
            }
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [onViewRequest]
  );

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Pending", value: TARGET_REALLOCATION_STATUS.PENDING },
        { label: "Applied", value: TARGET_REALLOCATION_STATUS.APPLIED },
        { label: "Rejected", value: TARGET_REALLOCATION_STATUS.REJECTED },
        { label: "Cancelled", value: TARGET_REALLOCATION_STATUS.CANCELLED },
      ],
    },
  ];

  return (
    <div className={cn("w-full", className)}>
      <TableLayout
        sideActions={sideActions}
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          resetKey={`${searchQuery}-${statusFilter}-${draftId}`}
        />
      </TableLayout>
    </div>
  );
}
