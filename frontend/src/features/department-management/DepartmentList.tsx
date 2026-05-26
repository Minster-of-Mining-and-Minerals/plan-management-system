"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Edit, Eye, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import type { Department } from "@/redux/types/department";
import {
  useDeleteDepartmentMutation,
  useGetDepartmentsQuery,
  useToggleDepartmentStatusMutation,
} from "@/redux/api/departmentApi";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { DepartmentFormModal } from "./DepartmentFormModal";

export default function DepartmentList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } = useGetDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [toggleStatus] = useToggleDepartmentStatusMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: "name",
      header: "Department Name",
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => router.push(`/departments/${row.original.department_id}`)}
        >
          {row.getValue("name")}
        </button>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      id: "dept_head",
      header: "Department Head",
      cell: ({ row }) => row.original.dept_head_name || "—",
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
      cell: ({ row }) => new Date(row.getValue("created_at") as string).toLocaleDateString(),
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
              title="View"
              onClick={() => router.push(`/departments/${item.department_id}`)}
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit"
              onClick={() => {
                setEditDepartment(item);
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
                    id: item.department_id,
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
                if (!window.confirm(`Delete department "${item.name}"?`)) return;
                try {
                  await deleteDepartment(item.department_id).unwrap();
                  toast.success("Department deleted");
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
    () => (item: Department) => {
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
    searchKeys: ["name", "code", "slug", "dept_head_name", (d) => d.status],
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
      permissions: ["DEPARTMENTS:READ"],
      onClick: () => toast.message("Export coming soon"),
    },
    {
      label: "New Department",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: ["DEPARTMENTS:CREATE"],
      onClick: () => {
        setEditDepartment(null);
        setFormOpen(true);
      },
    },
  ];

  return (
    <>
      <TableLayout
        title="Department Management"
        description="Manage hospital departments for staff assignment and clinical modules"
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

      <DepartmentFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditDepartment(null);
          refetch();
        }}
        department={editDepartment}
      />
    </>
  );
}
