"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Trash } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionButton } from "@/types/tableLayout";
import { toast } from "sonner";
import {
  useGetPerformanceColorThresholdsQuery,
  useDeletePerformanceColorThresholdMutation,
} from "@/redux/api/performanceColorThresholdApi";
import { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";
import { formatPercentageRange } from "@/utils/performanceColorUtils";
import { CreatePerformanceColorThresholdModal } from "./modals/CreatePerformanceColorThresholdModal";

export default function PerformanceColorThresholdsTable() {
  const [selectedThreshold, setSelectedThreshold] =
    useState<PerformanceColorThreshold | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const { data: thresholds = [], isLoading, refetch } =
    useGetPerformanceColorThresholdsQuery({});
  const [deleteThreshold] = useDeletePerformanceColorThresholdMutation();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this performance threshold?")) {
      try {
        await deleteThreshold(id).unwrap();
        toast.success("Threshold deleted");
        refetch();
      } catch (err: unknown) {
        const error = err as { data?: { message?: string } };
        toast.error(error.data?.message || "Failed to delete threshold");
      }
    }
  };

  const columns: ColumnDef<PerformanceColorThreshold>[] = [
    {
      accessorKey: "label",
      header: "Label",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full border border-gray-200 shrink-0"
            style={{ backgroundColor: row.original.color_hex }}
          />
          <span className="font-medium">{row.original.label}</span>
        </div>
      ),
    },
    {
      id: "range",
      header: "Completion Range",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {formatPercentageRange(row.original)}
        </span>
      ),
    },
    {
      accessorKey: "color_hex",
      header: "Color",
      cell: ({ row }) => (
        <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
          {row.original.color_hex}
        </code>
      ),
    },
    {
      accessorKey: "sort_order",
      header: "Order",
      cell: ({ row }) => <span>{row.original.sort_order}</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge status={row.original.is_active ? "active" : "inactive"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Edit"
            onClick={() => {
              setSelectedThreshold(row.original);
              setModalOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700"
            title="Delete"
            onClick={() =>
              handleDelete(row.original.performance_color_threshold_id)
            }
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Add Threshold",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: () => {
        setSelectedThreshold(null);
        setModalOpen(true);
      },
    },
  ];

  return (
    <>
      <TableLayout
        title="Performance Color Configuration"
        description="Define completion percentage ranges and their display colors for plan cards"
        actions={actions}
      >
        <DataTable
          columns={columns}
          data={thresholds}
          isLoading={isLoading}
          pageSize={10}
        />
      </TableLayout>

      <CreatePerformanceColorThresholdModal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedThreshold(null);
          refetch();
        }}
        threshold={selectedThreshold}
      />
    </>
  );
}
