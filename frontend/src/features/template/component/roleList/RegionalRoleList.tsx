"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Shield, MapPin, KeyRound } from "lucide-react";
import { useGetRolesQuery, useDeleteRoleMutation } from "@/redux/api/roleApi";
import type { Role } from "@/redux/types/roles";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";
import { canDeleteRole, canEditRole } from "@/utils/roleScopeUtils";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";

export interface RegionalRoleListProps {
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
  basePath?: string;
  regionId?: string;
}

export default function RegionalRoleList({
  hideLayout = false,
  sideActions,
  readOnly = false,
  basePath,
  regionId: propRegionId,
}: RegionalRoleListProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r: any) => String(r).toLowerCase() === "super admin");

  const [statusFilter, setStatusFilter] = useState("");
  const searchQuery = searchParams.get("search") || "";
  const activeRegionId = propRegionId || session?.user?.region_id;

  const { data = [], isLoading, refetch } = useGetRolesQuery({
    scope: "regional",
    ...(activeRegionId ? { region_id: activeRegionId } : {}),
  });

  const [deleteRole] = useDeleteRoleMutation();

  const newRegionalRolePath = basePath
    ? basePath.endsWith("/users/roles")
      ? `${basePath}/new`
      : `${basePath}/users/roles/new`
    : "/users/roles/new?scope=regional";

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Regional Role Name",
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <span className="font-semibold text-foreground hover:text-primary transition-colors">
                {role.name}
              </span>
              {role.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {role.description}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "scope",
      header: "Domain / Scope",
      cell: () => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
          <MapPin className="h-3 w-3" />
          Regional
        </span>
      ),
    },
    {
      id: "permissions_count",
      header: "Assigned Permissions",
      cell: ({ row }) => {
        const role = row.original;
        const activePerms = (role.rolePermissions ?? []).filter((rp: any) => rp.is_active);
        const count = activePerms.length;
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
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const role = row.original;
        const editPath = basePath
          ? basePath.endsWith("/users/roles")
            ? `${basePath}/${role.role_id}`
            : `${basePath}/users/roles/${role.role_id}`
          : `/users/roles/${role.role_id}?scope=regional`;
        const editable = canEditRole(role, Boolean(isSuperAdmin), readOnly);
        const deletable = canDeleteRole(role, readOnly);

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(editPath)}
              title="Edit Regional Role"
              disabled={!editable}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Role</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!deletable}
              onClick={async () => {
                if (
                  await actionFeedback.confirm(
                    `Are you sure you want to delete the regional role "${role.name}"?`,
                    { destructive: true }
                  )
                ) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    actionFeedback.success("Regional role deleted successfully");
                    refetch();
                  } catch (err: unknown) {
                    const error = err as { data?: { message?: string } };
                    actionFeedback.error(
                      error?.data?.message || "Failed to delete regional role"
                    );
                  }
                }
              }}
              title={deletable ? "Delete Regional Role" : "Protected System Role"}
              className={deletable ? "hover:bg-destructive/10 hover:text-destructive" : "opacity-40"}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="sr-only">Delete Role</span>
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

  const canCreate = can("REGIONAL_ROLES:CREATE") || can("REGIONAL_ROLES:MANAGE") || isSuperAdmin;

  const actions: ActionButton[] = readOnly || !canCreate
    ? []
    : [
        {
          label: "New Regional Role",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => router.push(newRegionalRolePath),
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
      title={hideLayout ? undefined : "Regional Role Management"}
      description={
        hideLayout
          ? undefined
          : "Administer regional roles, security scopes, and permissions granted to regional staff accounts."
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
        resetKey={`${searchQuery}-${statusFilter}`}
      />
    </TableLayout>
  );
}
