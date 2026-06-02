"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Eye, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton } from "@/types/tableLayout";
import type { Pharmacy } from "@/redux/types/pharmacy";
import {
  useGetPharmaciesQuery,
  useTogglePharmacyStatusMutation,
} from "@/redux/api/pharmacyApi";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { PharmacyFormModal } from "./PharmacyFormModal";
import { PermissionGuard } from "@/components/common/PermissionGuard";

export function PharmacyList() {
  const router = useRouter();
  const { data = [], isLoading, refetch } = useGetPharmaciesQuery();
  const [toggleStatus] = useTogglePharmacyStatusMutation();
  const [formOpen, setFormOpen] = useState(false);
  const [editPharmacy, setEditPharmacy] = useState<Pharmacy | null>(null);

  const columns: ColumnDef<Pharmacy>[] = useMemo(
    () => [
      {
        accessorKey: "pharmacy_name",
        header: "Pharmacy Name",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(`/pharmacies/${row.original.pharmacy_id}`)}
          >
            {row.getValue("pharmacy_name")}
          </button>
        ),
      },
      { accessorKey: "pharmacy_code", header: "Code" },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => row.original.email || row.original.phone || "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={status === "active" ? "default" : "secondary"}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: "users",
        header: "Users",
        cell: ({ row }) => row.original.user_count ?? 0,
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        cell: ({ row }) =>
          row.getValue("created_at")
            ? new Date(row.getValue("created_at") as string).toLocaleDateString()
            : "—",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/pharmacies/${item.pharmacy_id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <PermissionGuard requireAny={["PHARMACY:UPDATE"]}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditPharmacy(item);
                    setFormOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </PermissionGuard>
              <PermissionGuard requireAny={["PHARMACY:MANAGE"]}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      await toggleStatus(item.pharmacy_id).unwrap();
                      toast.success("Status updated");
                      refetch();
                    } catch {
                      toast.error("Failed to update status");
                    }
                  }}
                >
                  {item.status === "active" ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </Button>
              </PermissionGuard>
            </div>
          );
        },
      },
    ],
    [router, refetch, toggleStatus]
  );

  const {
    paginated: paginatedData,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
  } = useClientDataTable(data, {
    searchKeys: ["pharmacy_name", "pharmacy_code", "email", "city"],
  });

  const actions: ActionButton[] = [
    {
      label: "New Pharmacy",
      icon: <Plus className="h-4 w-4" />,
      permissions: ["PHARMACY:CREATE"],
      onClick: () => {
        setEditPharmacy(null);
        setFormOpen(true);
      },
    },
  ];

  return (
    <>
      <TableLayout
        title="Pharmacy Management"
        description="Register and manage external pharmacies connected to NOVACURE"
        actions={actions}
      >
        <DataTable
          columns={columns}
          data={paginatedData}
          totalPageCount={totalPageCount}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
          isLoading={isLoading}
        />
      </TableLayout>

      <PharmacyFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditPharmacy(null);
          refetch();
        }}
        pharmacy={editPharmacy}
      />
    </>
  );
}
