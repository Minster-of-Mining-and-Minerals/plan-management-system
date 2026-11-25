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
  Activity,
  Layers,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetFederalGoldOversightQuery,
  useGetGoldUnitsQuery,
} from "@/redux/api/goldApi";
import { useGetPurchasingCentersQuery } from "@/redux/api/purchasingCenterApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import { AnalyticsPanel } from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import {
  GoldUnitReportingMatrix,
  resolveConfiguredUnits,
  formatUnitVolume,
} from "./GoldUnitReportingMatrix";

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
  const [selectedCenterId, setSelectedCenterId] = useState<string>("all");
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>("GRAM");
  const [activeMetric, setActiveMetric] = useState<"volume" | "purchases" | "avg_ticket">("volume");
  const [sourcingMode, setSourcingMode] = useState<"period" | "all_time">("period");
  const [overviewDisplayMode, setOverviewDisplayMode] = useState<"period" | "cumulative">("period");

  const { data: allCenters = [] } = useGetPurchasingCentersQuery();
  const { data: dbUnits = [] } = useGetGoldUnitsQuery();

  const { data, isLoading, isFetching, refetch } = useGetFederalGoldOversightQuery({
    date_from: dateFrom || undefined,
    date_to: dateTo || dateFrom || undefined,
    purchasing_center_id: selectedCenterId !== "all" ? selectedCenterId : undefined,
  });

  const selectedCenter = useMemo(
    () => allCenters.find((c) => c.purchasing_center_id === selectedCenterId),
    [allCenters, selectedCenterId]
  );

  const configuredUnits = useMemo(
    () => resolveConfiguredUnits(data?.configured_units || dbUnits),
    [data?.configured_units, dbUnits]
  );

  const currentUnit = useMemo(() => {
    if (selectedUnitCode === "all") {
      return configuredUnits.find((u) => u.is_canonical_base) || configuredUnits[0];
    }
    return (
      configuredUnits.find((u) => u.code.toUpperCase() === selectedUnitCode.toUpperCase()) ||
      configuredUnits[0]
    );
  }, [configuredUnits, selectedUnitCode]);

  const unitFactor = currentUnit?.conversion_factor || 1.0;
  const unitSymbol = currentUnit?.symbol || "g";
  const unitName = currentUnit?.name || "Gram";

  const overview = data?.overview;
  const today = data?.today;
  const sellerDistribution = data?.seller_distribution;
  const periodSellerDistribution = data?.period_seller_distribution;
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

  // Recharts Center Comparison Data (converted to active reporting unit)
  const centerChartData = useMemo(() => {
    return centers.map((c) => {
      const canonicalGrams = parseFloat(String(c.today_quantity_canonical || 0));
      const volume = parseFloat((canonicalGrams / unitFactor).toFixed(unitFactor >= 1000 ? 3 : 2));
      const purchases = c.today_purchases || 0;
      const avg_ticket = purchases > 0 ? parseFloat((volume / purchases).toFixed(unitFactor >= 1000 ? 3 : 2)) : 0;
      const totalVolume = parseFloat((parseFloat(String(c.total_quantity_canonical || 0)) / unitFactor).toFixed(unitFactor >= 1000 ? 3 : 2));
      return {
        name: c.name,
        code: c.code,
        volume,
        purchases,
        avg_ticket,
        totalVolume,
      };
    });
  }, [centers, unitFactor]);

  // Sourcing Distribution Donut Data (supports Period vs All-Time mode)
  const sourcingChartData = useMemo(() => {
    const dist = sourcingMode === "period" && periodSellerDistribution
      ? periodSellerDistribution
      : sellerDistribution;

    const companyVol = parseFloat(String(dist?.company?.canonical_quantity || 0));
    const asmVol = parseFloat(String(dist?.asm?.canonical_quantity || 0));

    return [
      {
        name: "Registered Companies",
        value: companyVol,
        purchases: dist?.company?.count || 0,
        color: "#0284c7",
      },
      {
        name: "Artisanal Miners (ASM)",
        value: asmVol,
        purchases: dist?.asm?.count || 0,
        color: "#f59e0b",
      },
    ];
  }, [sourcingMode, periodSellerDistribution, sellerDistribution]);

  // Statistical calculations (respects active reporting unit)
  const statisticalMetrics = useMemo(() => {
    const totalGrams = parseFloat(String(today?.canonical_quantity || 0));
    const totalPurchases = today?.purchases_count || 0;
    const days = Math.max(today?.days || 1, 1);

    const convertedTotalVolume = totalGrams / unitFactor;
    const avgTransactionWeight = totalPurchases > 0 ? (convertedTotalVolume / totalPurchases) : 0;
    const dailyVolumePace = convertedTotalVolume / days;

    // Top Center by Volume
    const sortedCenters = [...centers].sort((a, b) => (b.today_quantity_canonical || 0) - (a.today_quantity_canonical || 0));
    const topCenter = sortedCenters[0] || null;
    const topCenterVolume = parseFloat(String(topCenter?.today_quantity_canonical || 0)) / unitFactor;
    const topCenterShare = totalGrams > 0 ? (((topCenterVolume * unitFactor) / totalGrams) * 100).toFixed(1) : "0";

    // ASM Share in current distribution
    const dist = sourcingMode === "period" && periodSellerDistribution
      ? periodSellerDistribution
      : sellerDistribution;
    const companyGrams = parseFloat(String(dist?.company?.canonical_quantity || 0));
    const asmGrams = parseFloat(String(dist?.asm?.canonical_quantity || 0));
    const allGrams = companyGrams + asmGrams || 1;
    const asmSharePct = ((asmGrams / allGrams) * 100).toFixed(1);

    // Active centers reporting purchases in period
    const activeReportingCenters = centers.filter((c) => (c.today_purchases || 0) > 0).length;

    const volumeDecimals = unitFactor >= 1000 ? 3 : 2;

    return {
      avgTransactionWeight: avgTransactionWeight.toFixed(volumeDecimals),
      dailyVolumePace: dailyVolumePace.toLocaleString(undefined, { minimumFractionDigits: volumeDecimals, maximumFractionDigits: volumeDecimals + 1 }),
      topCenterName: topCenter ? topCenter.name : "N/A",
      topCenterVolume: topCenterVolume.toLocaleString(undefined, { minimumFractionDigits: volumeDecimals, maximumFractionDigits: volumeDecimals + 1 }),
      topCenterShare,
      asmSharePct,
      activeReportingCenters,
      totalCenters: centers.length,
    };
  }, [today, centers, sourcingMode, periodSellerDistribution, sellerDistribution, unitFactor]);

  return (
    <div className="space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Coins className="h-7 w-7 text-amber-500" />
              Federal Gold Purchasing Oversight
            </h1>
            {selectedCenter && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-xs py-0.5 px-2">
                {selectedCenter.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCenter
              ? `Filtered view for ${selectedCenter.name} (${selectedCenter.code}) — monitoring scoped transactions and analytics.`
              : "Centralized monitoring of purchasing center operations, canonical volume rollups, and daily report completion."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Global Center Selector Filter */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1 shadow-xs">
            <Store className="h-4 w-4 text-amber-500 shrink-0" />
            <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
              <SelectTrigger className="h-8 border-none p-0 text-xs shadow-none focus:ring-0 focus-visible:ring-0 w-[180px] sm:w-[210px]">
                <SelectValue placeholder="All Purchasing Centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Purchasing Centers</SelectItem>
                {allCenters.map((c) => (
                  <SelectItem key={c.purchasing_center_id} value={c.purchasing_center_id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Filter Selector */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2.5 py-1 shadow-xs">
            <Scale className="h-4 w-4 text-amber-500 shrink-0" />
            <Select value={selectedUnitCode} onValueChange={setSelectedUnitCode}>
              <SelectTrigger className="h-8 border-none p-0 text-xs shadow-none focus:ring-0 focus-visible:ring-0 w-[140px] sm:w-[160px]">
                <SelectValue placeholder="Unit: Gram (g)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRAM">Gram (g)</SelectItem>
                <SelectItem value="KG">Kilogram (kg)</SelectItem>
                {configuredUnits
                  .filter((u) => u.code.toUpperCase() !== "GRAM" && u.code.toUpperCase() !== "KG")
                  .map((u) => (
                    <SelectItem key={u.code} value={u.code.toUpperCase()}>
                      {u.name} ({u.symbol})
                    </SelectItem>
                  ))}
                <SelectItem value="all">All Configured Units</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      {/* ----------------- MULTI-UNIT REPORTING & CONVERSION MATRIX ----------------- */}
      <GoldUnitReportingMatrix
        canonicalGramsPeriod={today?.canonical_quantity || 0}
        canonicalGramsAllTime={overview?.total_quantity_canonical || 0}
        configuredUnits={configuredUnits}
        unitBreakdown={data?.unit_breakdown || []}
        selectedUnitCode={selectedUnitCode}
        onSelectUnit={setSelectedUnitCode}
        periodLabel={periodLabel}
        showCardsGrid={selectedUnitCode === "all"}
      />

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
            value={`${formatUnitVolume(today?.canonical_quantity || 0, currentUnit)} ${unitSymbol}`}
            subtitle={`Standardized weight in ${unitName}`}
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title={`${periodPrefix} Canonical Grams`}
            value={`${parseFloat(String(today?.canonical_quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Standard baseline intake"
            icon={Coins}
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

        {/* STATISTICAL SUMMARY TILES (DYNAMIC ANALYTICAL METRICS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Transaction Size
            </span>
            <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {statisticalMetrics.avgTransactionWeight} {unitSymbol}
            </p>
            <p className="text-[10px] text-muted-foreground">Per individual purchase</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Daily Intake Pace
            </span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ~{statisticalMetrics.dailyVolumePace} {unitSymbol}
            </p>
            <p className="text-[10px] text-muted-foreground">Estimated daily intake pace</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Reporting Centers
            </span>
            <p className="text-xl font-bold font-mono text-foreground">
              {statisticalMetrics.activeReportingCenters} / {statisticalMetrics.totalCenters}
            </p>
            <p className="text-[10px] text-muted-foreground">Active outposts in period</p>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Top Outpost Volume
            </span>
            <p className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {statisticalMetrics.topCenterVolume} {unitSymbol}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {statisticalMetrics.topCenterName} ({statisticalMetrics.topCenterShare}% share)
            </p>
          </div>
        </div>

        {/* COMPARATIVE GRAPHS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Center-by-Center Volume Bar Chart with Multi-Metric Toggle (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-500" />
                  Purchasing Center Comparison ({periodLabel})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Interactive multi-metric telemetry across all registered purchasing centers
                </p>
              </div>

              {/* Metric Switcher Controls */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border shrink-0 flex-wrap">
                {(
                  [
                    { key: "volume", label: `Canonical Gold (${unitSymbol})` },
                    { key: "purchases", label: "Transactions (#)" },
                    { key: "avg_ticket", label: `Avg Ticket (${unitSymbol})` },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveMetric(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      activeMetric === m.key
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
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
                      tickFormatter={(val) => {
                        if (activeMetric === "volume" || activeMetric === "avg_ticket") {
                          return `${val}${unitSymbol}`;
                        }
                        return `${val}`;
                      }}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="p-3 bg-popover/95 backdrop-blur-sm border border-border shadow-lg rounded-2xl text-xs space-y-1.5 min-w-[190px]">
                              <p className="font-bold text-foreground border-b border-border pb-1">
                                {label} ({item.code})
                              </p>
                              <div className="space-y-1">
                                <p className={`font-mono font-bold ${activeMetric === "volume" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                  • Volume: {item.volume.toLocaleString()} {unitSymbol}
                                </p>
                                <p className={`font-mono font-bold ${activeMetric === "purchases" ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"}`}>
                                  • Transactions: {item.purchases}
                                </p>
                                <p className={`font-mono font-bold ${activeMetric === "avg_ticket" ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                                  • Avg Ticket: {item.avg_ticket} {unitSymbol} / txn
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey={activeMetric}
                      name={
                        activeMetric === "volume"
                          ? "Canonical Gold (g)"
                          : activeMetric === "purchases"
                          ? "Transactions"
                          : "Avg Ticket Size (g)"
                      }
                      fill={
                        activeMetric === "volume"
                          ? "#f59e0b"
                          : activeMetric === "purchases"
                          ? "#0284c7"
                          : "#8b5cf6"
                      }
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No center volume data recorded.
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Channel Donut with Period vs All-Time Toggle (4 Cols) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-sky-500" />
                  Sourcing Parity
                </h4>
                <p className="text-xs text-muted-foreground">
                  {sourcingMode === "period" ? `Period share (${periodLabel})` : "All-time cumulative intake"}
                </p>
              </div>

              {/* Sourcing Mode Switch */}
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setSourcingMode("period")}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                    sourcingMode === "period"
                      ? "bg-background text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Period
                </button>
                <button
                  type="button"
                  onClick={() => setSourcingMode("all_time")}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                    sourcingMode === "all_time"
                      ? "bg-background text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All-Time
                </button>
              </div>
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
                                {d.purchases} purchases recorded
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
                <p className="text-xs text-muted-foreground">No sourcing data for selected window</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              {sourcingChartData.map((item) => {
                const total = sourcingChartData.reduce((a, b) => a + b.value, 0) || 1;
                const pct = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {item.value.toLocaleString()} g{" "}
                      <span className="text-[10px] text-muted-foreground font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- DYNAMIC NATIONWIDE ROLLUPS & OVERVIEW SECTION ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-500" />
              {overviewDisplayMode === "period"
                ? `Period Operational Rollups (${periodLabel})`
                : "Cumulative All-Time Nationwide Overview"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {overviewDisplayMode === "period"
                ? "Live consolidated performance and run-rate metrics matching current date filter"
                : "Historical aggregate metrics spanning the entire lifecycle of all registered centers"}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setOverviewDisplayMode("period")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                overviewDisplayMode === "period"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Period Analytics
            </button>
            <button
              type="button"
              onClick={() => setOverviewDisplayMode("cumulative")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                overviewDisplayMode === "cumulative"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cumulative All-Time
            </button>
          </div>
        </div>

        {overviewDisplayMode === "period" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Active Center Participation"
              value={`${statisticalMetrics.activeReportingCenters} of ${statisticalMetrics.totalCenters}`}
              subtitle={`${((statisticalMetrics.activeReportingCenters / Math.max(statisticalMetrics.totalCenters, 1)) * 100).toFixed(0)}% centers active in period`}
              icon={Store}
              accent="primary"
            />
            <KpiCard
              title={`Period Canonical Gold (${unitSymbol})`}
              value={`${formatUnitVolume(today?.canonical_quantity || 0, currentUnit)} ${unitSymbol}`}
              subtitle={`Daily pace: ~${statisticalMetrics.dailyVolumePace} ${unitSymbol}/day`}
              icon={Scale}
              accent="success"
            />
            <KpiCard
              title="Period Canonical Grams"
              value={`${parseFloat(String(today?.canonical_quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
              subtitle="Base metric in standard grams"
              icon={Coins}
              accent="warning"
            />
            <KpiCard
              title="Period Transactions"
              value={`${today?.purchases_count?.toLocaleString() || "0"}`}
              subtitle={`Mean size: ${statisticalMetrics.avgTransactionWeight} ${unitSymbol} / purchase`}
              icon={Coins}
              accent="info"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Active Purchasing Centers"
              value={`${overview?.active_centers || 0}`}
              subtitle={`${overview?.total_centers || 0} total registered outposts`}
              icon={Store}
              accent="primary"
            />
            <KpiCard
              title={`Total Gold Acquired (${unitSymbol})`}
              value={`${formatUnitVolume(overview?.total_quantity_canonical || 0, currentUnit)} ${unitSymbol}`}
              subtitle={`All-time canonical volume in ${unitName}`}
              icon={Scale}
              accent="success"
            />
            <KpiCard
              title="Cumulative Canonical Grams"
              value={`${parseFloat(String(overview?.total_quantity_canonical || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
              subtitle="All-time standard grams acquired"
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
        )}
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
    </div>
  );
}
