"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";

import type { FilterField, ActionButton } from "@/types/tableLayout";
import { InternalStructure } from "@/redux/types/internalStructure";
import { useRouter, useSearchParams } from "next/navigation";
import { useRemoveDepartmentFromGroupMutation } from "@/redux/api/permissionGroupApi";
import { actionFeedback } from "@/components/action-feedback";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";

export interface DepartmentsGroupListProps {
  sideActions?: ActionButton[];
  actions?: ActionButton[];
  departments: InternalStructure[];
  groupId?: string;
  isLoading?: boolean;
}

export default function DepartmentsGroupList({
  sideActions,
  actions,
  departments,
  groupId,
  isLoading,
}: DepartmentsGroupListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

  const [removeDepartment, { isLoading: isRemoving }] = useRemoveDepartmentFromGroupMutation();

  const handleRemove = async (internalStructureId: string) => {
    if (!groupId) return;
    if (
      await actionFeedback.confirm(
        "Are you sure you want to remove this department from the group?",
        { destructive: true }
      )
    ) {
      try {
        await removeDepartment({
          permission_group_id: groupId,
          internal_structure_id: internalStructureId,
        }).unwrap();
        actionFeedback.success("Department removed from group");
      } catch (err: any) {
        actionFeedback.error(err?.data?.message || "Failed to remove department");
      }
    }
  };

  const columns: ColumnDef<InternalStructure>[] = [
    {
      accessorKey: "name",
      header: "Department",
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => <div>Level {row.getValue("level")}</div>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return <ActiveStatusBadge isActive={isActive} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() =>
              router.push(`/internal-structures/${row.original.internal_structure_id}`)
            }
            variant="ghost"
            size="icon"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {groupId && (
            <Button
              type="button"
              onClick={() => handleRemove(row.original.internal_structure_id)}
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Remove from Group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const filteredData = departments.filter((item) => {
    if (!matchesActiveInactiveFilter(statusFilter, item.is_active)) return false;
    return matchesSearchQuery(searchQuery, [item.name]);
  });

  return (
    <div className="w-full">
      <TableLayout
        actions={actions}
        sideActions={sideActions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading || isRemoving}
          resetKey={`${searchQuery}-${statusFilter}-${groupId}-${departments.length}`}
        />
      </TableLayout>
    </div>
  );
}
