"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Eye } from "lucide-react";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
  useExportUsersMutation,
  useGetUsersQuery,
} from "@/redux/api/userApi";
import { User } from "@/redux/types/user";
import { CreateUserModal } from "@/components/common/modals/CreateUserModal";
import { formatStatus } from "@/utils/statusFormatter";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  matchesActiveInactiveFilter,
  matchesSearchQuery,
} from "@/utils/tableUtils";

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
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

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
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge className="text-white" status={isActive ? "active" : "inactive"}>
            {formatStatus(isActive ? "Active" : "Inactive")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Button
            onClick={() => router.push(`/users/list/${row.original.user_id}`)}
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
  } = useGetUsersQuery({
    government_structure_id: government_structure_node_id,
    internal_structure_id: internal_structure_node_id,
  });

  const [exportUsers, { isLoading: exportLoading }] = useExportUsersMutation();

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
        actions={actions}
        sideActions={sideActions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          resetKey={`${searchQuery}-${statusFilter}-${government_structure_node_id}-${internal_structure_node_id}`}
        />
      </TableLayout>
      {!readOnly && (
        <CreateUserModal
          government_structure_id={government_structure_node_id}
          internal_structure_id={internal_structure_node_id}
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
