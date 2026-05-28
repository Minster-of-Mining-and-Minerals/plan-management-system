"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
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
import { useClientDataTable } from "@/hooks/useClientDataTable";
import {
  useCreatePrescriptionCategoryMutation,
  useListPrescriptionCategoriesQuery,
  useUpdatePrescriptionCategoryMutation,
} from "@/redux/api/prescriptionCategoryApi";
import type { PrescriptionCategory } from "@/redux/types/prescription";

export function PrescriptionCategoryList() {
  const { data = [], isLoading, refetch } = useListPrescriptionCategoriesQuery();
  const [createCategory] = useCreatePrescriptionCategoryMutation();
  const [updateCategory] = useUpdatePrescriptionCategoryMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriptionCategory | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const columns: ColumnDef<PrescriptionCategory>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditing(row.original);
            setForm({
              name: row.original.name,
              code: row.original.code,
              description: row.original.description || "",
            });
            setOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setOpen(true);
  };

  const handleSubmit = async () => {
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New category
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <DataTable
          columns={columns}
          data={paginated}
          isLoading={isLoading}
          totalPageCount={totalPageCount}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
        />
      </div>

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
            <Button onClick={handleSubmit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
