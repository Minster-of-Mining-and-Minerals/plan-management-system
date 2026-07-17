"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye, CalendarClock } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { hasAnyPermission } from "@/lib/permissions";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
  useGetPatientsQuery,
  type PatientRecord,
} from "@/redux/api/patientApi";
import { CreatePatientModal } from "@/components/common/modals/CreatePatientModal";
import { formatStatus } from "@/utils/statusFormatter";

function getPatientProfile(patient: PatientRecord) {
  return (
    patient.profile ??
    (patient as { patientProfile?: PatientRecord["profile"] }).patientProfile
  );
}

export interface PatientTableProps {
  sideActions?: ActionButton[];
}

export default function PatientTable({ sideActions }: PatientTableProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const router = useRouter();
  const { permissions } = usePermissions();
  const canSchedule = hasAnyPermission(permissions, ["PATIENTS:SCHEDULE"]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

  const { data, isLoading, refetch } = useGetPatientsQuery({
    search: searchQuery || undefined,
    page: pageIndex + 1,
    limit: pageSize,
    is_active:
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined,
  });

  const patients = data?.patients ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, statusFilter]);

  const columns: ColumnDef<PatientRecord>[] = [
    {
      id: "patient_code",
      header: "Patient ID",
      cell: ({ row }) => {
        const code = getPatientProfile(row.original)?.patient_code;
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {code || "—"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {row.getValue("full_name")}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div>{row.getValue("email") || "—"}</div>,
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      cell: ({ row }) => <div>{row.getValue("phone_number") || "—"}</div>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active !== false;
        const patientStatus =
          getPatientProfile(row.original)?.patient_status || "active";

        if (!isActive) {
          return (
            <Badge variant="destructive">{formatStatus("inactive")}</Badge>
          );
        }

        const variant =
          patientStatus === "active"
            ? "default"
            : patientStatus === "archived" || patientStatus === "deceased"
              ? "secondary"
              : "outline";

        return (
          <Badge variant={variant}>{formatStatus(patientStatus)}</Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5">
          {canSchedule ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(`/patients/list/${row.original.user_id}/schedule`)
              }
              aria-label="Schedule patient"
              title="Schedule"
            >
              <CalendarClock className="h-4 w-4 text-primary" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push(`/patients/list/${row.original.user_id}`)
            }
            aria-label="View patient"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

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
      label: "Register Patient",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: ["PATIENTS:CREATE"],
      onClick: () => setModalOpen(true),
    },
  ];

  return (
    <>
      <TableLayout
        title="Patient Registry"
        actions={actions}
        sideActions={sideActions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={patients}
          isLoading={isLoading}
          totalPageCount={totalPages}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
        />
      </TableLayout>

      <CreatePatientModal
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </>
  );
}
