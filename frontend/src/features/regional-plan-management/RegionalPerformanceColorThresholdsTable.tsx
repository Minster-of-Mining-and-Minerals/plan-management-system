"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import type { ActionButton } from "@/types/tableLayout";
import { actionFeedback } from "@/components/action-feedback";
import {
  useGetRegionalPerformanceColorThresholdsQuery,
  useDeleteRegionalPerformanceColorThresholdMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPerformanceColorThreshold } from "@/redux/types/regionalPlan";
import { CreateRegionalPerformanceColorThresholdModal } from "./modals/CreateRegionalPerformanceColorThresholdModal";
import { RegionalPlanTabsHeader } from "./RegionalPlanTabsHeader";
import { usePermissions } from "@/hooks/usePermissions";

export function RegionalPerformanceColorThresholdsTable() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();

  const [selectedThreshold, setSelectedThreshold] =
    useState<RegionalPerformanceColorThreshold | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const {
    data: thresholds = [],
    isLoading,
    refetch,
  } = useGetRegionalPerformanceColorThresholdsQuery(
    { region_id: regionId },
    { skip: !regionId }
  );

  const [deleteThreshold] = useDeleteRegionalPerformanceColorThresholdMutation();

  const canCreate =
    can("REGIONAL_PERFORMANCE_COLORS:CREATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canUpdate =
    can("REGIONAL_PERFORMANCE_COLORS:UPDATE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");
  const canDelete =
    can("REGIONAL_PERFORMANCE_COLORS:DELETE") ||
    can("REGIONAL_PLANS:MANAGE") ||
    can("REGIONS:MANAGE");

  const handleDelete = async (thresholdId: string) => {
    if (
      !(await actionFeedback.confirm(
        "Are you sure you want to delete this performance threshold?",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await deleteThreshold({ id: thresholdId, region_id: regionId }).unwrap();
      actionFeedback.success("Performance color threshold deleted");
      refetch();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to delete threshold");
    }
  };

  const columns: ColumnDef<RegionalPerformanceColorThreshold>[] = [
    {
      accessorKey: "label",
      header: "Label",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border border-gray-200 shrink-0 shadow-xs"
            style={{ backgroundColor: row.original.color_hex }}
          />
          <span className="font-semibold text-foreground">{row.original.label}</span>
        </div>
      ),
    },
    {
      id: "range",
      header: "Achievement Range",
      cell: ({ row }) => (
        <span className="text-sm font-mono font-medium">
          {row.original.min_percentage}% – {row.original.max_percentage}%
        </span>
      ),
    },
    {
      accessorKey: "color_hex",
      header: "Color Hex",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded border border-border">
          {row.original.color_hex}
        </code>
      ),
    },
    {
      accessorKey: "sort_order",
      header: "Sort Order",
      cell: ({ row }) => <span className="text-sm">{row.original.sort_order}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setSelectedThreshold(row.original);
                setModalOpen(true);
              }}
              title="Edit Threshold"
            >
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() =>
                handleDelete(row.original.regional_performance_color_threshold_id)
              }
              title="Delete Threshold"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const actions: ActionButton[] = canCreate
    ? [
        {
          label: "New Threshold",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            setSelectedThreshold(null);
            setModalOpen(true);
          },
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <RegionalPlanTabsHeader />

      <TableLayout
        title="Performance Coloring Settings"
        description="Configure achievement percentage thresholds and color assignments used across plan hierarchy nodes, dashboards, and execution progress rollups."
        actions={actions}
      >
        <DataTable
          columns={columns}
          data={thresholds}
          isLoading={isLoading}
        />
      </TableLayout>

      {isModalOpen && regionId && (
        <CreateRegionalPerformanceColorThresholdModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedThreshold(null);
          }}
          regionId={regionId}
          threshold={selectedThreshold}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
