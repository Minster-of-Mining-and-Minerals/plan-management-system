"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import {
  useDeletePrescriptionDocumentTemplateMutation,
  useListPrescriptionDocumentTemplatesQuery,
} from "@/redux/api/prescriptionDocumentTemplateApi";
import type { PrescriptionDocumentTemplate } from "@/redux/types/prescriptionDocument";

export function PrescriptionDocumentTemplateList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } =
    useListPrescriptionDocumentTemplatesQuery({ status: "active" });
  const [removeTemplate] = useDeletePrescriptionDocumentTemplateMutation();

  const columns: ColumnDef<PrescriptionDocumentTemplate>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "code", header: "Code" },
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(
                `/prescriptions/document-templates/${row.original.document_template_id}`
              )
            }
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={row.original.is_default}
            onClick={async () => {
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
  ];

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code", (r) => r.category?.name || ""],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => router.push("/prescriptions/document-templates/new")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New document template
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
    </div>
  );
}
