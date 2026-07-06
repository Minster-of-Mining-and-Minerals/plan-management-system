"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Calendar, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { FilterPopover } from "@/features/template/component/tableList/FilterDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function StaffAppointmentsTable() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("admitted_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedDate, setSelectedDate] = useState(formatToday);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true);

  const apiSortField =
    sortField === "patient_name" ? "admitted_at" : sortField;

  const { data: appointments = [], isLoading } = useGetMyAppointmentsQuery({
    search: search.trim() || undefined,
    status: statusFilter || undefined,
    sort: apiSortField,
    order: sortOrder,
    schedule_date: dateFilterEnabled ? selectedDate : undefined,
  });

  useEffect(() => {
    setPageIndex(0);
  }, [search, statusFilter, sortField, sortOrder, selectedDate, dateFilterEnabled]);

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-primary">
              {row.original.patient?.full_name}
            </span>
            {row.original.workflow_access?.is_forwarded_to_me && (
              <Badge
                variant="outline"
                className="border-primary/40 text-[10px] text-primary"
              >
                Forwarded
              </Badge>
            )}
          </div>
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
        header: "Visit status",
        cell: ({ row }) => (
          <Badge variant={APPOINTMENT_STATUS_VARIANT[row.original.status]}>
            {APPOINTMENT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "workflow_status",
        header: "Workflow",
        cell: ({ row }) => {
          const ws = row.original.workflow_status;
          const variant =
            ws === "completed" ? "secondary" : ("default" as const);
          return (
            <Badge variant={variant} className="capitalize">
              {ws === "completed" ? "Completed" : "Active"}
            </Badge>
          );
        },
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


  return (
    <TableLayout
      title="My Appointments"
      filters={[]}
      filterColumnsPerRow={2}
      showSearch={false}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[11rem] pl-9"
                aria-label="Pick appointment date"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 border-l pl-2 ml-1">
            <Switch
              id="appointment-date-filter"
              checked={dateFilterEnabled}
              onCheckedChange={setDateFilterEnabled}
            />
            <Label
              htmlFor="appointment-date-filter"
              className="text-sm font-normal cursor-pointer"
            >
              Filter by date
            </Label>
          </div>
          {!dateFilterEnabled && (
            <span className="text-xs text-muted-foreground">
              Showing all dates
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={
                dateFilterEnabled
                  ? "Search this day (name, patient ID, phone)…"
                  : "Search all (name, patient ID, phone)…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

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
