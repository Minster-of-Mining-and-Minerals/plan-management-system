"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  useGetFormFieldsQuery,
  useDeleteFormFieldMutation,
  useReorderFormFieldsMutation,
} from "@/redux/api/formFieldApi";
import type { FormField } from "@/redux/types/formField";
import { CORE_USER_FIELD_KEYS } from "@/redux/types/formField";
import { FormFieldFormModal } from "./FormFieldFormModal";
import { toast } from "sonner";

export default function FormFieldList() {
  const { data: fields = [], isLoading, refetch } = useGetFormFieldsQuery({
    model: "User",
  });
  const [deleteField] = useDeleteFormFieldMutation();
  const [reorderFields] = useReorderFormFieldsMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const sorted = useMemo(
    () => [...fields].sort((a, b) => a.sort_order - b.sort_order),
    [fields]
  );

  const isCoreField = (f: FormField) =>
    f.storage_type === "core" ||
    (CORE_USER_FIELD_KEYS as readonly string[]).includes(f.field_key);

  const moveField = async (fieldId: string, direction: -1 | 1) => {
    const field = sorted.find((f) => f.field_id === fieldId);
    if (field && isCoreField(field)) return;

    const index = sorted.findIndex((f) => f.field_id === fieldId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    try {
      await reorderFields({
        model_name: "User",
        field_ids: next.map((f) => f.field_id),
      }).unwrap();
      refetch();
    } catch {
      toast.error("Failed to reorder");
    }
  };

  const columns: ColumnDef<FormField>[] = [
    {
      accessorKey: "sort_order",
      header: "Order",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className="w-6 text-center">{row.original.sort_order}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveField(row.original.field_id, -1)}
            disabled={row.index === 0 || isCoreField(row.original)}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => moveField(row.original.field_id, 1)}
            disabled={
              row.index === sorted.length - 1 || isCoreField(row.original)
            }
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    { accessorKey: "label", header: "Label" },
    { accessorKey: "field_key", header: "Key" },
    {
      accessorKey: "storage_type",
      header: "Storage",
      cell: ({ row }) => (
        <Badge variant={row.original.storage_type === "core" ? "default" : "outline"}>
          {row.original.storage_type}
        </Badge>
      ),
    },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "field_type", header: "Type" },
    {
      accessorKey: "is_required",
      header: "Required",
      cell: ({ row }) => (
        <Badge variant={row.original.is_required ? "default" : "secondary"}>
          {row.original.is_required ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_visible",
      header: "Visible",
      cell: ({ row }) => (
        <Badge variant={row.original.is_visible ? "default" : "outline"}>
          {row.original.is_visible ? "Yes" : "Hidden"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingField(row.original);
              setModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!isCoreField(row.original) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!confirm("Delete this field configuration?")) return;
                try {
                  await deleteField(row.original.field_id).unwrap();
                  toast.success("Field deleted");
                } catch (err: any) {
                  toast.error(err?.data?.message || "Delete failed");
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <TableLayout
        title="Configure User Forms"
        description="Full name, email, and phone are required core fields (seeded automatically). Add custom fields below for demographics, medical info, etc."
        actions={[
          {
            label: "Add custom field",
            icon: <Plus className="h-4 w-4" />,
            variant: "default",
            onClick: () => {
              setEditingField(null);
              setModalOpen(true);
            },
          },
        ]}
      >
        <DataTable
          columns={columns}
          data={sorted}
          isLoading={isLoading}
          totalPageCount={1}
          handlePagination={() => {}}
          tablePageSize={sorted.length || 10}
          currentIndex={0}
        />
      </TableLayout>

      <FormFieldFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingField(null);
        }}
        field={editingField}
      />
    </>
  );
}
