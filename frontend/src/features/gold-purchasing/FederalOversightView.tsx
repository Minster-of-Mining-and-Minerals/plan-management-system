"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  Coins,
  Scale,
  DollarSign,
  Building2,
  HardHat,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Store,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useGetFederalGoldOversightQuery } from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import { AnalyticsPanel } from "@/features/plan-management/dashboard/components/AnalyticsPanel";

export function FederalOversightView() {
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
  const sellerDistribution = data?.seller_distribution;
  const centers = data?.centers || [];

  return (
    <div className="space-y-8">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Coins className="h-7 w-7 text-amber-500" />
            Federal Gold Purchasing Oversight
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized monitoring of purchasing center operations, canonical volume rollups, and daily report completion.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-xs">
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

          <Button asChild size="sm" className="gap-1.5 h-10">
            <Link href="/admin/gold-operations/reports">
              <FileCheck2 className="h-4 w-4" /> Daily Report Monitoring
            </Link>
          </Button>
        </div>
      </div>

      {/* ----------------- TODAY'S NATIONAL PERFORMANCE ----------------- */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          Today&apos;s National Performance ({today?.business_date})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Today's Nationwide Purchases"
            value={today?.purchases_count?.toLocaleString() || "0"}
            subtitle="Transactions completed today"
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title="Today's Canonical Volume"
            value={`${(today?.canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Standardized metric gold weight"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Today's Total Value"
            value={`${(today?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Settled purchasing capital"
            icon={DollarSign}
            accent="warning"
          />
          <KpiCard
            title="Daily Reporting Completion"
            value={`${today?.reporting_completion_rate || 0}%`}
            subtitle={`${today?.submitted_reports_count || 0} of ${overview?.active_centers || 0} centers submitted`}
            icon={FileCheck2}
            accent={Number(today?.reporting_completion_rate || 0) >= 80 ? "success" : "info"}
          />
        </div>
      </div>

      {/* ----------------- CUMULATIVE NATIONWIDE OVERVIEW ----------------- */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          Cumulative National Sourcing & Purchasing
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Active Purchasing Centers"
            value={`${overview?.active_centers || 0}`}
            subtitle={`${overview?.total_centers || 0} total registered outposts`}
            icon={Store}
            accent="primary"
          />
          <KpiCard
            title="Total Gold Acquired"
            value={`${(overview?.total_quantity_canonical || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="All-time canonical volume"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Total Value Disbursed"
            value={`${(overview?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="All-time purchasing payouts"
            icon={TrendingUp}
            accent="warning"
          />
          <KpiCard
            title="Total Purchases"
            value={overview?.total_purchases?.toLocaleString() || "0"}
            subtitle="Cumulative verified receipts"
            icon={Coins}
            accent="info"
          />
        </div>
      </div>

      {/* ----------------- SOURCING BREAKDOWN ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsPanel
          title="National Sourcing Attribution"
          description="All-time gold volume acquired from corporate mining companies vs ASM miners"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-bold text-foreground">Registered Companies</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {(sellerDistribution?.company?.canonical_quantity || 0).toLocaleString()} g
              </p>
              <p className="text-xs text-muted-foreground">
                {sellerDistribution?.company?.count || 0} purchases •{" "}
                {(sellerDistribution?.company?.amount || 0).toLocaleString()} ETB
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2">
                <HardHat className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">Artisanal Miners (ASM)</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {(sellerDistribution?.asm?.canonical_quantity || 0).toLocaleString()} g
              </p>
              <p className="text-xs text-muted-foreground">
                {sellerDistribution?.asm?.count || 0} purchases •{" "}
                {(sellerDistribution?.asm?.amount || 0).toLocaleString()} ETB
              </p>
            </div>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Quick Navigation & Oversight Registers"
          description="Direct links to specialized oversight registers and registries"
        >
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3">
              <Link href="/admin/gold-operations/purchases">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" /> Purchases Register
                </span>
                <span className="text-[11px] text-muted-foreground">Cross-center transactions</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3">
              <Link href="/admin/gold-operations/reports">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-emerald-500" /> Daily Reports
                </span>
                <span className="text-[11px] text-muted-foreground">Report monitoring matrix</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3">
              <Link href="/admin/gold-operations/asm">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <HardHat className="h-4 w-4 text-sky-500" /> ASM Registry
                </span>
                <span className="text-[11px] text-muted-foreground">National miners directory</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3">
              <Link href="/admin/gold-operations/units">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-purple-500" /> Measurement Units
                </span>
                <span className="text-[11px] text-muted-foreground">Configure units & factors</span>
              </Link>
            </Button>
          </div>
        </AnalyticsPanel>
      </div>

      {/* ----------------- PURCHASING CENTERS COMPARISON TABLE ----------------- */}
      <AnalyticsPanel
        title="Purchasing Centers Activity & Daily Reporting Matrix"
        description={`Live purchasing totals and daily reporting submission status for ${today?.business_date}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="py-3 px-4 font-semibold">Center Name & Code</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Today&apos;s Purchases</th>
                <th className="py-3 px-4 font-semibold">Today&apos;s Gold (g)</th>
                <th className="py-3 px-4 font-semibold">Today&apos;s Amount</th>
                <th className="py-3 px-4 font-semibold">Today&apos;s Report</th>
                <th className="py-3 px-4 font-semibold">Total Gold (g)</th>
                <th className="py-3 px-4 font-semibold text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {centers.map((c) => (
                <tr key={c.purchasing_center_id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foreground">{c.name}</div>
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
                  <td className="py-3.5 px-4 font-mono text-foreground font-semibold">
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
                          ? "bg-emerald-600 text-white text-[10px] gap-1"
                          : c.today_report_status === "unsubmitted"
                          ? "border-amber-500 text-amber-700 dark:text-amber-300 text-[10px] gap-1"
                          : "text-[10px] gap-1"
                      }
                    >
                      {c.today_report_status === "submitted" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Submitted
                        </>
                      ) : c.today_report_status === "unsubmitted" ? (
                        <>
                          <AlertCircle className="h-3 w-3" /> Pending
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" /> No activity
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground">
                    {parseFloat(String(c.total_quantity_canonical)).toLocaleString()} g
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Link href={`/purchasing-centers/${c.purchasing_center_id}`}>
                        Center View <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
