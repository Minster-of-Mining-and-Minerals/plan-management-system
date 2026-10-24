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
  Coins,
  Scale,
  Store,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

  const { data, isLoading, isFetching, refetch } = useGetFederalGoldOversightQuery({
    business_date: businessDate || undefined,
  });

  if (isLoading) {
    return <Loading01 />;
  }

  const overview = data?.overview;
  const today = data?.today;
  const centers = data?.centers || [];

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
          icon={Coins}
          accent="primary"
        />
        <KpiCard
          title="Today's Canonical Volume"
          value={`${(today?.canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
          subtitle="Standardized metric gold weight"
          icon={Scale}
          accent="warning"
        />
        <KpiCard
          title="Today's Total Value"
          value={`${(today?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
          subtitle="Settled purchasing capital"
          icon={Coins}
          accent="info"
        />
      </div>

      {/* ----------------- CENTERS MONITORING TABLE ----------------- */}
      <AnalyticsPanel
        title={`Purchasing Centers Reporting Matrix — ${today?.business_date}`}
        description="Individual center status, eligible transaction volume, and verified daily report submissions"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="py-3 px-4 font-semibold">Purchasing Center</th>
                <th className="py-3 px-4 font-semibold">Center Status</th>
                <th className="py-3 px-4 font-semibold">Purchases Today</th>
                <th className="py-3 px-4 font-semibold">Gold Volume (g)</th>
                <th className="py-3 px-4 font-semibold">Settlement Total</th>
                <th className="py-3 px-4 font-semibold">Reporting Status</th>
                <th className="py-3 px-4 font-semibold text-right">Center Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {centers.map((c) => (
                <tr key={c.purchasing_center_id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary shrink-0" />
                      {c.name}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{c.code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {c.today_purchases}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {parseFloat(String(c.today_quantity_canonical)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{" "}
                    g
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                    {parseFloat(String(c.today_amount)).toLocaleString()} ETB
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        c.today_report_status === "submitted" || c.today_report_status === "reviewed"
                          ? "default"
                          : c.today_report_status === "unsubmitted"
                          ? "outline"
                          : "secondary"
                      }
                      className={
                        c.today_report_status === "submitted" || c.today_report_status === "reviewed"
                          ? "bg-emerald-600 text-white text-[11px] gap-1 py-0.5 px-2.5 font-semibold"
                          : c.today_report_status === "unsubmitted"
                          ? "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[11px] gap-1 py-0.5 px-2.5 font-semibold"
                          : "text-[11px] gap-1 py-0.5 px-2.5 font-medium"
                      }
                    >
                      {c.today_report_status === "submitted" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                        </>
                      ) : c.today_report_status === "unsubmitted" ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5" /> Report Pending
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" /> No Purchases
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                      <Link href={`/purchasing-centers/${c.purchasing_center_id}/reports/daily?date=${businessDate}`}>
                        View Report <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsPanel>
    </div>
  );
}
