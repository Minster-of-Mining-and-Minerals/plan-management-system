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
  useDeleteMedicalCertificateTemplateMutation,
  useListMedicalCertificateTemplatesQuery,
} from "@/redux/api/medicalCertificateTemplateApi";
import type { MedicalCertificateTemplate } from "@/redux/types/medicalCertificate";
import { PRESCRIPTION_CONFIG_PERMISSIONS } from "@/features/prescription-forms/prescriptionConfigPermissions";
import { formatStatus } from "@/utils/statusFormatter";

export function MedicalCertificateTemplateList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } =
    useListMedicalCertificateTemplatesQuery({ status: "active" });
  const [removeTemplate] = useDeleteMedicalCertificateTemplateMutation();

  const { can } = usePermissions();
  const canCreate = can(PRESCRIPTION_CONFIG_PERMISSIONS.CERTIFICATE_CREATE);
  const canUpdate = can(PRESCRIPTION_CONFIG_PERMISSIONS.CERTIFICATE_UPDATE);
  const canDelete = can(PRESCRIPTION_CONFIG_PERMISSIONS.CERTIFICATE_DELETE);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    router.push("/prescriptions/certificate-templates/new");
  }, [canCreate, router]);

  const openEdit = useCallback(
    (template: MedicalCertificateTemplate) => {
      if (!canUpdate) return;
      router.push(
        `/prescriptions/certificate-templates/${template.template_id}`
      );
    },
    [canUpdate, router]
  );

  const columns: ColumnDef<MedicalCertificateTemplate>[] = useMemo(
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
                  ? "Edit certificate template"
                  : "You do not have permission to edit certificate templates"
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
                  ? "Default templates cannot be archived"
                  : canDelete
                    ? "Archive certificate template"
                    : "You do not have permission to archive certificate templates"
              }
              onClick={async () => {
                if (!canDelete || row.original.is_default) return;
                try {
                  await removeTemplate(row.original.template_id).unwrap();
                  toast.success("Template archived");
                  refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [canDelete, canUpdate, openEdit, refetch, removeTemplate]
  );

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const actions: ActionButton[] = [
    {
      label: "New template",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [PRESCRIPTION_CONFIG_PERMISSIONS.CERTIFICATE_CREATE],
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
