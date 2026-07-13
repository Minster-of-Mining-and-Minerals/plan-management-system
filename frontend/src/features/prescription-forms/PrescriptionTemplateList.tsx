"use client";

import { useCallback, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionButton } from "@/types/tableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useArchivePrescriptionTemplateMutation,
  useListPrescriptionTemplatesQuery,
} from "@/redux/api/prescriptionTemplateApi";
import type { PrescriptionTemplate } from "@/redux/types/prescription";
import { PrescriptionTemplateModal } from "./PrescriptionTemplateModal";
import { PRESCRIPTION_CONFIG_PERMISSIONS } from "./prescriptionConfigPermissions";
import { formatStatus } from "@/utils/statusFormatter";

export function PrescriptionTemplateList() {
  const { data = [], isLoading, refetch } = useListPrescriptionTemplatesQuery({
    include_archived: false,
  });
  const [archiveTemplate] = useArchivePrescriptionTemplateMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriptionTemplate | null>(null);

  const { can } = usePermissions();
  const canCreate = can(PRESCRIPTION_CONFIG_PERMISSIONS.TEMPLATE_CREATE);
  const canUpdate = can(PRESCRIPTION_CONFIG_PERMISSIONS.TEMPLATE_UPDATE);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setEditing(null);
    setModalOpen(true);
  }, [canCreate]);

  const openEdit = useCallback(
    (template: PrescriptionTemplate) => {
      if (!canUpdate) return;
      setEditing(template);
      setModalOpen(true);
    },
    [canUpdate]
  );

  const columns: ColumnDef<PrescriptionTemplate>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.name}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name || "—",
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code || "—"}</span>
        ),
      },
      {
        id: "signature",
        header: "Signature type",
        cell: ({ row }) =>
          row.original.has_template_signature ? "Template" : "None",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.status === "active";
          return (
            <Badge variant={isActive ? "default" : "secondary"}>
              {formatStatus(isActive ? "Active" : "Archived")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) =>
          row.original.created_at
            ? new Date(row.original.created_at).toLocaleDateString()
            : "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUpdate}
              title={
                canUpdate
                  ? "Edit template"
                  : "You do not have permission to edit templates"
              }
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUpdate}
              title={
                canUpdate
                  ? "Archive template"
                  : "You do not have permission to archive templates"
              }
              onClick={async () => {
                if (!canUpdate) return;
                if (!confirm("Archive this template?")) return;
                try {
                  await archiveTemplate(row.original.template_id).unwrap();
                  toast.success("Archived");
                  refetch();
                } catch {
                  toast.error("Archive failed");
                }
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [archiveTemplate, canUpdate, openEdit, refetch]
  );

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code", (r) => r.category?.name || ""],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const actions: ActionButton[] = [
    {
      label: "New template",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [PRESCRIPTION_CONFIG_PERMISSIONS.TEMPLATE_CREATE],
      onClick: openCreate,
    },
  ];

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
      <PrescriptionTemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSaved={() => refetch()}
      />
    </>
  );
}
