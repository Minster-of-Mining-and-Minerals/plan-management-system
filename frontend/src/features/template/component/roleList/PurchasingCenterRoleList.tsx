"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Shield, Store, KeyRound } from "lucide-react";
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

export interface PurchasingCenterRoleListProps {
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
  basePath?: string;
  purchasingCenterId?: string;
}

export default function PurchasingCenterRoleList({
  hideLayout = false,
  sideActions,
  readOnly = false,
  basePath,
  purchasingCenterId: propCenterId,
}: PurchasingCenterRoleListProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r) => String(r).toLowerCase() === "super admin");

  const [statusFilter, setStatusFilter] = useState("");
  const searchQuery = searchParams.get("search") || "";
  const sessionUser = session?.user as (Record<string, unknown> & { purchasing_center_id?: string }) | undefined;
  const activeCenterId = propCenterId || sessionUser?.purchasing_center_id;

  const { data = [], isLoading, refetch } = useGetRolesQuery({
    scope: "purchasing_center",
    ...(activeCenterId ? { purchasing_center_id: activeCenterId } : {}),
  });

  const [deleteRole] = useDeleteRoleMutation();

  const newRolePath = basePath
    ? `${basePath}/users/roles/new`
    : "/users/roles/new?scope=purchasing_center";

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Center Role Name",
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          <Store className="h-3 w-3" />
          Purchasing Center
        </span>
      ),
    },
    {
      id: "permissions_count",
      header: "Assigned Permissions",
      cell: ({ row }) => {
        const role = row.original;
        const count = role.rolePermissions?.length ?? 0;
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
          ? `${basePath}/users/roles/${role.role_id}`
          : `/users/roles/${role.role_id}?scope=purchasing_center`;
        const editable = canEditRole(role, Boolean(isSuperAdmin), readOnly);
        const deletable = canDeleteRole(role, readOnly);

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(editPath)}
              title="Edit Purchasing Center Role"
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
                    `Are you sure you want to delete the purchasing center role "${role.name}"?`,
                    { destructive: true }
                  )
                ) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    actionFeedback.success("Purchasing center role deleted successfully");
                    refetch();
                  } catch (err: unknown) {
                    const error = err as { data?: { message?: string } };
                    actionFeedback.error(
                      error?.data?.message || "Failed to delete purchasing center role"
                    );
                  }
                }
              }}
              title={deletable ? "Delete Center Role" : "Protected System Role"}
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

  const filteredData = data.filter((role) => {
    if (!matchesActiveInactiveFilter(statusFilter, role.is_active ?? false)) {
      return false;
    }
    return matchesSearchQuery(searchQuery, [role.name, role.description]);
  });

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "Filter by status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Statuses", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const canCreate = (can("PURCHASING_CENTER_ROLES:CREATE") || can("PURCHASING_CENTER_ROLES:MANAGE") || isSuperAdmin) && !readOnly;

  const actions: ActionButton[] = canCreate
    ? [
        {
          label: "New Center Role",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => router.push(newRolePath),
        },
      ]
    : [];

  if (hideLayout) {
    return (
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
      />
    );
  }

  return (
    <TableLayout
      title="Purchasing Center Roles"
      description="Manage role definitions and authorization profiles scoped strictly to this purchasing center."
      filters={filters}
      filterColumnsPerRow={2}
      actions={actions}
      sideActions={sideActions}
      showSearch={true}
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
