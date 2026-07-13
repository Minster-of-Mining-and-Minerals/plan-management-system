"use client";

import { useCallback, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import {
  useCreateBillingServiceCategoryMutation,
  useListBillingServiceCategoriesQuery,
  useUpdateBillingServiceCategoryMutation,
} from "@/redux/api/billingServiceApi";
import type { BillingServiceCategory } from "@/redux/types/billing";
import { BILLING_PERMISSIONS } from "./billingUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { formatStatus } from "@/utils/statusFormatter";

export function BillingServiceCategoryList() {
  const { data = [], isLoading, refetch } = useListBillingServiceCategoriesQuery();
  const [createCategory] = useCreateBillingServiceCategoryMutation();
  const [updateCategory] = useUpdateBillingServiceCategoryMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillingServiceCategory | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [statusFilter, setStatusFilter] = useState("");

  const { can } = usePermissions();
  const canCreate = can(BILLING_PERMISSIONS.CATEGORY_CREATE);
  const canUpdate = can(BILLING_PERMISSIONS.CATEGORY_UPDATE);

  const filteredByStatus = useMemo(() => {
    if (!statusFilter) return data;
    return data.filter((row) => row.status === statusFilter);
  }, [data, statusFilter]);

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(filteredByStatus, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
      resetDeps: [statusFilter],
    });

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setOpen(true);
  }, [canCreate]);

  const openEdit = useCallback(
    (category: BillingServiceCategory) => {
      if (!canUpdate) return;
      setEditing(category);
      setForm({
        name: category.name,
        code: category.code,
        description: category.description || "",
      });
      setOpen(true);
    },
    [canUpdate]
  );

  const columns: ColumnDef<BillingServiceCategory>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.status === "active";
          return (
            <Badge variant={isActive ? "default" : "secondary"}>
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
              variant="ghost"
              size="icon"
              disabled={!canUpdate}
              title={
                canUpdate
                  ? "Edit category"
                  : "You do not have permission to edit categories"
              }
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [canUpdate, openEdit]
  );

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

  const actions: ActionButton[] = [
    {
      label: "New category",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [BILLING_PERMISSIONS.CATEGORY_CREATE],
      onClick: openCreate,
    },
  ];

  const handleSubmit = async () => {
    if (editing && !canUpdate) {
      toast.error("You do not have permission to update categories");
      return;
    }
    if (!editing && !canCreate) {
      toast.error("You do not have permission to create categories");
      return;
    }

    try {
      if (editing) {
        await updateCategory({
          id: editing.category_id,
          body: form,
        }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory(form).unwrap();
        toast.success("Category created");
      }
      setOpen(false);
      refetch();
    } catch {
      toast.error("Save failed");
    }
  };

  return (
    <>
      <TableLayout actions={actions} filters={filters} filterColumnsPerRow={1}>
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          totalPageCount={totalPageCount}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
        />
      </TableLayout>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                className="mt-1"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                className="mt-1"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <Button onClick={handleSubmit} disabled={editing ? !canUpdate : !canCreate}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
