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
import { toast } from "sonner";

export interface PermissionGroupListProps {
  structure_id?: string;
  hideLayout?: boolean;
  sideActions?: ActionButton[];
}
export default function PermissionGroupList({ structure_id, hideLayout = false, sideActions }: PermissionGroupListProps) {
  const { data = [], isLoading, isError, refetch } = useGetPermissionGroupsQuery({ structure_id });
  const [deleteGroup] = useDeletePermissionGroupMutation();
  const router = useRouter();

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
      accessorKey: "strength",
      header: "Strength",
      cell: ({ row }) => {
        const group = row.original;
        const strength = group.strength ?? 0;
        const permissionCount = group.permission_count ?? 0;
        const totalPermissions = group.total_permissions ?? 0;

        const barColor =
          strength >= 75
            ? "bg-emerald-500"
            : strength >= 50
              ? "bg-blue-500"
              : strength >= 25
                ? "bg-amber-500"
                : "bg-slate-400";

        return (
          <div className="min-w-[140px] space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{permissionCount}/{totalPermissions} permissions</span>
              <span className="font-semibold text-foreground">{strength}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        );
      },
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
                if (window.confirm("Are you sure you want to delete this permission group?")) {
                  try {
                    await deleteGroup(group.permission_group_id).unwrap();
                    toast.success("Permission group deleted successfully");
                    refetch();
                  } catch (err: any) {
                    toast.error(err?.data?.message || "Failed to delete group");
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

  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState("");

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
  const actions: ActionButton[] = [
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

  // Apply filters locally (client-side)
  const filteredData = data.filter((group) => {
    if (statusFilter === "active") return group.is_active === true;
    if (statusFilter === "inactive") return group.is_active === false;
    return true;
  });

  // Pagination slice
  const paginatedData = filteredData.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  return (
    <TableLayout
      title={hideLayout ? undefined : "Permission Group Management"}
      description={hideLayout ? undefined : "View and manage user permission groups"}
      actions={actions}
      sideActions={sideActions}
      // filters={filters}
      filterColumnsPerRow={2}
    >
      <DataTable
        columns={columns}
        data={paginatedData}
        totalPageCount={Math.ceil(filteredData.length / pageSize)}
        handlePagination={handlePagination}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
        isLoading={isLoading}
      />
    </TableLayout>
  );
}
