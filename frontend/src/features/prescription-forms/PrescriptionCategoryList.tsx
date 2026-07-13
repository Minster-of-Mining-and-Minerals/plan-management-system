"use client";

import { useCallback, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionButton } from "@/types/tableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useCreatePrescriptionCategoryMutation,
  useListPrescriptionCategoriesQuery,
  useUpdatePrescriptionCategoryMutation,
} from "@/redux/api/prescriptionCategoryApi";
import type { PrescriptionCategory } from "@/redux/types/prescription";
import { PRESCRIPTION_CONFIG_PERMISSIONS } from "./prescriptionConfigPermissions";
import { formatStatus } from "@/utils/statusFormatter";

export function PrescriptionCategoryList() {
  const { data = [], isLoading, refetch } = useListPrescriptionCategoriesQuery();
  const [createCategory] = useCreatePrescriptionCategoryMutation();
  const [updateCategory] = useUpdatePrescriptionCategoryMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriptionCategory | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const { can } = usePermissions();
  const canCreate = can(PRESCRIPTION_CONFIG_PERMISSIONS.CATEGORY_CREATE);
  const canUpdate = can(PRESCRIPTION_CONFIG_PERMISSIONS.CATEGORY_UPDATE);

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setOpen(true);
  }, [canCreate]);

  const openEdit = useCallback(
    (category: PrescriptionCategory) => {
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

  const columns: ColumnDef<PrescriptionCategory>[] = useMemo(
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
        ),
      },
    ],
    [canUpdate, openEdit]
  );

  const actions: ActionButton[] = [
    {
      label: "New category",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [PRESCRIPTION_CONFIG_PERMISSIONS.CATEGORY_CREATE],
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
          categoryId: editing.category_id,
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
      <TableLayout actions={actions}>
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
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Code</Label>
              <Input
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
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
