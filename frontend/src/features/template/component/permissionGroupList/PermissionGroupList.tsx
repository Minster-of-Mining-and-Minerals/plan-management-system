"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Edit, Trash2, Eye } from "lucide-react";

import { useGetPermissionGroupsQuery, useDeletePermissionGroupMutation } from "@/redux/api/permissionGroupApi";
import type { PermissionGroup } from "@/redux/types/permissionGroup";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useRouter } from "next/navigation";
import { actionFeedback } from "@/components/action-feedback";
import { useSearchParams } from "next/navigation";
import { matchesActiveInactiveFilter, matchesSearchQuery } from "@/utils/tableUtils";
import { useStructureScope } from "@/hooks/useStructureScope";
import { withStructureQuery } from "@/utils/structureQueryUtils";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PermissionGroupSectionConfig,
  STANDARD_PERMISSION_GROUP_CONFIG,
} from "./permissionGroupSectionConfig";

export interface PermissionGroupListProps {
  government_structure_id?: string;
  hideLayout?: boolean;
  sideActions?: ActionButton[];
  readOnly?: boolean;
  config?: PermissionGroupSectionConfig;
}

export default function PermissionGroupList({
  government_structure_id,
  hideLayout = false,
  sideActions,
  readOnly = false,
  config = STANDARD_PERMISSION_GROUP_CONFIG,
}: PermissionGroupListProps) {
  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
  const { can } = usePermissions();
  const structureId = government_structure_id || sessionStructureId || undefined;
  const canCreate = can(config.createPermission);
  const canUpdate = can(config.updatePermission);
  const canDelete = can(config.deletePermission);
  const effectiveReadOnly = readOnly || !canUpdate;

  const queryArgs = {
    ...(structureId ? { government_structure_id: structureId } : {}),
    group_kind: config.groupKind,
    ...(!structureId && isSuperAdmin ? {} : {}),
  };

  const { data = [], isLoading, isError, refetch } = useGetPermissionGroupsQuery(
    structureId || isSuperAdmin || sessionStructureId
      ? queryArgs
      : undefined,
    {
      skip: !isSuperAdmin && !structureId && !sessionStructureId,
    }
  );
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
        const viewPath = withStructureQuery(
          `${config.basePath}/${group.permission_group_id}`,
          structureId,
          { mode: "view" }
        );
        const editPath = withStructureQuery(
          `${config.basePath}/${group.permission_group_id}`,
          structureId
        );
        if (effectiveReadOnly) {
          return (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push(viewPath)}
              title="View Group"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push(editPath)}
              title="Edit Group"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            {canDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (
                    await actionFeedback.confirm(
                      "Are you sure you want to delete this permission group?",
                      { destructive: true }
                    )
                  ) {
                    try {
                      await deleteGroup({
                        id: group.permission_group_id,
                        government_structure_id: structureId,
                      }).unwrap();
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
            )}
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

  const actions: ActionButton[] =
    effectiveReadOnly || !canCreate
      ? []
      : [
          {
            label: "Export",
            icon: <Download className="h-4 w-4" />,
            variant: "outline",
            onClick: () => console.log("Export clicked"),
          },
          {
            label: config.groupKind === "special" ? "New Special Group" : "New Group",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () =>
              router.push(withStructureQuery(`${config.basePath}/new`, structureId)),
          },
        ];

  const filteredData = data.filter((group) => {
    if (!matchesActiveInactiveFilter(statusFilter, group.is_active)) return false;
    return matchesSearchQuery(searchQuery, [group.name, group.description]);
  });

  return (
    <TableLayout
      title={hideLayout ? undefined : config.listTitle}
      description={
        hideLayout
          ? undefined
          : structureId
            ? `Groups assigned to this sector structure`
            : config.listDescription
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
        resetKey={`${searchQuery}-${statusFilter}-${structureId}-${config.groupKind}`}
      />
    </TableLayout>
  );
}
