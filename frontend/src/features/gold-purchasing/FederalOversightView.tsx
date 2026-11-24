"use client";

import { useState, useMemo } from "react";
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
  BarChart3,
  PieChart as PieChartIcon,
  Sliders,
  Sparkles,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
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

/** Business dates are in Addis Ababa time (YYYY-MM-DD). */
function addisDate(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const RANGE_PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
  { key: "today", label: "Today", range: () => [addisDate(), addisDate()] },
  { key: "7d", label: "Last 7 days", range: () => [addisDate(-6), addisDate()] },
  { key: "30d", label: "Last 30 days", range: () => [addisDate(-29), addisDate()] },
  {
    key: "month",
    label: "This month",
    range: () => {
      const today = addisDate();
      return [`${today.slice(0, 8)}01`, today];
    },
  },
];

export function FederalOversightView() {
  const [dateFrom, setDateFrom] = useState(() => addisDate());
  const [dateTo, setDateTo] = useState(() => addisDate());

  const { data, isLoading, isFetching, refetch } = useGetFederalGoldOversightQuery({
    date_from: dateFrom || undefined,
    date_to: dateTo || dateFrom || undefined,
  });

  const overview = data?.overview;
  const today = data?.today;
  const sellerDistribution = data?.seller_distribution;
  const centers = data?.centers || [];

  const isSingleDay = !today?.days || today.days <= 1;
  const periodFrom = today?.date_from ?? today?.business_date ?? dateFrom;
  const periodTo = today?.date_to ?? periodFrom;
  const periodLabel = isSingleDay ? periodFrom : `${periodFrom} → ${periodTo}`;
  const periodPrefix = isSingleDay && periodFrom === addisDate() ? "Today's" : "Period";
  const activePreset = RANGE_PRESETS.find((preset) => {
    const [from, to] = preset.range();
    return from === dateFrom && to === dateTo;
  })?.key;

  const applyPreset = (range: () => [string, string]) => {
    const [from, to] = range();
    setDateFrom(from);
    setDateTo(to);
  };

  // Recharts Center Comparison Data
  const centerChartData = useMemo(() => {
    return centers.map((c) => ({
      name: c.name,
      code: c.code,
      volume: parseFloat(parseFloat(String(c.today_quantity_canonical || 0)).toFixed(2)),
      amount: parseFloat(parseFloat(String(c.today_amount || 0)).toFixed(2)),
      totalVolume: parseFloat(parseFloat(String(c.total_quantity_canonical || 0)).toFixed(2)),
      purchases: c.today_purchases || 0,
    }));
  }, [centers]);

  // Sourcing Distribution Donut Data
  const sourcingChartData = useMemo(() => {
    const companyVol = parseFloat(String(sellerDistribution?.company?.canonical_quantity || 0));
    const asmVol = parseFloat(String(sellerDistribution?.asm?.canonical_quantity || 0));

    return [
      {
        name: "Registered Companies",
        value: companyVol,
        purchases: sellerDistribution?.company?.count || 0,
        amount: sellerDistribution?.company?.amount || 0,
        color: "#0284c7",
      },
      {
        name: "Artisanal Miners (ASM)",
        value: asmVol,
        purchases: sellerDistribution?.asm?.count || 0,
        amount: sellerDistribution?.asm?.amount || 0,
        color: "#f59e0b",
      },
    ];
  }, [sellerDistribution]);

  // Statistical calculations
  const statisticalMetrics = useMemo(() => {
    const totalGrams = parseFloat(String(today?.canonical_quantity || 0));
    const totalAmount = parseFloat(String(today?.amount || 0));
    const totalPurchases = today?.purchases_count || 0;

    const avgTransactionWeight = totalPurchases > 0 ? (totalGrams / totalPurchases) : 0;
    const avgTransactionValue = totalPurchases > 0 ? (totalAmount / totalPurchases) : 0;
    const effectivePricePerGram = totalGrams > 0 ? (totalAmount / totalGrams) : 0;

    // Top Center by Volume
    const sortedCenters = [...centers].sort((a, b) => (b.today_quantity_canonical || 0) - (a.today_quantity_canonical || 0));
    const topCenter = sortedCenters[0] || null;

    // ASM Share
    const companyGrams = parseFloat(String(sellerDistribution?.company?.canonical_quantity || 0));
    const asmGrams = parseFloat(String(sellerDistribution?.asm?.canonical_quantity || 0));
    const allGrams = companyGrams + asmGrams || 1;
    const asmSharePct = ((asmGrams / allGrams) * 100).toFixed(1);

    return {
      avgTransactionWeight: avgTransactionWeight.toFixed(2),
      avgTransactionValue: avgTransactionValue.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      effectivePricePerGram: effectivePricePerGram.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      topCenterName: topCenter ? topCenter.name : "N/A",
      topCenterVolume: topCenter ? parseFloat(String(topCenter.today_quantity_canonical || 0)).toLocaleString() : "0",
      asmSharePct,
    };
  }, [today, centers, sellerDistribution]);

  const centerColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Center Name & Code",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground text-xs">{row.original.name}</div>
          <div className="text-[11px] font-mono text-muted-foreground">{row.original.code}</div>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      accessorKey: "today_purchases",
      header: `${periodPrefix} Purchases`,
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs text-foreground">
          {row.original.today_purchases}
        </span>
      ),
    },
    {
      id: "today_quantity_canonical",
      header: `${periodPrefix} Gold (g)`,
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
      header: `${periodPrefix} Amount`,
      cell: ({ row }) => (
        <span className="font-mono text-foreground font-semibold text-xs">
          {parseFloat(String(row.original.today_amount)).toLocaleString()} ETB
        </span>
      ),
    },
    {
      id: "today_report",
      header: isSingleDay ? "Daily Report" : "Reports (submitted / active days)",
      cell: ({ row }) => {
        const c = row.original;
        const status = c.today_report_status;
        const isDone = status === "submitted" || status === "reviewed";
        const isPartial = status === "partial";
        const isPending = status === "unsubmitted";
        const dayCounts =
          !isSingleDay && (c.active_days ?? 0) > 0
            ? ` ${c.submitted_days ?? 0}/${c.active_days}`
            : "";
        return (
          <Badge
            variant={isDone ? "default" : isPending || isPartial ? "outline" : "secondary"}
            className={
              isDone
                ? "bg-emerald-600 text-white text-[10px] gap-1"
                : isPartial
                ? "border-sky-500 text-sky-700 dark:text-sky-300 text-[10px] gap-1"
                : isPending
                ? "border-amber-500 text-amber-700 dark:text-amber-300 text-[10px] gap-1"
                : "text-[10px] gap-1"
            }
          >
            {isDone ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                {status === "reviewed" ? "Reviewed" : "Submitted"}
                {dayCounts}
              </>
            ) : isPartial ? (
              <>
                <AlertCircle className="h-3 w-3" /> Partial{dayCounts}
              </>
            ) : isPending ? (
              <>
                <AlertCircle className="h-3 w-3" /> Pending{dayCounts}
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" /> No activity
              </>
            )}
          </Badge>
        );
      },
    },
    {
      id: "total_quantity_canonical",
      header: "Total Gold (g)",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-xs">
          {parseFloat(String(row.original.total_quantity_canonical)).toLocaleString()} g
        </span>
      ),
    },
    {
      id: "actions",
      header: "Drilldown",
      cell: ({ row }) => (
        <div className="text-right">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/purchasing-centers/${row.original.purchasing_center_id}`}>
              Center View <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-xs flex-wrap">
            {RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                size="sm"
                variant={activePreset === preset.key ? "default" : "ghost"}
                className="h-8 px-2.5 text-xs"
                onClick={() => applyPreset(preset.range)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2 py-1 shadow-xs">
            <span className="text-[11px] font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 border-none text-xs w-36 shadow-none focus-visible:ring-0"
              aria-label="From date"
            />
            <span className="text-[11px] font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 border-none text-xs w-36 shadow-none focus-visible:ring-0"
              aria-label="To date"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-10 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button asChild size="sm" className="gap-1.5 h-10 rounded-xl">
            <Link href="/admin/gold-operations/reports">
              <FileCheck2 className="h-4 w-4" /> Daily Report Monitoring
            </Link>
          </Button>
        </div>
      </div>

      {/* ----------------- TODAY'S NATIONAL PERFORMANCE ----------------- */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          {periodPrefix === "Today's" ? "Today's" : "Selected Period"} National Performance ({periodLabel}
          {!isSingleDay ? `, ${today?.days} days` : ""})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title={`${periodPrefix} Nationwide Purchases`}
            value={today?.purchases_count?.toLocaleString() || "0"}
            subtitle={isSingleDay ? "Transactions completed on this day" : "Transactions completed in the period"}
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title={`${periodPrefix} Canonical Volume`}
            value={`${(today?.canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Standardized metric gold weight"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title={`${periodPrefix} Total Value`}
            value={`${(today?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Settled purchasing capital"
            icon={DollarSign}
            accent="warning"
          />
          <KpiCard
            title="Daily Reporting Completion"
            value={`${today?.reporting_completion_rate || 0}%`}
            subtitle={
              isSingleDay
                ? `${today?.submitted_reports_count || 0} of ${overview?.active_centers || 0} centers submitted`
                : `${today?.submitted_reports_count || 0} of ${today?.expected_reports || 0} daily reports submitted`
            }
            icon={FileCheck2}
            accent={Number(today?.reporting_completion_rate || 0) >= 80 ? "success" : "info"}
          />
        </div>
      </div>

      {/* ----------------- STATISTICAL ANALYSIS & GRAPHS SECTION ----------------- */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          Cross-Center Statistical Analysis & Volume Visualizations
        </h3>

        {/* STATISTICAL SUMMARY TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Transaction Size
            </span>
            <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {statisticalMetrics.avgTransactionWeight} g
            </p>
            <p className="text-[10px] text-muted-foreground">Per individual purchase</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Transaction Payout
            </span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {statisticalMetrics.avgTransactionValue} ETB
            </p>
            <p className="text-[10px] text-muted-foreground">Mean ticket disbursement</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Effective Price / Gram
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {statisticalMetrics.effectivePricePerGram} ETB
            </p>
            <p className="text-[10px] text-muted-foreground">Weighted average rate</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Artisanal (ASM) Share
            </span>
            <p className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {statisticalMetrics.asmSharePct}%
            </p>
            <p className="text-[10px] text-muted-foreground">Of nationwide volume</p>
          </div>
        </div>

        {/* COMPARATIVE GRAPHS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Center-by-Center Volume Bar Chart (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-500" />
                  Purchasing Center Volume Comparison ({periodLabel})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Gold weight canonical volume (g) collected per regional center
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {centerChartData.length} Centers
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              {centerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={centerChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      stroke="#888888"
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#888888"
                      tickLine={false}
                      tickFormatter={(val) => `${val}g`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="p-3 bg-popover/95 border border-border shadow-lg rounded-2xl text-xs space-y-1">
                              <p className="font-bold text-foreground">{label} ({item.code})</p>
                              <p className="text-amber-600 dark:text-amber-400 font-mono">
                                Period Volume: {item.volume.toLocaleString()} grams
                              </p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-mono">
                                Period Payout: {item.amount.toLocaleString()} ETB
                              </p>
                              <p className="text-muted-foreground font-mono">
                                Transactions: {item.purchases}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="volume" name="Canonical Gold (g)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No center volume data recorded.
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Channel Donut (4 Cols) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-sky-500" />
                National Sourcing Parity
              </h4>
              <p className="text-xs text-muted-foreground">
                All-time volume share: Corporate vs Artisanal
              </p>
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              {sourcingChartData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcingChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sourcingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          const total = sourcingChartData.reduce((a, b) => a + b.value, 0) || 1;
                          const pct = ((d.value / total) * 100).toFixed(1);
                          return (
                            <div className="p-2.5 bg-popover/95 border border-border shadow-md rounded-xl text-xs space-y-0.5">
                              <p className="font-bold text-foreground">{d.name}</p>
                              <p className="font-mono text-muted-foreground">
                                {d.value.toLocaleString()} g ({pct}%)
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {d.purchases} purchases • {d.amount.toLocaleString()} ETB
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">No sourcing data</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              {sourcingChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-muted-foreground">
                    {item.value.toLocaleString()} g
                  </span>
                </div>
              ))}
            </div>
          </div>
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

      {/* ----------------- QUICK NAVIGATION & OVERSIGHT REGISTERS ----------------- */}
      <AnalyticsPanel
        title="Quick Navigation & Gold Operations Management"
        description="Direct links to specialized oversight registers, registries, and standard configuration engines"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3 rounded-2xl">
            <Link href="/admin/gold-operations/purchases">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-500" /> Purchases Register
              </span>
              <span className="text-[10px] text-muted-foreground">Transactions</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3 rounded-2xl">
            <Link href="/admin/gold-operations/reports">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-500" /> Daily Reports
              </span>
              <span className="text-[10px] text-muted-foreground">Report matrix</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3 rounded-2xl">
            <Link href="/admin/gold-operations/asm">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <HardHat className="h-4 w-4 text-sky-500" /> ASM Registry
              </span>
              <span className="text-[10px] text-muted-foreground">Miners directory</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3 rounded-2xl">
            <Link href="/admin/gold-operations/units">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-purple-500" /> Measurement Units
              </span>
              <span className="text-[10px] text-muted-foreground">Dynamic units & factors</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-16 flex flex-col items-start justify-center p-3 rounded-2xl border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10">
            <Link href="/admin/gold-operations/parameters">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-amber-500" /> Parameters & Standards
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">Configure types & karat</span>
            </Link>
          </Button>
        </div>
      </AnalyticsPanel>

      {/* ----------------- PURCHASING CENTERS COMPARISON TABLE ----------------- */}
      <AnalyticsPanel
        title="Purchasing Centers Activity & Daily Reporting Matrix"
        description={`Purchasing totals and daily reporting submission status for ${periodLabel}`}
      >
        <DataTable
          columns={centerColumns}
          data={centers}
          isLoading={isLoading}
          onRetry={refetch}
        />
      </AnalyticsPanel>
    </div>
  );
}
