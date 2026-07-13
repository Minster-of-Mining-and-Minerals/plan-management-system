"use client";

import { useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionButton } from "@/types/tableLayout";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useDeletePrescriptionDocumentTemplateMutation,
  useListPrescriptionDocumentTemplatesQuery,
} from "@/redux/api/prescriptionDocumentTemplateApi";
import type { PrescriptionDocumentTemplate } from "@/redux/types/prescriptionDocument";
import { PRESCRIPTION_CONFIG_PERMISSIONS } from "./prescriptionConfigPermissions";
import { formatStatus } from "@/utils/statusFormatter";

export function PrescriptionDocumentTemplateList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } =
    useListPrescriptionDocumentTemplatesQuery({ status: "active" });
  const [removeTemplate] = useDeletePrescriptionDocumentTemplateMutation();

  const { can } = usePermissions();
  const canCreate = can(PRESCRIPTION_CONFIG_PERMISSIONS.DOCUMENT_CREATE);
  const canUpdate = can(PRESCRIPTION_CONFIG_PERMISSIONS.DOCUMENT_UPDATE);
  const canDelete = can(PRESCRIPTION_CONFIG_PERMISSIONS.DOCUMENT_DELETE);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    router.push("/prescriptions/document-templates/new");
  }, [canCreate, router]);

  const openEdit = useCallback(
    (template: PrescriptionDocumentTemplate) => {
      if (!canUpdate) return;
      router.push(
        `/prescriptions/document-templates/${template.document_template_id}`
      );
    },
    [canUpdate, router]
  );

  const columns: ColumnDef<PrescriptionDocumentTemplate>[] = useMemo(
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
          <span className="font-mono text-sm">{row.original.code || "—"}</span>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name || "All categories",
      },
      {
        accessorKey: "is_default",
        header: "Default",
        cell: ({ row }) =>
          row.original.is_default ? (
            <Badge variant="default">Default</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUpdate}
              title={
                canUpdate
                  ? "Edit document template"
                  : "You do not have permission to edit document templates"
              }
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canDelete || row.original.is_default}
              title={
                row.original.is_default
                  ? "Default templates cannot be deactivated"
                  : canDelete
                    ? "Deactivate document template"
                    : "You do not have permission to deactivate document templates"
              }
              onClick={async () => {
                if (!canDelete || row.original.is_default) return;
                if (!confirm("Deactivate this document template?")) return;
                try {
                  await removeTemplate(row.original.document_template_id).unwrap();
                  toast.success("Document template deactivated");
                  refetch();
                } catch (e: unknown) {
                  const message =
                    e && typeof e === "object" && "data" in e
                      ? String((e as { data?: { message?: string } }).data?.message)
                      : "Delete failed";
                  toast.error(message);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, openEdit, refetch, removeTemplate]
  );

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code", (r) => r.category?.name || ""],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const actions: ActionButton[] = [
    {
      label: "New document template",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [PRESCRIPTION_CONFIG_PERMISSIONS.DOCUMENT_CREATE],
      onClick: openCreate,
    },
  ];

  return (
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
  );
}
