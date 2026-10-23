"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Shield, Building2, KeyRound } from "lucide-react";
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

export interface CompanyRoleListProps {
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
  basePath?: string;
  companyId?: string;
}

export default function CompanyRoleList({
  hideLayout = false,
  sideActions,
  readOnly = false,
  basePath,
  companyId: propCompanyId,
}: CompanyRoleListProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { can } = usePermissions();
  const { roles: userRoles } = useAuth();
  const isSuperAdmin = userRoles?.some((r: any) => String(r).toLowerCase() === "super admin");

  const [statusFilter, setStatusFilter] = useState("");
  const searchQuery = searchParams.get("search") || "";
  const activeCompanyId = propCompanyId || session?.user?.company_id;

  const { data = [], isLoading, refetch } = useGetRolesQuery({
    scope: "company",
    ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
  });

  const [deleteRole] = useDeleteRoleMutation();

  const newCompanyRolePath = basePath
    ? `${basePath}/new`
    : "/users/roles/new?scope=company";

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: "Company Role Name",
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
          <Building2 className="h-3 w-3" />
          Company
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
          ? `${basePath}/${role.role_id}`
          : `/users/roles/${role.role_id}?scope=company`;
        const editable = canEditRole(role, Boolean(isSuperAdmin), readOnly);
        const deletable = canDeleteRole(role, readOnly);

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(editPath)}
              title="Edit Company Role"
              disabled={!editable}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (
                  confirm(
                    `Are you sure you want to deactivate or delete the role "${role.name}"?`
                  )
                ) {
                  try {
                    await deleteRole(role.role_id).unwrap();
                    actionFeedback.success("Role removed successfully");
                    refetch();
                  } catch (error: any) {
                    actionFeedback.error(
                      error?.data?.message || "Failed to remove role"
                    );
                  }
                }
              }}
              title="Delete Company Role"
              disabled={!deletable}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const filterFields: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Status", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    ...(can("COMPANY_ROLES:CREATE") || can("COMPANY_ROLES:MANAGE")
      ? [
          {
            label: "Create Role",
            icon: <Plus className="h-4 w-4" />,
            variant: "default" as const,
            onClick: () => router.push(newCompanyRolePath),
          },
        ]
      : []),
    ...(sideActions || []),
  ];

  const filteredData = data.filter((role) => {
    const matchesSearch = matchesSearchQuery(searchQuery, [
      role.name,
      role.description,
      role.scope,
    ]);
    const matchesStatus = matchesActiveInactiveFilter(
      statusFilter,
      role.is_active
    );
    return matchesSearch && matchesStatus;
  });

  const content = (
    <DataTable
      columns={columns}
      data={filteredData}
      isLoading={isLoading}
    />
  );

  if (hideLayout) {
    return content;
  }

  return (
    <TableLayout
      title="Company Roles"
      description="Manage role templates and assign company permissions."
      filters={filterFields}
      actions={actions}
    >
      {content}
    </TableLayout>
  );
}
