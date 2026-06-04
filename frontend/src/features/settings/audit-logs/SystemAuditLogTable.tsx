"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FilterField } from "@/types/tableLayout";
import { useGetSystemAuditLogsQuery } from "@/redux/api/systemAuditLogApi";
import type { SystemAuditLog } from "@/redux/types/systemAuditLog";
import {
  SYSTEM_AUDIT_ACTION_OPTIONS,
  SYSTEM_AUDIT_MODULE_OPTIONS,
} from "@/redux/types/systemAuditLog";
import { SystemAuditLogDetailModal } from "./SystemAuditLogDetailModal";

export default function SystemAuditLogTable() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const resetKey = `${searchQuery}-${moduleFilter}-${actionFilter}`;

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey]);

  const { data: response, isLoading } = useGetSystemAuditLogsQuery({
    page: pageIndex + 1,
    limit: pageSize,
    search: searchQuery || undefined,
    module: moduleFilter ? (moduleFilter as SystemAuditLog["module"]) : undefined,
    action: actionFilter ? (actionFilter as SystemAuditLog["action"]) : undefined,
  });

  const logs = response?.data ?? [];
  const totalRows = response?.meta?.total ?? 0;

  const columns: ColumnDef<SystemAuditLog>[] = [
    {
      accessorKey: "created_at",
      header: "Date & Time",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "module_label",
      header: "Module",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.module_label ?? row.original.module}</Badge>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => <Badge className="capitalize">{row.original.action}</Badge>,
    },
    {
      accessorKey: "entity_label",
      header: "Entity",
      cell: ({ row }) => (
        <span className="font-medium text-primary">{row.original.entity_label ?? "—"}</span>
      ),
    },
    {
      accessorKey: "summary",
      header: "Summary",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-2">
          {row.original.summary ?? "—"}
        </span>
      ),
    },
    {
      id: "changed_by",
      header: "Changed By",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="font-medium">{row.original.changedByUser?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.original.changedByUser?.email}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedLog(row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "module",
      label: "Module",
      type: "select",
      placeholder: "All modules",
      value: moduleFilter || "all",
      onChange: (value: string) => setModuleFilter(value === "all" ? "" : value),
      options: [
        { label: "All modules", value: "all" },
        ...SYSTEM_AUDIT_MODULE_OPTIONS.map((o) => ({
          label: o.label,
          value: o.value,
        })),
      ],
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      placeholder: "All actions",
      value: actionFilter || "all",
      onChange: (value: string) => setActionFilter(value === "all" ? "" : value),
      options: [
        { label: "All actions", value: "all" },
        ...SYSTEM_AUDIT_ACTION_OPTIONS.map((o) => ({
          label: o.label,
          value: o.value,
        })),
      ],
    },
  ];

  return (
    <>
      <TableLayout
        title="System Audit Logs"
        description="Track configuration and data changes across the platform"
        filters={filters}
        filterColumnsPerRow={2}
      >
        <DataTable
          columns={columns}
          data={logs}
          isLoading={isLoading}
          paginationMode="server"
          totalRowCount={totalRows}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPaginationChange={(index, size) => {
            setPageIndex(index);
            setPageSize(size);
          }}
          resetKey={resetKey}
        />
      </TableLayout>

      <SystemAuditLogDetailModal
        log={selectedLog}
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
}
