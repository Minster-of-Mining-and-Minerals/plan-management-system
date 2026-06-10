"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Edit, Trash2 } from "lucide-react";

import { useGetPermissionGroupsQuery, useDeletePermissionGroupMutation } from "@/redux/api/permissionGroupApi";
import type { PermissionGroup } from "@/redux/types/permissionGroup";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { useSearchParams } from "next/navigation";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";

export interface PermissionGroupListProps {
  government_structure_id?: string;
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
}
export default function PermissionGroupList({
  government_structure_id,
  hideLayout = false,
  sideActions,
  readOnly = false,
}: PermissionGroupListProps) {
  const { data = [], isLoading, isError, refetch } = useGetPermissionGroupsQuery({ government_structure_id });
  const [deleteGroup] = useDeletePermissionGroupMutation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

  const columns: ColumnDef<PermissionGroup>[] = [
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => (
        <span className="font-medium text-blue-600">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const group = row.original;
        if (readOnly) {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/users/permission-groups/${group.permission_group_id}`)}
              title="View Group"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/users/permission-groups/${group.permission_group_id}`)}
              title="Edit Group"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (await actionFeedback.confirm("Are you sure you want to delete this permission group?", { destructive: true })) {
                  try {
                    await deleteGroup(group.permission_group_id).unwrap();
                    actionFeedback.success("Permission group deleted successfully");
                    refetch();
                  } catch (err: any) {
                    actionFeedback.error(err?.data?.message || "Failed to delete group");
                  }
                }
              }}
              title="Delete Group"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
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

  // Actions
  const actions: ActionButton[] = readOnly
    ? []
    : [
      {
        label: "Export",
        icon: <Download className="h-4 w-4" />,
        variant: "outline",
        onClick: () => console.log("Export clicked"),
      },
      {
        label: "New Group",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => router.push("/users/permission-groups/new"),
      },
    ];

  const filteredData = data.filter((group) => {
    if (!matchesActiveInactiveFilter(statusFilter, group.is_active)) return false;
    return matchesSearchQuery(searchQuery, [group.name, group.description]);
  });

  return (
    <TableLayout
      title={hideLayout ? undefined : "Permission Group Management"}
      description={hideLayout ? undefined : "View and manage user permission groups"}
      actions={actions}
      sideActions={sideActions}
      filters={filters}
      filterColumnsPerRow={2}
    >
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        resetKey={`${searchQuery}-${statusFilter}-${government_structure_id}`}
      />
    </TableLayout>
  );
}
