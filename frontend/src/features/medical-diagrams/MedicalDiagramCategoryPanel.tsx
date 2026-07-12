"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useListMedicalDiagramCategoriesQuery,
  useCreateMedicalDiagramCategoryMutation,
  useUpdateMedicalDiagramCategoryMutation,
  useDeleteMedicalDiagramCategoryMutation,
  type MedicalDiagramCategory,
} from "@/redux/api/medicalDiagramCategoryApi";
import { useClientDataTable } from "@/hooks/useClientDataTable";

export function MedicalDiagramCategoryPanel() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalDiagramCategory | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const { data: categories = [], isLoading, refetch } =
    useListMedicalDiagramCategoriesQuery({
      include_inactive: includeInactive,
    });
  const [createCategory, { isLoading: creating }] =
    useCreateMedicalDiagramCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateMedicalDiagramCategoryMutation();
  const [deleteCategory] = useDeleteMedicalDiagramCategoryMutation();

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(categories, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setSortOrder(0);
    setStatus("active");
    setEditorOpen(true);
  };

  const openEdit = (row: MedicalDiagramCategory) => {
    setEditing(row);
    setName(row.name);
    setCode(row.code);
    setSortOrder(row.sort_order ?? 0);
    setStatus(row.status);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editing) {
        await updateCategory({
          categoryId: editing.category_id,
          body: {
            name: name.trim(),
            code: code.trim() || undefined,
            sort_order: sortOrder,
            status,
          },
        }).unwrap();
        toast.success("Category updated");
      } else {
        await createCategory({
          name: name.trim(),
          code: code.trim() || undefined,
          sort_order: sortOrder,
          status,
        }).unwrap();
        toast.success("Category created");
      }
      setEditorOpen(false);
      refetch();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message)
          : "Failed to save category";
      toast.error(message);
    }
  };

  const handleDelete = async (row: MedicalDiagramCategory) => {
    if (!confirm(`Remove category "${row.name}"?`)) return;
    try {
      const result = await deleteCategory(row.category_id).unwrap();
      toast.success(
        result.archived
          ? "Category deactivated (in use by diagrams)"
          : "Category deleted"
      );
      refetch();
    } catch {
      toast.error("Failed to remove category");
    }
  };

  const columns: ColumnDef<MedicalDiagramCategory>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <code className="text-xs">{row.original.code}</code>,
      },
      { accessorKey: "sort_order", header: "Order" },
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => handleDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure diagram categories here. They are not seeded — add the groups your
        hospital uses before assigning diagrams.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
            id="inactive-categories"
          />
          <Label htmlFor="inactive-categories">Show inactive</Label>
        </div>
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Code (optional)</Label>
              <Input
                value={code}
                disabled={Boolean(editing)}
                onChange={(e) => setCode(e.target.value)}
                placeholder="auto-generated from name"
              />
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating || updating} onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
