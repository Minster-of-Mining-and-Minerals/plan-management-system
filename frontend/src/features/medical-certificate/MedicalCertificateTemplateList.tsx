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
  useDeleteMedicalCertificateTemplateMutation,
  useListMedicalCertificateTemplatesQuery,
} from "@/redux/api/medicalCertificateTemplateApi";
import type { MedicalCertificateTemplate } from "@/redux/types/medicalCertificate";

export function MedicalCertificateTemplateList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } =
    useListMedicalCertificateTemplatesQuery({ status: "active" });
  const [removeTemplate] = useDeleteMedicalCertificateTemplateMutation();

  const columns: ColumnDef<MedicalCertificateTemplate>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "code", header: "Code" },
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
                `/prescriptions/certificate-templates/${row.original.template_id}`
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
  ];

  const { paginated, totalPageCount, pageIndex, pageSize, handlePagination } =
    useClientDataTable(data, {
      searchKeys: ["name", "code"],
      sortFn: (a, b) => a.name.localeCompare(b.name),
    });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => router.push("/prescriptions/certificate-templates/new")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New template
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
