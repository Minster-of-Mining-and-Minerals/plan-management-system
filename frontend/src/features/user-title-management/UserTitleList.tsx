"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Edit, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import type { UserTitle } from "@/redux/types/userTitle";
import {
  useDeleteUserTitleMutation,
  useGetUserTitlesQuery,
  useToggleUserTitleStatusMutation,
} from "@/redux/api/userTitleApi";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { UserTitleFormModal } from "./UserTitleFormModal";

export default function UserTitleList() {
  const { data = [], isLoading, refetch } = useGetUserTitlesQuery();
  const [deleteUserTitle] = useDeleteUserTitleMutation();
  const [toggleStatus] = useToggleUserTitleStatusMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editTitle, setEditTitle] = useState<UserTitle | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const columns: ColumnDef<UserTitle>[] = [
    {
      accessorKey: "name",
      header: "Title Name",
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status === "active" ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) =>
        new Date(row.getValue("created_at") as string).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={() => {
                setEditTitle(item);
                setFormOpen(true);
              }}
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={item.status === "active" ? "Deactivate" : "Activate"}
              onClick={async () => {
                try {
                  await toggleStatus({
                    id: item.title_id,
                    status: item.status === "active" ? "inactive" : "active",
                  }).unwrap();
                  toast.success("Status updated");
                  refetch();
                } catch (err: unknown) {
                  const message =
                    err && typeof err === "object" && "data" in err
                      ? String((err as { data?: { message?: string } }).data?.message)
                      : "Failed to update status";
                  toast.error(message);
                }
              }}
            >
              {item.status === "active" ? (
                <ToggleRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Delete"
              onClick={async () => {
                if (!window.confirm(`Delete title "${item.name}"?`)) return;
                try {
                  await deleteUserTitle(item.title_id).unwrap();
                  toast.success("Title deleted");
                  refetch();
                } catch (err: unknown) {
                  const message =
                    err && typeof err === "object" && "data" in err
                      ? String((err as { data?: { message?: string } }).data?.message)
                      : "Failed to delete";
                  toast.error(message);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  const statusFilterFn = useMemo(
    () => (item: UserTitle) => {
      if (statusFilter === "active") return item.status === "active";
      if (statusFilter === "inactive") return item.status === "inactive";
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
    searchKeys: ["name", "code", (t) => t.status],
    filterFn: statusFilterFn,
    resetDeps: [statusFilter],
  });

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Filter by status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      variant: "outline",
      permissions: ["USER_TITLES:READ"],
      onClick: () => toast.message("Export coming soon"),
    },
    {
      label: "New Title",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: ["USER_TITLES:CREATE"],
      onClick: () => {
        setEditTitle(null);
        setFormOpen(true);
      },
    },
  ];

  return (
    <>
      <TableLayout
        title="User Title Management"
        description="Standardize professional titles for internal hospital staff"
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
          isLoading={isLoading}
        />
      </TableLayout>

      <UserTitleFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTitle(null);
          refetch();
        }}
        userTitle={editTitle}
      />
    </>
  );
}
