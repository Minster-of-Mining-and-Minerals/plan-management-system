"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, MoreHorizontal } from "lucide-react";

import { useGetRolesQuery } from "@/redux/api/roleApi";
import type { Role } from "@/redux/types/auth";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter } from "next/navigation";
import { Edit, Trash2 } from "lucide-react";
import { useDeleteRoleMutation } from "@/redux/api/roleApi";
import { actionFeedback } from "@/components/action-feedback";
import { useSearchParams } from "next/navigation";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";

export default function RoleList() {
  const { data = [], isLoading, isError, refetch } = useGetRolesQuery();
  const [deleteRole] = useDeleteRoleMutation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

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
                if (await actionFeedback.confirm("Are you sure you want to delete this role?", { destructive: true })) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    actionFeedback.success("Role deleted successfully");
                    refetch();
                  } catch (err: any) {
                    actionFeedback.error(err?.data?.message || "Failed to delete role");
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

  // Filters

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

  const filteredData = data.filter((role) => {
    if (!matchesActiveInactiveFilter(statusFilter, role.is_active)) return false;
    return matchesSearchQuery(searchQuery, [role.name, role.description]);
  });

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
        data={filteredData}
        isLoading={isLoading}
        resetKey={`${searchQuery}-${statusFilter}`}
      />
    </TableLayout>
  );
}
