"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
  useGetFormFieldGroupsQuery,
  useDeleteFormFieldGroupMutation,
  useReorderFormFieldGroupsMutation,
} from "@/redux/api/formFieldGroupApi";
import type { FormFieldGroup } from "@/redux/types/formFieldGroup";
import { FormFieldGroupModal } from "./FormFieldGroupModal";
import { toast } from "sonner";
import { useClientDataTable } from "@/hooks/useClientDataTable";

const ACCOUNT_TITLE = "Account";

interface FormFieldGroupListProps {
  embedded?: boolean;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
}

export default function FormFieldGroupList({
  embedded = false,
  modalOpen: controlledModalOpen,
  onModalOpenChange,
}: FormFieldGroupListProps) {
  const { data: groups = [], isLoading, refetch } = useGetFormFieldGroupsQuery({
    model: "Patient",
  });
  const [deleteGroup] = useDeleteFormFieldGroupMutation();
  const [reorderGroups] = useReorderFormFieldGroupsMutation();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const modalOpen = controlledModalOpen ?? internalModalOpen;
  const setModalOpen = onModalOpenChange ?? setInternalModalOpen;

  const [editing, setEditing] = useState<FormFieldGroup | null>(null);

  const sortedAll = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups]
  );

  const {
    paginated,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
    totalCount,
  } = useClientDataTable(sortedAll, {
    searchKeys: [
      "title",
      "description",
      (g) => g.fields?.length,
      (g) => (g.is_required_step ? "required" : "optional"),
      (g) => (g.is_visible ? "visible" : "hidden"),
    ],
    sortFn: (a, b) => a.sort_order - b.sort_order,
  });

  const isSystemGroup = (g: FormFieldGroup) => g.title === ACCOUNT_TITLE;

  const moveGroup = async (groupId: string, direction: -1 | 1) => {
    const g = sortedAll.find((x) => x.group_id === groupId);
    if (g && isSystemGroup(g)) return;

    const index = sortedAll.findIndex((x) => x.group_id === groupId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= sortedAll.length) return;
    const next = [...sortedAll];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    try {
      await reorderGroups({
        model_name: "Patient",
        group_ids: next.map((x) => x.group_id),
      }).unwrap();
      refetch();
    } catch {
      toast.error("Failed to reorder groups");
    }
  };

  const columns: ColumnDef<FormFieldGroup>[] = [
    {
      accessorKey: "sort_order",
      header: "Order",
      cell: ({ row }) => {
        const globalIndex = sortedAll.findIndex(
          (g) => g.group_id === row.original.group_id
        );
        return (
          <div className="flex items-center gap-1">
            <span className="w-6 text-center">{row.original.sort_order}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => moveGroup(row.original.group_id, -1)}
              disabled={globalIndex <= 0 || isSystemGroup(row.original)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => moveGroup(row.original.group_id, 1)}
              disabled={
                globalIndex < 0 ||
                globalIndex >= sortedAll.length - 1 ||
                isSystemGroup(row.original)
              }
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    { accessorKey: "title", header: "Step title" },
    {
      accessorKey: "fields",
      header: "Fields",
      cell: ({ row }) => row.original.fields?.length ?? 0,
    },
    {
      accessorKey: "is_required_step",
      header: "Step type",
      cell: ({ row }) => (
        <Badge variant={row.original.is_required_step ? "default" : "outline"}>
          {row.original.is_required_step ? "Required" : "Optional"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_visible",
      header: "Visible",
      cell: ({ row }) => (
        <Badge variant={row.original.is_visible ? "default" : "secondary"}>
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
              setEditing(row.original);
              setModalOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!isSystemGroup(row.original) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!confirm("Delete this form step?")) return;
                try {
                  await deleteGroup(row.original.group_id).unwrap();
                  toast.success("Group deleted");
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
      {embedded && (
        <p className="text-xs text-muted-foreground mb-3">
          {totalCount} step{totalCount === 1 ? "" : "s"}
          {totalCount !== sortedAll.length
            ? ` (filtered from ${sortedAll.length})`
            : ""}
        </p>
      )}

      <div className="rounded-lg border border-section-accent/15 overflow-hidden">
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

      <FormFieldGroupModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        group={editing}
      />
    </>
  );
}
