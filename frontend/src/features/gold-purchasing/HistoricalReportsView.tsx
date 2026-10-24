"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useGetGoldHistoricalReportsQuery } from "@/redux/api/goldApi";
import type { GoldDailyReportRecord } from "@/redux/types/gold";

interface HistoricalReportsViewProps {
  centerId?: string;
  isFederalOversight?: boolean;
}

export function HistoricalReportsView({
  centerId,
  isFederalOversight = false,
}: HistoricalReportsViewProps) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const activeCenterId = centerId || params?.id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/admin/gold-operations";

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading, isError, refetch } = useGetGoldHistoricalReportsQuery({
    purchasing_center_id: isFederalOversight ? undefined : activeCenterId,
    status: status !== "all" ? status : undefined,
    page,
    limit,
  });

  const reports = data?.items || [];
  const pagination = data?.pagination;

  const columns: ColumnDef<GoldDailyReportRecord>[] = [
    {
      accessorKey: "business_date",
      header: "Business Date",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-foreground text-xs">
          {row.original.business_date}
        </span>
      ),
    },
    ...(isFederalOversight
      ? [
          {
            id: "center",
            header: "Purchasing Center",
            cell: ({ row }: { row: { original: GoldDailyReportRecord } }) => (
              <span className="font-medium text-foreground text-xs">
                {row.original.purchasingCenter?.name || "Purchasing Center"}
              </span>
            ),
          } as ColumnDef<GoldDailyReportRecord>,
        ]
      : []),
    {
      accessorKey: "total_purchases",
      header: "Transactions",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.total_purchases}</span>
      ),
    },
    {
      id: "canonical_gold",
      header: "Canonical Gold (g)",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
          {parseFloat(String(row.original.total_quantity_canonical)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}{" "}
          g
        </span>
      ),
    },
    {
      id: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground text-xs">
          {parseFloat(String(row.original.total_amount)).toLocaleString()} ETB
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isVerified =
          row.original.status === "submitted" || row.original.status === "reviewed";
        return (
          <Badge
            variant={isVerified ? "default" : "outline"}
            className={
              isVerified
                ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                : "text-[11px]"
            }
          >
            {row.original.status}
          </Badge>
        );
      },
    },
    {
      id: "submittedBy",
      header: "Submitted By & At",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {r.submitted_at ? (
              <div>
                <div>{new Date(r.submitted_at).toLocaleDateString()}</div>
                <div className="text-[10px] opacity-70">
                  {r.submittedBy?.full_name || "Center Officer"}
                </div>
              </div>
            ) : (
              <span className="italic">Unsubmitted</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const r = row.original;
        const dailyReportUrl = isFederalOversight
          ? `/admin/gold-operations/reports?date=${r.business_date}`
          : `${basePath}/reports/daily?date=${r.business_date}`;
        return (
          <div className="text-right">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs gap-1">
              <Link href={dailyReportUrl}>
                <Eye className="h-3.5 w-3.5" />
                View Report
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Report Status",
      type: "select",
      placeholder: "All Statuses",
      value: status,
      onChange: (val: string) => {
        setStatus(val);
        setPage(1);
      },
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Submitted", value: "submitted" },
        { label: "Reviewed", value: "reviewed" },
        { label: "Draft", value: "draft" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "Today's Daily Report",
      icon: <Calendar className="h-4 w-4 text-emerald-600" />,
      variant: "outline",
      onClick: () => router.push(`${basePath}/reports/daily`),
    },
  ];

  return (
    <div className="space-y-6">
      <TableLayout
        title="Historical Daily Purchasing Reports"
        description="Official submitted daily records and transaction audits preserved across business reporting periods."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
        showSearch={false}
      >
        <DataTable
          columns={columns}
          data={reports}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load historical daily reports."
          onRetry={refetch}
          paginationMode="server"
          totalRowCount={pagination?.total || 0}
          pageIndex={page - 1}
          pageSize={limit}
          onPaginationChange={(newPageIndex, newPageSize) => {
            setPage(newPageIndex + 1);
            if (newPageSize !== limit) {
              setLimit(newPageSize);
            }
          }}
          resetKey={status}
        />
      </TableLayout>
    </div>
  );
}
