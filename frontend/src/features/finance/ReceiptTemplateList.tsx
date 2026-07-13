"use client";

import { useCallback, useMemo, useState } from "react";
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
  useDeleteReceiptTemplateMutation,
  useListReceiptTemplatesQuery,
} from "@/redux/api/receiptTemplateApi";
import type { ReceiptTemplate } from "@/redux/api/receiptTemplateApi";
import { CASHIER_PERMISSIONS } from "@/features/cashier/cashierUtils";
import { formatStatus } from "@/utils/statusFormatter";

export function ReceiptTemplateList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } = useListReceiptTemplatesQuery({
    status: "active",
  });
  const [removeTemplate] = useDeleteReceiptTemplateMutation();

  const { can } = usePermissions();
  const canCreate = can(CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_CREATE);
  const canUpdate = can(CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_UPDATE);
  const canDelete = can(CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_DELETE);

  const openCreate = useCallback(() => {
    if (!canCreate) return;
    router.push("/finance/receipt-templates/new");
  }, [canCreate, router]);

  const openEdit = useCallback(
    (template: ReceiptTemplate) => {
      if (!canUpdate) return;
      router.push(`/finance/receipt-templates/${template.template_id}`);
    },
    [canUpdate, router]
  );

  const columns: ColumnDef<ReceiptTemplate>[] = useMemo(
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
                canUpdate ? "Edit template" : "You do not have permission to edit"
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
                  ? "Default template cannot be deleted"
                  : canDelete
                    ? "Deactivate template"
                    : "You do not have permission to delete"
              }
              onClick={async () => {
                if (!canDelete || row.original.is_default) return;
                try {
                  await removeTemplate(row.original.template_id).unwrap();
                  toast.success("Template deactivated");
                  refetch();
                } catch {
                  toast.error("Delete failed");
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
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  const actions: ActionButton[] = [
    {
      label: "New receipt template",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [CASHIER_PERMISSIONS.RECEIPT_TEMPLATE_CREATE],
      onClick: openCreate,
    },
  ];

  return (
    <TableLayout
      title="Receipt templates"
      description="Configure printable payment receipt layouts used at the cashier desk."
      actions={actions}
    >
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
