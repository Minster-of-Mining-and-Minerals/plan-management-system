"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import type { SystemBranding } from "@/redux/types/branding";
import {
  useGetBrandingListQuery,
  useDeleteBrandingMutation,
  useActivateBrandingMutation,
} from "@/redux/api/brandingApi";

export default function BrandingList() {
  const { data = [], isLoading, refetch } = useGetBrandingListQuery();
  const [deleteBranding] = useDeleteBrandingMutation();
  const [activateBranding] = useActivateBrandingMutation();
  const router = useRouter();

  const columns: ColumnDef<SystemBranding>[] = [
    {
      accessorKey: "logo_url",
      header: "Logo",
      cell: ({ row }) => (
        <Image
          src={row.original.logo_url}
          alt={row.original.system_name}
          width={40}
          height={40}
          className="rounded-md object-contain"
          unoptimized={row.original.logo_url.startsWith("http")}
        />
      ),
    },
    {
      accessorKey: "system_name",
      header: "System Name",
      cell: ({ row }) => (
        <span className="font-medium text-blue-600">{row.getValue("system_name")}</span>
      ),
    },
    {
      accessorKey: "tagline",
      header: "Tagline",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            {!item.is_active && (
              <Button
                variant="ghost"
                size="icon"
                title="Set as active"
                onClick={async () => {
                  try {
                    await activateBranding(item.branding_id).unwrap();
                    toast.success("Branding activated");
                    refetch();
                  } catch (err: any) {
                    toast.error(err?.data?.message || "Failed to activate");
                  }
                }}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/branding/${item.branding_id}`)}
              title="Edit"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={item.is_active}
              onClick={async () => {
                if (!window.confirm("Delete this branding configuration?")) return;
                try {
                  await deleteBranding(item.branding_id).unwrap();
                  toast.success("Branding deleted");
                  refetch();
                } catch (err: any) {
                  toast.error(err?.data?.message || "Failed to delete");
                }
              }}
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      variant: "outline",
      onClick: () => console.log("Export clicked"),
    },
    {
      label: "New Branding",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: () => router.push("/branding/new"),
    },
  ];

  const filteredData = data.filter((item) => {
    if (statusFilter === "active") return item.is_active;
    if (statusFilter === "inactive") return !item.is_active;
    return true;
  });

  const paginatedData = filteredData.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  return (
    <TableLayout
      title="Branding Management"
      description="Manage system name, logos, and theme colors for public and admin pages"
      actions={actions}
      filters={filters}
      filterColumnsPerRow={2}
    >
      <DataTable
        columns={columns}
        data={paginatedData}
        totalPageCount={Math.ceil(filteredData.length / pageSize)}
        handlePagination={(index, size) => {
          setPageIndex(index);
          setPageSize(size);
        }}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
        isLoading={isLoading}
      />
    </TableLayout>
  );
}
