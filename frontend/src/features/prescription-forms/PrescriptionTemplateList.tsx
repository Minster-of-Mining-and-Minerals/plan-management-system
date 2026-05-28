"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import {
  useArchivePrescriptionTemplateMutation,
  useListPrescriptionTemplatesQuery,
} from "@/redux/api/prescriptionTemplateApi";
import type { PrescriptionTemplate } from "@/redux/types/prescription";
import { PrescriptionTemplateModal } from "./PrescriptionTemplateModal";

export function PrescriptionTemplateList() {
  const { data = [], isLoading, refetch } = useListPrescriptionTemplatesQuery({
    include_archived: false,
  });
  const [archiveTemplate] = useArchivePrescriptionTemplateMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrescriptionTemplate | null>(null);

  const columns: ColumnDef<PrescriptionTemplate>[] = [
    { accessorKey: "name", header: "Name" },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "—",
    },
    { accessorKey: "code", header: "Code" },
    {
      id: "signature",
      header: "Signature type",
      cell: ({ row }) =>
        row.original.has_template_signature ? "Template" : "None",
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
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
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
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
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
      <PrescriptionTemplateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSaved={() => refetch()}
      />
    </div>
  );
}
