"use client";

import { useState, useMemo } from "react";
import { DataTable } from "@/features/template/component/DataTable";
import { TableLayout } from "@/features/template/component/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, MoreHorizontal } from "lucide-react";

import { useGetRolesQuery } from "@/redux/api/roleApi";
import type { Role } from "@/redux/types/roles";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";
import { useDeleteRoleMutation } from "@/redux/api/roleApi";
import { toast } from "sonner";
import { useClientDataTable } from "@/hooks/useClientDataTable";

export default function RoleList() {
  const { data = [], isLoading, isError, refetch } = useGetRolesQuery();
  const [deleteRole] = useDeleteRoleMutation();
  const router = useRouter();

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Role Name",
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
        const role = row.original;
        const strength = role.strength ?? 0;
        const permissionCount = role.permission_count ?? 0;
        const totalPermissions = role.total_permissions ?? 0;

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
        const role = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/users/roles/${role.role_id}`)}
              title="Edit Role"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this role?")) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    toast.success("Role deleted successfully");
                    refetch();
                  } catch (err: any) {
                    toast.error(err?.data?.message || "Failed to delete role");
                  }
                }
              }}
              title="Delete Role"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  const [statusFilter, setStatusFilter] = useState("");

  const statusFilterFn = useMemo(
    () => (role: Role) => {
      if (statusFilter === "active") return role.is_active === true;
      if (statusFilter === "inactive") return role.is_active === false;
      return true;
    },
    [statusFilter]
  );

  const {
    paginated: paginatedData,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
  } = useClientDataTable(data, {
    searchKeys: ["name", "description", (r) => (r.is_active ? "active" : "inactive")],
    filterFn: statusFilterFn,
    resetDeps: [statusFilter],
  });

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
      label: "New Role",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: () => router.push("roles/new"),
    },
  ];

  return (
    <TableLayout
      title="Role Management"
      description="View and manage user roles"
      actions={actions}
      filters={filters}
      filterColumnsPerRow={2}
    >
      <DataTable
        columns={columns}
        data={paginatedData}
        totalPageCount={totalPageCount}
        handlePagination={handlePagination}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
      />
    </TableLayout>
  );
}
