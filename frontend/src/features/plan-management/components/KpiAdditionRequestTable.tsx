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
import { useGetPlanAmendmentsQuery } from "@/redux/api/planApi";
import type { PlanAmendment, PlanAmendmentStatus } from "@/redux/types/plan";
import { matchesSearchQuery } from "@/utils/tableUtils";
import { cn } from "@/lib/utils";

type KpiAdditionRequestTableProps = {
  draftId: string;
  className?: string;
  sideActions?: ActionButton[];
  actions?: ActionButton[];
  onViewRequest: (amendmentId: string) => void;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusLabel(status: PlanAmendmentStatus | string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending";
    case "approved":
      return "Approved";
    case "applied":
      return "Applied";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status);
  }
}

function statusBadgeClass(status: PlanAmendmentStatus | string): string {
  switch (status) {
    case "pending_approval":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "applied":
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-rose-300 bg-rose-50 text-rose-900";
    case "cancelled":
      return "border-slate-300 bg-slate-50 text-slate-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

export function KpiAdditionRequestTable({
  draftId,
  className,
  sideActions = [],
  actions = [],
  onViewRequest,
}: KpiAdditionRequestTableProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useGetPlanAmendmentsQuery(
    {
      draftId,
      amendmentType: "kpi_addition",
      limit: 100,
    },
    { skip: !draftId }
  );

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    return list.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      return matchesSearchQuery(searchQuery, [
        row.title,
        row.reason,
        row.status,
        row.requester?.full_name,
        String(row.metadata?.parentId ?? row.metadata?.parent_id ?? ""),
        String(
          row.metadata?.annualTarget ?? row.metadata?.annual_target ?? ""
        ),
        String(row.metadata?.weight ?? ""),
        String(row.metadata?.title ?? ""),
      ]);
    });
  }, [data?.data, searchQuery, statusFilter]);

  const columns = useMemo<ColumnDef<PlanAmendment>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.reason || "—"}
          </span>
        ),
      },
      {
        id: "annualTarget",
        header: "Annual target",
        cell: ({ row }) => {
          const target =
            row.original.metadata?.annualTarget ??
            row.original.metadata?.annual_target;
          return target != null ? String(target) : "—";
        },
      },
      {
        id: "weight",
        header: "Weight",
        cell: ({ row }) => {
          const value = row.original.metadata?.weight;
          return value != null ? String(value) : "—";
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                statusBadgeClass(row.original.status)
              )}
            >
              {statusLabel(row.original.status)}
            </Badge>
            {row.original.version != null && (
              <Badge variant="outline" className="text-[10px]">
                v{row.original.version}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "requested",
        header: "Requested",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <p>{row.original.requester?.full_name || "Unknown"}</p>
            <p>{formatDateTime(row.original.requested_at)}</p>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const id = row.original.plan_amendment_id || row.original.id;
          return (
            <Button
              variant="ghost"
              size="icon"
              title="View"
              onClick={() => onViewRequest(id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        },
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
        { label: "Pending", value: "pending_approval" },
        { label: "Applied", value: "applied" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Draft", value: "draft" },
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
