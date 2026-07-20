"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Calendar, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetWorkflowInboxQuery,
  type WorkflowTask,
} from "@/redux/api/medicalWorkflowApi";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TASK_STATUS_VARIANT: Record<
  WorkflowTask["status"],
  "default" | "secondary" | "outline"
> = {
  pending: "default",
  done: "secondary",
  cancelled: "outline",
};

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Props = {
  status: string;
  onStatusChange: (status: string) => void;
};

export function WorkflowInboxTable({ status, onStatusChange }: Props) {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(formatToday);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true);
  const { data: tasks = [], isLoading } = useGetWorkflowInboxQuery({ status });

  useEffect(() => {
    setPageIndex(0);
  }, [search, status, selectedDate, dateFilterEnabled]);

  const filtered = useMemo(() => {
    let rows = tasks;

    // Filter by forwarded-at date (task.created_at = when the task was forwarded)
    if (dateFilterEnabled) {
      rows = rows.filter(
        (task) =>
          task.created_at &&
          new Date(task.created_at).toISOString().slice(0, 10) === selectedDate
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((task) => {
      const patient = task.appointment?.patient;
      const name = patient?.full_name?.toLowerCase() || "";
      const code = patient?.patientProfile?.patient_code?.toLowerCase() || "";
      const header = task.medicalLog?.header_title?.toLowerCase() || "";
      const from = task.assignedBy?.full_name?.toLowerCase() || "";
      return (
        name.includes(q) ||
        code.includes(q) ||
        header.includes(q) ||
        from.includes(q)
      );
    });
  }, [tasks, search, selectedDate, dateFilterEnabled]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  const columns: ColumnDef<WorkflowTask>[] = useMemo(
    () => [
      {
        id: "patient_code",
        header: "Patient ID",
        accessorFn: (row) => row.appointment?.patient?.patientProfile?.patient_code,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.original.appointment?.patient?.patientProfile?.patient_code ||
              "—"}
          </Badge>
        ),
      },
      {
        id: "patient_name",
        header: "Patient name",
        cell: ({ row }) => (
          <span className="font-medium text-primary">
            {row.original.appointment?.patient?.full_name ?? "—"}
          </span>
        ),
      },
      {
        id: "title",
        header: "Subject",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.medicalLog?.header_title ?? "Forwarded patient"}
          </span>
        ),
      },
      {
        id: "from",
        header: "From",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedBy?.full_name ?? "—"}
          </span>
        ),
      },
      {
        id: "visit",
        header: "Visit",
        cell: ({ row }) => {
          const s = row.original.appointment?.schedule;
          if (!s) return "—";
          return (
            <span className="text-sm text-muted-foreground">
              {s.schedule_date} · {s.start_time?.slice(0, 5)}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Forwarded at",
        cell: ({ row }) => (
          <span className="text-sm">{formatWhen(row.original.created_at)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={TASK_STATUS_VARIANT[row.original.status]}
            className="capitalize"
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open workflow"
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

  return (
    <div className="w-full rounded-lg border bg-white p-6 shadow">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Forwarded-at date filter */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              disabled={!dateFilterEnabled}
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                disabled={!dateFilterEnabled}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[11rem] pl-9"
                aria-label="Pick forwarded date"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              disabled={!dateFilterEnabled}
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 border-l pl-2 ml-1">
            <Switch
              id="workflow-date-filter"
              checked={dateFilterEnabled}
              onCheckedChange={setDateFilterEnabled}
            />
            <Label
              htmlFor="workflow-date-filter"
              className="text-sm font-normal cursor-pointer"
            >
              Filter by forwarded date
            </Label>
          </div>
          {!dateFilterEnabled && (
            <span className="text-xs text-muted-foreground">Showing all dates</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              dateFilterEnabled
                ? "Search forwarded today (name, patient ID, subject, sender)…"
                : "Search all (name, patient ID, subject, sender)…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        isLoading={isLoading}
        totalPageCount={totalPages}
        onRowClick={(row) => router.push(`/appointments/${row.appointment_id}`)}
        handlePagination={(index, size) => {
          setPageIndex(index);
          setPageSize(size);
        }}
        tablePageSize={pageSize}
        currentIndex={pageIndex}
      />
    </div>
  );
}
