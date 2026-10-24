"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  FileCheck2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Store,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useGetFederalGoldOversightQuery } from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import { AnalyticsPanel } from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";

export function FederalReportMonitoringView() {
  const [businessDate, setBusinessDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });

  const { data, isLoading, isError, isFetching, refetch } = useGetFederalGoldOversightQuery({
    business_date: businessDate || undefined,
  });

  const overview = data?.overview;
  const today = data?.today;
  const centers = data?.centers || [];

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Purchasing Center",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-2 text-xs">
            <Store className="h-4 w-4 text-primary shrink-0" />
            {row.original.name}
          </div>
          <div className="text-[11px] font-mono text-muted-foreground">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Center Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      accessorKey: "today_purchases",
      header: "Purchases Today",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs text-foreground">
          {row.original.today_purchases}
        </span>
      ),
    },
    {
      id: "today_quantity_canonical",
      header: "Gold Volume (g)",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
          {parseFloat(String(row.original.today_quantity_canonical)).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}{" "}
          g
        </span>
      ),
    },
    {
      id: "today_amount",
      header: "Settlement Total",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground text-xs">
          {parseFloat(String(row.original.today_amount)).toLocaleString()} ETB
        </span>
      ),
    },
    {
      id: "today_report_status",
      header: "Reporting Status",
      cell: ({ row }) => {
        const s = row.original.today_report_status;
        return (
          <Badge
            variant={
              s === "submitted" || s === "reviewed"
                ? "default"
                : s === "unsubmitted"
                ? "outline"
                : "secondary"
            }
            className={
              s === "submitted" || s === "reviewed"
                ? "bg-emerald-600 text-white text-[11px] gap-1 py-0.5 px-2.5 font-semibold"
                : s === "unsubmitted"
                ? "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[11px] gap-1 py-0.5 px-2.5 font-semibold"
                : "text-[11px] gap-1 py-0.5 px-2.5 font-medium"
            }
          >
            {s === "submitted" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
              </>
            ) : s === "unsubmitted" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Report Pending
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" /> No Purchases
              </>
            )}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Center Drilldown",
      cell: ({ row }) => (
        <div className="text-right">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
            <Link
              href={`/purchasing-centers/${row.original.purchasing_center_id}/reports/daily?date=${businessDate}`}
            >
              View Report <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <GoldOperationsTabsHeader />

      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-emerald-600" />
            Centralized Daily Report Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time daily reporting completion status and transaction verification across all purchasing centers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-xs">
            <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
            <Input
              type="date"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              className="h-8 border-none text-xs w-36 shadow-none focus-visible:ring-0"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ----------------- REPORTING COMPLETION METRICS ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Reporting Centers"
          value={`${today?.submitted_reports_count || 0} / ${overview?.active_centers || 0}`}
          subtitle={`${today?.reporting_completion_rate || 0}% completion rate for ${today?.business_date}`}
          icon={FileCheck2}
          accent="success"
        />
        <KpiCard
          title="Today's Total Purchases"
          value={today?.purchases_count?.toLocaleString() || "0"}
          subtitle="Transactions across reporting centers"
          icon={CheckCircle2}
        />
        <KpiCard
          title="Today's Total Gold"
          value={`${parseFloat(String(today?.canonical_quantity || 0)).toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
          })} g`}
          subtitle="Collected fine gold weight"
          icon={CheckCircle2}
          accent="warning"
        />
        <KpiCard
          title="Settlement Payout"
          value={`${parseFloat(String(today?.amount || 0)).toLocaleString()} ETB`}
          subtitle="Disbursed settlement funds"
          icon={CheckCircle2}
        />
      </div>

      {/* ----------------- CENTERS MONITORING TABLE ----------------- */}
      <AnalyticsPanel
        title={`Purchasing Centers Reporting Matrix — ${today?.business_date}`}
        description="Individual center status, eligible transaction volume, and verified daily report submissions"
      >
        <DataTable
          columns={columns}
          data={centers}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load center monitoring data."
          onRetry={refetch}
        />
      </AnalyticsPanel>
    </div>
  );
}
