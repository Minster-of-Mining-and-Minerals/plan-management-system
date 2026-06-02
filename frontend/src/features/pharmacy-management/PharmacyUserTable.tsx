"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import type { PharmacyUserRow } from "@/redux/types/pharmacy";
import { useTogglePharmacyUserStatusMutation } from "@/redux/api/pharmacyApi";
import { useClientDataTable } from "@/hooks/useClientDataTable";
import { formatStatus } from "@/utils/statusFormatter";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import { PharmacyUserFormModal } from "./PharmacyUserFormModal";
import { PORTAL_ROLE_LABELS } from "./pharmacyUserUtils";

type Props = {
  pharmacyId: string;
  pharmacyName: string;
  users: PharmacyUserRow[];
  onRefresh: () => void;
};

export function PharmacyUserTable({
  pharmacyId,
  pharmacyName,
  users,
  onRefresh,
}: Props) {
  const [toggleStatus] = useTogglePharmacyUserStatusMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<PharmacyUserRow | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const columns: ColumnDef<PharmacyUserRow>[] = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "Full Name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.getValue("full_name")}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone_number",
        header: "Phone Number",
        cell: ({ row }) => row.getValue("phone_number") || "—",
      },
      {
        accessorKey: "portal_role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.getValue("portal_role") as PharmacyUserRow["portal_role"];
          return (
            <Badge variant="outline" className="capitalize">
              {PORTAL_ROLE_LABELS[role]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.getValue("is_active") as boolean;
          return (
            <Badge variant={isActive ? "default" : "destructive"}>
              {formatStatus(isActive ? "Active" : "Inactive")}
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
            <div className="flex items-center gap-1">
              <PermissionGuard requireAny={["PHARMACY:USER_MANAGE"]}>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  onClick={() => {
                    setEditUser(item);
                    setModalOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title={item.is_active ? "Deactivate" : "Activate"}
                  onClick={async () => {
                    try {
                      await toggleStatus(item.user_id).unwrap();
                      toast.success("Status updated");
                      onRefresh();
                    } catch (err: unknown) {
                      const message =
                        err && typeof err === "object" && "data" in err
                          ? String(
                              (err as { data?: { message?: string } }).data?.message
                            )
                          : "Failed to update status";
                      toast.error(message);
                    }
                  }}
                >
                  {item.is_active ? (
                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </PermissionGuard>
            </div>
          );
        },
      },
    ],
    [onRefresh, toggleStatus]
  );

  const statusFilterFn = useMemo(
    () => (row: PharmacyUserRow) => {
      if (statusFilter === "active") return row.is_active;
      if (statusFilter === "inactive") return !row.is_active;
      return true;
    },
    [statusFilter]
  );

  const {
    paginated: paginatedData,
    totalPageCount,
    pageIndex,
    pageSize,
    handlePagination,
  } = useClientDataTable(users, {
    searchKeys: ["full_name", "email", "phone_number", "portal_role"],
    filterFn: statusFilterFn,
    resetDeps: [statusFilter],
  });

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Filter by status",
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
      label: "New pharmacy user",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: ["PHARMACY:USER_MANAGE"],
      onClick: () => {
        setEditUser(null);
        setModalOpen(true);
      },
    },
  ];

  return (
    <>
      <TableLayout
        title="Pharmacy users"
        description={`Portal accounts for ${pharmacyName}`}
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={paginatedData}
          totalPageCount={totalPageCount}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
        />
      </TableLayout>

      <PharmacyUserFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditUser(null);
          onRefresh();
        }}
        pharmacyId={pharmacyId}
        user={editUser}
      />
    </>
  );
}
