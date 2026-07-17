"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGetAuditLogsQuery,
  type AuditLogRow,
} from "@/redux/api/auditLogApi";
import { getAuthToken } from "@/lib/authToken";
import type { FilterField } from "@/types/tableLayout";

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

export function AuditExplorerPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [resourceType, setResourceType] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState(formatToday());
  const [toDate, setToDate] = useState(formatToday());
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useGetAuditLogsQuery({
    page: pageIndex + 1,
    limit: pageSize,
    search: searchQuery.trim() || undefined,
    resource_type: resourceType.trim() || undefined,
    action: action.trim() || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
  });

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, resourceType, action, fromDate, toDate]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (resourceType.trim()) params.set("resource_type", resourceType.trim());
      if (action.trim()) params.set("action", action.trim());
      if (fromDate) params.set("from_date", fromDate);
      if (toDate) params.set("to_date", toDate);
      const token = getAuthToken();
      const res = await fetch(`${apiBase}/audit-logs/export?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${formatToday()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit CSV downloaded");
    } catch {
      toast.error("Could not export audit logs");
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnDef<AuditLogRow>[] = [
    {
      accessorKey: "created_at",
      header: "When",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs">
          {new Date(row.original.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="font-medium">
            {row.original.actor?.full_name || "—"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.actor?.email || row.original.actor_user_id || "system"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.action}</Badge>
      ),
    },
    {
      accessorKey: "resource_type",
      header: "Resource",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.resource_type}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {row.original.resource_id || "—"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.ip_address || "—"}</span>
      ),
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <pre className="max-w-xs overflow-auto rounded bg-muted/40 p-2 text-[10px] leading-snug">
          {row.original.details
            ? JSON.stringify(row.original.details, null, 0)
            : "—"}
        </pre>
      ),
    },
  ];

  const filters: FilterField[] = [
    {
      key: "resource",
      label: "Resource type",
      type: "text",
      placeholder: "e.g. auth, user, role",
      value: resourceType,
      onChange: setResourceType,
    },
    {
      key: "action",
      label: "Action",
      type: "text",
      placeholder: "e.g. login_success",
      value: action,
      onChange: setAction,
    },
  ];

  return (
    <TableLayout
      title="Audit explorer"
      description="Searchable trail of security and clinical/finance mutations."
      filters={filters}
      filterColumnsPerRow={2}
      actions={[
        {
          label: exporting ? "Exporting…" : "Export CSV",
          icon: <Download className="h-4 w-4" />,
          onClick: exportCsv,
          disabled: exporting,
          variant: "outline",
          size: "sm",
          permissions: ["AUDIT_LOG:VIEW"],
        },
      ]}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        isLoading={isLoading}
        totalPageCount={data?.totalPages ?? 1}
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
