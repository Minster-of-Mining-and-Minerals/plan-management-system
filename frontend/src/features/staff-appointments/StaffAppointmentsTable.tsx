"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterField } from "@/types/tableLayout";
import {
  useGetMyAppointmentsQuery,
  type StaffAppointment,
} from "@/redux/api/appointmentApi";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANT,
} from "./appointmentStatusStyles";
import { formatStatus } from "@/utils/statusFormatter";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StaffAppointmentsTable() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("admitted_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const apiSortField =
    sortField === "patient_name" ? "admitted_at" : sortField;

  const { data: appointments = [], isLoading } = useGetMyAppointmentsQuery({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    sort: apiSortField,
    order: sortOrder,
  });

  useEffect(() => {
    setPageIndex(0);
  }, [search, statusFilter, sortField, sortOrder]);

  const columns: ColumnDef<StaffAppointment>[] = useMemo(
    () => [
      {
        id: "patient_code",
        header: "Patient ID",
        accessorFn: (row) => row.patient?.patientProfile?.patient_code,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.patient?.patientProfile?.patient_code || "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "patient.full_name",
        header: "Patient name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">
            {row.original.patient?.full_name}
          </span>
        ),
      },
      {
        id: "schedule_time",
        header: "Scheduled time",
        cell: ({ row }) => {
          const s = row.original.schedule;
          if (!s) return "—";
          return (
            <span className="text-sm">
              {s.schedule_date} · {s.start_time}–{s.end_time}
            </span>
          );
        },
      },
      {
        accessorKey: "admitted_at",
        header: "Admitted at",
        cell: ({ row }) => (
          <span className="text-sm">{formatDateTime(row.original.admitted_at)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={APPOINTMENT_STATUS_VARIANT[row.original.status]}>
            {APPOINTMENT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="View appointment"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/appointments/${row.original.appointment_id}`);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const sorted = useMemo(() => {
    const rows = [...appointments];
    const dir = sortOrder === "ASC" ? 1 : -1;

    if (sortField === "patient_name") {
      return rows.sort((a, b) =>
        (a.patient?.full_name || "").localeCompare(b.patient?.full_name || "") * dir
      );
    }

    if (sortField === "created_at" || sortField === "admitted_at" || sortField === "status") {
      return rows.sort((a, b) => {
        const left = a[sortField as keyof StaffAppointment];
        const right = b[sortField as keyof StaffAppointment];
        if (sortField === "status") {
          return String(left).localeCompare(String(right)) * dir;
        }
        return (
          (new Date(String(left)).getTime() - new Date(String(right)).getTime()) * dir
        );
      });
    }

    return rows;
  }, [appointments, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  const filters: FilterField[] = [
    {
      key: "search",
      label: "Search",
      type: "text",
      placeholder: "Patient name or ID…",
      value: search,
      onChange: setSearch,
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "All statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: formatStatus("admitted"), value: "admitted" },
        { label: formatStatus("completed"), value: "completed" },
      ],
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      placeholder: "Admitted (newest)",
      value: `${sortField}:${sortOrder}`,
      onChange: (value: string) => {
        const [field, order] = value.split(":");
        setSortField(field);
        setSortOrder((order as "ASC" | "DESC") || "DESC");
      },
      options: [
        { label: "Admitted — newest first", value: "admitted_at:DESC" },
        { label: "Admitted — oldest first", value: "admitted_at:ASC" },
        { label: "Created — newest first", value: "created_at:DESC" },
        { label: "Created — oldest first", value: "created_at:ASC" },
        { label: "Patient name — A to Z", value: "patient_name:ASC" },
        { label: "Patient name — Z to A", value: "patient_name:DESC" },
        { label: "Status — A to Z", value: "status:ASC" },
        { label: "Status — Z to A", value: "status:DESC" },
      ],
    },
  ];

  return (
    <TableLayout
      title="My Appointments"
      filters={filters}
      filterColumnsPerRow={3}
    >
      <p className="text-sm text-muted-foreground mb-4 px-1">
        Patients appear here only after they are marked{" "}
        <strong>Admitted</strong> on the scheduling board. Scheduled-only slots
        remain visible to administrators only.
      </p>
      <DataTable
        columns={columns}
        data={paginated}
        isLoading={isLoading}
        totalPageCount={totalPages}
        onRowClick={(row) =>
          router.push(`/appointments/${row.appointment_id}`)
        }
        handlePagination={(index, size) => {
          setPageIndex(index);
          setPageSize(size);
        }}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
      />
    </TableLayout>
  );
}
