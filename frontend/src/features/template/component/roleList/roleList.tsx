"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, KeyRound } from "lucide-react";
import { Edit, Trash2 } from "lucide-react";

import { useGetRolesQuery, useDeleteRoleMutation } from "@/redux/api/roleApi";
import type { Role } from "@/redux/types/roles";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";
import { useStructureScope } from "@/hooks/useStructureScope";
import { withStructureQuery } from "@/utils/structureQueryUtils";
import {
  canDeleteRole,
  canEditRole,
  formatRoleScopeLabel,
} from "@/utils/roleScopeUtils";

export interface RoleListProps {
  government_structure_id?: string;
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
}

export default function RoleList({
  government_structure_id: propStructureId,
  hideLayout = false,
  sideActions,
  readOnly = false,
}: RoleListProps = {}) {
  const searchParams = useSearchParams();
  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
  const structureId =
    propStructureId ||
    searchParams.get("government_structure_id") ||
    sessionStructureId ||
    undefined;

  const { data = [], isLoading, refetch } = useGetRolesQuery(
    structureId
      ? { government_structure_id: structureId }
      : isSuperAdmin
        ? undefined
        : { government_structure_id: sessionStructureId || undefined },
    { skip: !isSuperAdmin && !structureId && !sessionStructureId }
  );

  const [deleteRole] = useDeleteRoleMutation();
  const router = useRouter();
  const searchQuery = searchParams.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("");

  const newRolePath = withStructureQuery("/users/roles/new", structureId);

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
      accessorKey: "scope",
      header: "Scope",
      cell: ({ row }) => {
        const scope = row.original.scope;
        const variant =
          scope === "global"
            ? "secondary"
            : scope === "private"
              ? "default"
              : "outline";
        return (
          <Badge variant={variant}>{formatRoleScopeLabel(scope)}</Badge>
        );
      },
    },
    {
      id: "permissions_count",
      header: "Assigned Permissions",
      cell: ({ row }) => {
        const role = row.original;
        const count =
          typeof role.permissions_count === "number"
            ? role.permissions_count
            : Array.isArray(role.rolePermissions)
            ? role.rolePermissions.filter((rp: any) => rp.is_active !== false).length
            : 0;
        return (
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {count} {count === 1 ? "permission" : "permissions"}
            </span>
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
        const editPath = withStructureQuery(`/users/roles/${role.role_id}`, structureId);
        const editable = canEditRole(role, isSuperAdmin, readOnly);
        const deletable = canDeleteRole(role, readOnly);

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(editPath)}
              title="Edit Role"
              disabled={!editable}
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!deletable}
              onClick={async () => {
                if (
                  await actionFeedback.confirm(
                    "Are you sure you want to delete this role?",
                    { destructive: true }
                  )
                ) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    actionFeedback.success("Role deleted successfully");
                    refetch();
                  } catch (err: unknown) {
                    const error = err as { data?: { message?: string } };
                    actionFeedback.error(
                      error?.data?.message || "Failed to delete role"
                    );
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
          label: "New Role",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => router.push(newRolePath),
        },
      ];

  const filteredData = data.filter((role) => {
    if (!matchesActiveInactiveFilter(statusFilter, role.is_active ?? false)) {
      return false;
    }
    return matchesSearchQuery(searchQuery, [role.name, role.description]);
  });

  return (
    <TableLayout
      title={hideLayout ? undefined : "Role Management"}
      description={
        hideLayout
          ? undefined
          : structureId
            ? "Roles available for this sector structure"
            : "View and manage user roles"
      }
      actions={actions}
      sideActions={sideActions}
      filters={filters}
      filterColumnsPerRow={2}
    >
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        resetKey={`${searchQuery}-${statusFilter}-${structureId}`}
      />
    </TableLayout>
  );
}
