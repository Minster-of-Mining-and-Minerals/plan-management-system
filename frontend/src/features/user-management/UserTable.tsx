"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Eye } from "lucide-react";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
  useExportUsersMutation,
  useGetUsersQuery,
} from "@/redux/api/userApi";
import { User } from "@/redux/types/user";
import { CreateUserModal } from "@/components/common/modals/CreateUserModal";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  matchesActiveInactiveFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";
import { useStructureScope } from "@/hooks/useStructureScope";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { withStructureQuery } from "@/utils/structureQueryUtils";

const ALL_STRUCTURES_VALUE = "__all__";

export interface UserTableProps {
  sideActions?: ActionButton[];
  government_structure_node_id?: string;
  internal_structure_node_id?: string;
  readOnly?: boolean;
}

export default function UserTable({
  sideActions,
  government_structure_node_id,
  internal_structure_node_id,
  readOnly = false,
}: UserTableProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const queryStructureId = searchParams.get("government_structure_id") || "";
  const router = useRouter();
  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();

  const isEmbedded = Boolean(government_structure_node_id);
  const [structureFilter, setStructureFilter] = useState(
    government_structure_node_id || queryStructureId || sessionStructureId || ""
  );

  useEffect(() => {
    if (government_structure_node_id) {
      setStructureFilter(government_structure_node_id);
      return;
    }
    if (queryStructureId) {
      setStructureFilter(queryStructureId);
    }
  }, [government_structure_node_id, queryStructureId]);

  useEffect(() => {
    if (isEmbedded) return;
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("government_structure_id") || "";
    if ((structureFilter || "") === current) return;
    if (structureFilter) {
      params.set("government_structure_id", structureFilter);
    } else {
      params.delete("government_structure_id");
    }
    router.replace(`${window.location.pathname}?${params.toString()}`);
  }, [structureFilter, isEmbedded, router, searchParams]);

  const effectiveStructureId =
    government_structure_node_id || structureFilter || undefined;

  const { data: govStructures = [] } = useGetGovernmentStructuresQuery(
    { is_active: true },
    { skip: isEmbedded || !isSuperAdmin }
  );

  const structureNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const structure of govStructures) {
      if (structure.government_structure_id) {
        map.set(structure.government_structure_id, structure.name);
      }
    }
    return map;
  }, [govStructures]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue("full_name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div>{row.getValue("email")}</div>,
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      cell: ({ row }) => <div>{row.getValue("phone_number")}</div>,
    },
    ...(!isEmbedded && isSuperAdmin && !effectiveStructureId
      ? [
          {
            id: "structure",
            header: "Sector",
            cell: ({ row }: { row: { original: User } }) => (
              <div className="text-sm text-muted-foreground">
                {row.original.government_structure_id
                  ? structureNameById.get(row.original.government_structure_id) ||
                    "—"
                  : "—"}
              </div>
            ),
          } as ColumnDef<User>,
        ]
      : []),
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
        <div className="flex items-center">
          <Button
            onClick={() =>
              router.push(
                withStructureQuery(
                  `/users/list/${row.original.user_id}`,
                  effectiveStructureId
                )
              )
            }
            variant="ghost"
            size="icon"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const {
    data: users = [],
    isLoading,
  } = useGetUsersQuery(
    {
      government_structure_id: effectiveStructureId,
      internal_structure_id: internal_structure_node_id,
    },
    { skip: !isSuperAdmin && !effectiveStructureId }
  );

  const [exportUsers, { isLoading: exportLoading }] = useExportUsersMutation();
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

  const filteredData = users.filter((user) => {
    if (!matchesActiveInactiveFilter(statusFilter, user.is_active)) return false;
    return matchesSearchQuery(searchQuery, [
      user.full_name,
      user.email,
      user.phone_number,
    ]);
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
    ...(!isEmbedded && isSuperAdmin
      ? [
          {
            key: "government_structure_id",
            label: "Sector Structure",
            type: "select" as const,
            placeholder: "All structures",
            value: structureFilter || ALL_STRUCTURES_VALUE,
            onChange: (value: string) =>
              setStructureFilter(value === ALL_STRUCTURES_VALUE ? "" : value),
            options: [
              { label: "All structures", value: ALL_STRUCTURES_VALUE },
              ...govStructures.map((structure) => ({
                label: structure.name,
                value: structure.government_structure_id!,
              })),
            ],
          },
        ]
      : []),
  ];

  const actions: ActionButton[] = readOnly
    ? []
    : [
        {
          label: "Export",
          icon: <Download className="h-4 w-4" />,
          variant: "outline",
          loading: exportLoading,
          onClick: async () => {
            try {
              const blob = await exportUsers().unwrap();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "users.csv";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch (err) {
              console.error("Export failed", err);
            }
          },
        },
        {
          label: "New User",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => setModalOpen(true),
        },
      ];

  return (
    <>
      <TableLayout
        title={isEmbedded ? undefined : "User Management"}
        description={
          isEmbedded
            ? undefined
            : effectiveStructureId
              ? "Users in the selected sector structure"
              : "View and manage users"
        }
        actions={actions}
        sideActions={sideActions}
        filters={filters}
        filterColumnsPerRow={isSuperAdmin && !isEmbedded ? 2 : 1}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          resetKey={`${searchQuery}-${statusFilter}-${effectiveStructureId}-${internal_structure_node_id}`}
        />
      </TableLayout>
      {!readOnly && (
        <CreateUserModal
          government_structure_id={effectiveStructureId}
          internal_structure_id={internal_structure_node_id}
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
