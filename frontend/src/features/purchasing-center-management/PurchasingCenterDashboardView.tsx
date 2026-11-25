"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Store,
  ArrowRight,
  Activity,
  Coins,
  Scale,
  Calendar,
  FileCheck2,
  HardHat,
  Building2,
  TrendingUp,
  Clock,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetPurchasingCenterDashboardQuery } from "@/redux/api/purchasingCenterApi";
import {
  useGetGoldCenterDashboardQuery,
  useGetGoldUnitsQuery,
} from "@/redux/api/goldApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { useDashboardAppearance } from "@/features/plan-management/dashboard/hooks/useDashboardAppearance";
import {
  GoldUnitReportingMatrix,
  resolveConfiguredUnits,
  formatUnitVolume,
} from "@/features/gold-purchasing/GoldUnitReportingMatrix";

export interface PurchasingCenterDashboardViewProps {
  overrideCenterId?: string;
  hideHeaderNavigation?: boolean;
}

const KARAT_PALETTE = ["#f59e0b", "#eab308", "#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#64748b"];
const QUALITY_PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#64748b"];

export function PurchasingCenterDashboardView({
  overrideCenterId,
  hideHeaderNavigation = false,
}: PurchasingCenterDashboardViewProps = {}) {
  const { data: session } = useSession();
  const { branding, logoPrimaryUrl } = useBranding();
  const { can } = usePermissions();
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const { tone } = useDashboardAppearance();
  const primaryTone = tone("primary");

  const sessionUser = session?.user as
    | (Record<string, unknown> & {
        purchasing_center_id?: string;
        name?: string;
        email?: string;
      })
    | undefined;
  const activeCenterId = overrideCenterId || params?.id || sessionUser?.purchasing_center_id;
  const basePath = activeCenterId
    ? `/purchasing-centers/${activeCenterId}`
    : "/purchasing-center";

  const [timeRange, setTimeRange] = useState<string>("30d");
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>("GRAM");

  // 1. Fetch purchasing center base metadata & user counts
  const {
    data: baseData,
    isLoading: isBaseLoading,
    error: baseError,
    refetch: refetchBase,
  } = useGetPurchasingCenterDashboardQuery(
    activeCenterId ? { purchasing_center_id: activeCenterId } : undefined
  );

  // 2. Fetch live gold purchasing dashboard aggregates with time range filtering
  const {
    data: goldData,
    isLoading: isGoldLoading,
    isFetching: isGoldFetching,
    refetch: refetchGold,
    error: goldError,
  } = useGetGoldCenterDashboardQuery(
    activeCenterId
      ? { purchasing_center_id: activeCenterId, time_range: timeRange }
      : { time_range: timeRange }
  );

  const { data: dbUnits = [] } = useGetGoldUnitsQuery();

  const configuredUnits = useMemo(
    () => resolveConfiguredUnits(goldData?.configured_units || dbUnits),
    [goldData?.configured_units, dbUnits]
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

  const centerInfo = baseData?.purchasing_center || goldData?.purchasing_center;
  const userCounts = baseData?.counts?.users;
  const today = goldData?.today;
  const period = goldData?.period_summary;
  const recentPurchases = goldData?.recent_purchases || [];
  const dailyTrends = goldData?.daily_trends || [];

  // Formatted chart data for Recharts daily trajectory (scaled by active unit)
  const dailyChartData = useMemo(() => {
    return (dailyTrends || []).map((t) => {
      const canonicalGrams = parseFloat(String(t.canonical_quantity || 0));
      return {
        date: t.date,
        volume: parseFloat((canonicalGrams / unitFactor).toFixed(unitFactor >= 1000 ? 3 : 2)),
        purchases: t.count || 0,
      };
    });
  }, [dailyTrends, unitFactor]);

  // Karat breakdown for Recharts Donut (scaled by active unit)
  const karatChartData = useMemo(() => {
    return (period?.karat_breakdown || []).map((k, idx) => ({
      name: k.karat,
      value: parseFloat((parseFloat(String(k.canonical_quantity || 0)) / unitFactor).toFixed(unitFactor >= 1000 ? 3 : 2)),
      count: k.count || 0,
      color: KARAT_PALETTE[idx % KARAT_PALETTE.length],
    }));
  }, [period, unitFactor]);

  // Quality grade breakdown for Recharts Bar Chart (scaled by active unit)
  const qualityChartData = useMemo(() => {
    return (period?.quality_breakdown || []).map((q, idx) => ({
      name: q.quality_grade,
      value: parseFloat((parseFloat(String(q.canonical_quantity || 0)) / unitFactor).toFixed(unitFactor >= 1000 ? 3 : 2)),
      count: q.count || 0,
      color: QUALITY_PALETTE[idx % QUALITY_PALETTE.length],
    }));
  }, [period, unitFactor]);

  // Sourcing Split: Company vs ASM (scaled by active unit)
  const sourcingSplitData = useMemo(() => {
    const companyVol = (period?.company_breakdown || []).reduce(
      (acc, c) => acc + (parseFloat(String(c.canonical_quantity)) || 0),
      0
    ) / unitFactor;
    const asmVol = (period?.asm_breakdown || []).reduce(
      (acc, a) => acc + (parseFloat(String(a.canonical_quantity)) || 0),
      0
    ) / unitFactor;

    return [
      { name: "Companies", value: parseFloat(companyVol.toFixed(unitFactor >= 1000 ? 3 : 2)), color: "#0284c7" },
      { name: "ASM Miners", value: parseFloat(asmVol.toFixed(unitFactor >= 1000 ? 3 : 2)), color: "#f59e0b" },
    ];
  }, [period, unitFactor]);

  const companyBreakdownColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Company",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span className="truncate max-w-[140px]">{row.original.name}</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">code: {row.original.code}</div>
          </div>
        ),
      },
      {
        accessorKey: "count",
        header: "Txns",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.count ?? row.original.purchases_count ?? 0}
          </span>
        ),
      },
      {
        id: "volume",
        header: `Volume (${unitSymbol})`,
        cell: ({ row }) => {
          const totalVol = (period?.total_canonical_quantity || 1) / unitFactor;
          const canonical = Number(row.original.canonical_quantity ?? 0) / unitFactor;
          const sharePct = ((canonical / totalVol) * 100).toFixed(1);
          return (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
              {canonical.toLocaleString(undefined, {
                minimumFractionDigits: unitFactor >= 1000 ? 3 : 2,
                maximumFractionDigits: unitFactor >= 1000 ? 4 : 3,
              })}{" "}
              {unitSymbol} <span className="text-[10px] text-muted-foreground font-normal">({sharePct}%)</span>
            </span>
          );
        },
      },
    ],
    [period, unitFactor, unitSymbol]
  );

  const asmBreakdownColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: "Miner Name",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <HardHat className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="truncate max-w-[140px]">{row.original.full_name}</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {row.original.mining_license_number
                ? `lic: ${row.original.mining_license_number}`
                : "Artisanal Seller"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "count",
        header: "Txns",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.count ?? row.original.purchases_count ?? 0}
          </span>
        ),
      },
      {
        id: "volume",
        header: `Volume (${unitSymbol})`,
        cell: ({ row }) => {
          const totalVol = (period?.total_canonical_quantity || 1) / unitFactor;
          const canonical = Number(row.original.canonical_quantity ?? 0) / unitFactor;
          const sharePct = ((canonical / totalVol) * 100).toFixed(1);
          return (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
              {canonical.toLocaleString(undefined, {
                minimumFractionDigits: unitFactor >= 1000 ? 3 : 2,
                maximumFractionDigits: unitFactor >= 1000 ? 4 : 3,
              })}{" "}
              {unitSymbol} <span className="text-[10px] text-muted-foreground font-normal">({sharePct}%)</span>
            </span>
          );
        },
      },
    ],
    [period, unitFactor, unitSymbol]
  );

  const recentPurchaseColumns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "purchase_reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono font-medium text-foreground text-xs">
            {row.original.purchase_reference}
          </span>
        ),
      },
      {
        accessorKey: "business_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {row.original.business_date}
          </span>
        ),
      },
      {
        id: "seller",
        header: "Seller",
        cell: ({ row }) => {
          const isCompany = row.original.seller_type === "company";
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  isCompany
                    ? "text-sky-600 dark:text-sky-400 border-sky-400/30 text-[10px]"
                    : "text-amber-600 dark:text-amber-400 border-amber-400/30 text-[10px]"
                }
              >
                {isCompany ? "Company" : "ASM"}
              </Badge>
              <span className="font-medium text-foreground text-xs truncate max-w-[140px]">
                {row.original.seller_name_snapshot}
              </span>
            </div>
          );
        },
      },
      {
        id: "quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {parseFloat(String(row.original.quantity || 0)).toLocaleString()}{" "}
            <span className="text-muted-foreground">{row.original.unit_code_snapshot}</span>
          </span>
        ),
      },
      {
        id: "canonical_g",
        header: "Base (g)",
        cell: ({ row }) => (
          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-xs">
            {parseFloat(String(row.original.quantity_in_canonical_unit || 0)).toLocaleString()} g
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const isCompleted = row.original.status === "completed";
          return (
            <Badge
              variant={isCompleted ? "default" : "destructive"}
              className={
                isCompleted
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
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <div className="text-right">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Link href={`${basePath}/purchases/${row.original.purchase_id}`}>
                View <ChevronRight className="h-3 w-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [basePath]
  );

  if (isBaseLoading || isGoldLoading) {
    return <Loading01 />;
  }

  if ((baseError && goldError) || (!baseData && !goldData && (baseError || goldError))) {
    return (
      <div className="p-8 text-center border rounded-3xl bg-destructive/5 text-destructive space-y-4 max-w-xl mx-auto my-12">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Unable to load purchasing center dashboard</h3>
          <p className="text-sm mt-1 text-muted-foreground">
            {((baseError as any)?.data?.message) || ((goldError as any)?.data?.message) || "There was an error communicating with purchasing center services."}
          </p>
        </div>
        <Button onClick={() => { refetchBase?.(); refetchGold?.(); }} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ----------------- HEADER & WELCOME HERO ----------------- */}
      <div
        className="rounded-3xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-all duration-300"
        style={{
          background: primaryTone.gradientBackground,
          borderColor: primaryTone.borderColor,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-background/95 border border-border shadow-md flex items-center justify-center p-2 shrink-0">
              {logoPrimaryUrl ? (
                <Image
                  src={logoPrimaryUrl}
                  alt={centerInfo?.name || "Purchasing Center Logo"}
                  width={48}
                  height={48}
                  className="max-h-12 w-auto object-contain rounded-lg"
                  unoptimized
                />
              ) : (
                <Coins className="h-8 w-8 text-amber-500" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {centerInfo?.name || "Gold Purchasing Center"}
                </h1>
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-semibold uppercase bg-background/80"
                  style={{
                    borderColor: primaryTone.borderColor,
                    color: primaryTone.color,
                  }}
                >
                  {centerInfo?.code || "PC"}
                </Badge>
                {centerInfo && <ActiveStatusBadge isActive={centerInfo.is_active} />}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {centerInfo?.description ||
                  branding.system_tagline ||
                  "Operational Gold Purchasing Registry, Dynamic Unit Measurement, and Daily Reporting."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {can("GOLD_PURCHASES:CREATE") && (
              <Button asChild size="default" className="gap-2 shadow-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950">
                <Link href={`${basePath}/purchases/new`}>
                  <PlusCircle className="h-4 w-4" />
                  Record Purchase
                </Link>
              </Button>
            )}

            {can("GOLD_REPORTS:READ") && (
              <Button asChild variant="outline" size="default" className="gap-2 bg-background/80 backdrop-blur-sm rounded-xl">
                <Link href={`${basePath}/reports/daily`}>
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Today's Report
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full opacity-20 pointer-events-none blur-3xl"
          style={{ background: primaryTone.color }}
        />
      </div>

      {/* ----------------- TODAY'S PURCHASING OPERATIONS ----------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <DashboardSectionHeader
            title="Today's Purchasing Operations"
            description={`Live gold purchase volume and daily reporting status for business date: ${today?.business_date || "Today"}`}
          />
          <Badge
            variant={today?.report_status === "submitted" ? "default" : "outline"}
            className={
              today?.report_status === "submitted"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 py-1 px-3 text-xs"
                : today?.report_status === "unsubmitted"
                ? "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10 gap-1.5 py-1 px-3 text-xs"
                : "border-muted-foreground text-muted-foreground gap-1.5 py-1 px-3 text-xs"
            }
          >
            {today?.report_status === "submitted" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Daily Report Submitted
              </>
            ) : today?.report_status === "unsubmitted" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Report Pending Submission
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5" /> No Purchases Today
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Today's Purchases"
            value={today?.purchases_count?.toLocaleString() || "0"}
            subtitle="Individual transactions recorded today"
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title={`Today's Gold Quantity (${unitSymbol})`}
            value={`${formatUnitVolume(today?.canonical_quantity || 0, currentUnit)} ${unitSymbol}`}
            subtitle={`Canonical weight in ${unitName}`}
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Today's Canonical Base (g)"
            value={`${parseFloat(String(today?.canonical_quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Authoritative gram benchmark"
            icon={Coins}
            accent="warning"
          />
          <KpiCard
            title="Daily Report Status"
            value={
              today?.report_status === "submitted"
                ? "Submitted"
                : today?.report_status === "unsubmitted"
                ? "Pending"
                : "Ready"
            }
            subtitle={
              today?.submitted_at
                ? `Submitted at ${new Date(today.submitted_at).toLocaleTimeString()}`
                : "Eligible purchases dynamically tracked"
            }
            icon={FileCheck2}
            accent={today?.report_status === "submitted" ? "success" : "info"}
          />
        </div>
      </div>

      {/* ----------------- MULTI-UNIT REPORTING & CONVERSION MATRIX ----------------- */}
      <GoldUnitReportingMatrix
        canonicalGramsPeriod={period?.total_canonical_quantity || today?.canonical_quantity || 0}
        canonicalGramsAllTime={period?.total_canonical_quantity || 0}
        configuredUnits={configuredUnits}
        unitBreakdown={period?.unit_breakdown || []}
        selectedUnitCode={selectedUnitCode}
        onSelectUnit={setSelectedUnitCode}
        periodLabel={timeRange === "today" ? "Today" : `${timeRange} Scope`}
        showCardsGrid={selectedUnitCode === "all"}
      />

      {/* ----------------- CUMULATIVE PERIOD SUMMARY & TIME RANGE FILTER ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <DashboardSectionHeader
            title="Cumulative Purchasing Intelligence"
            description="Total gold volume acquired, canonical weight rollups, and supplier sourcing analytics"
          />

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {/* Unit Selector */}
            <div className="flex items-center gap-1.5 bg-card p-1 rounded-2xl border border-border shadow-xs">
              <span className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                <Scale className="h-3 w-3 text-amber-500" /> Unit:
              </span>
              <Select value={selectedUnitCode} onValueChange={setSelectedUnitCode}>
                <SelectTrigger className="h-7 border-none p-0 text-xs shadow-none focus:ring-0 focus-visible:ring-0 w-[130px] font-semibold">
                  <SelectValue placeholder="Unit" />
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

            {/* Time Range Selector */}
            <div className="flex items-center gap-1.5 bg-card p-1 rounded-2xl border border-border shadow-xs">
              <span className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Range:
              </span>
              {[
                { id: "today", label: "Today" },
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "Quarter" },
                { id: "all", label: "All Time" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setTimeRange(r.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    timeRange === r.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Gold Purchases"
            value={period?.total_purchases?.toLocaleString() || "0"}
            subtitle={`Transactions in ${timeRange === "all" ? "full history" : timeRange}`}
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title={`Total Canonical Gold (${unitSymbol})`}
            value={`${formatUnitVolume(period?.total_canonical_quantity || 0, currentUnit)} ${unitSymbol}`}
            subtitle={`Aggregated volume in ${unitName}`}
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Canonical Standard Base"
            value={`${parseFloat(String(period?.total_canonical_quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Total standard weight in grams"
            icon={TrendingUp}
            accent="warning"
          />
          <KpiCard
            title="Sellers Sourced"
            value={period?.distinct_sellers?.total?.toLocaleString() || "0"}
            subtitle={`${period?.distinct_sellers?.companies || 0} Companies • ${period?.distinct_sellers?.asm || 0} ASM Miners`}
            icon={Users}
            accent="info"
          />
        </div>
      </div>

      {/* ----------------- INTERACTIVE RECHARTS VISUAL ANALYTICS ----------------- */}
      <div className="space-y-4">
        <DashboardSectionHeader
          title="Intake Visualizations & Diagrams"
          description="Visual intake trajectory, karat purity composition, certified quality grading, and supplier split"
        />

        {/* ROW 1: DUAL-AXIS AREA / BAR CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Trajectory Area Chart (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Daily Gold Intake Trajectory
                </h3>
                <p className="text-xs text-muted-foreground">
                  Daily canonical intake ({unitSymbol}) over time
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {dailyChartData.length} active business days
              </Badge>
            </div>

            <div className="h-72 w-full pt-2">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="#888888"
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#f59e0b"
                      tickLine={false}
                      tickFormatter={(val) => `${val}${unitSymbol}`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="p-3 bg-popover/95 backdrop-blur-sm border border-border shadow-lg rounded-2xl text-xs space-y-1">
                              <p className="font-bold text-foreground">{label}</p>
                              <p className="text-amber-600 dark:text-amber-400 font-mono">
                                Volume: {Number(payload[0]?.value).toLocaleString()} {unitSymbol}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      name={`Intake (${unitSymbol})`}
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#volumeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No daily trend data available for this range.
                </div>
              )}
            </div>
          </div>

          {/* Sourcing Channel Split Donut (4 cols) */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-sky-500" />
                Sourcing Channel Split
              </h3>
              <p className="text-xs text-muted-foreground">
                Corporate Mining Companies vs ASM Artisanal Miners
              </p>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {sourcingSplitData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcingSplitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sourcingSplitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const total = sourcingSplitData.reduce((a, b) => a + b.value, 0) || 1;
                          const pct = ((data.value / total) * 100).toFixed(1);
                          return (
                            <div className="p-2.5 bg-popover/95 border border-border shadow-md rounded-xl text-xs">
                              <p className="font-bold text-foreground">{data.name}</p>
                              <p className="font-mono text-muted-foreground">
                                {data.value.toLocaleString()} {unitSymbol} ({pct}%)
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
                <p className="text-xs text-muted-foreground">No sourcing data recorded</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              {sourcingSplitData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-[11px] font-medium text-foreground">{item.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{item.value.toLocaleString()} {unitSymbol}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 2: KARAT PURITY & QUALITY GRADE BREAKDOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Karat Donut */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  Karat Purity Composition
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gold weight canonical volume split by karat standard ({unitSymbol})
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {karatChartData.length} Karat types
              </Badge>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {karatChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={karatChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {karatChartData.map((entry, index) => (
                        <Cell key={`karat-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const total = karatChartData.reduce((a, b) => a + b.value, 0) || 1;
                          const pct = ((data.value / total) * 100).toFixed(1);
                          return (
                            <div className="p-2.5 bg-popover/95 border border-border shadow-md rounded-xl text-xs space-y-0.5">
                              <p className="font-bold text-foreground">{data.name}</p>
                              <p className="font-mono text-amber-600 dark:text-amber-400">
                                {data.value.toLocaleString()} {unitSymbol} ({pct}%)
                              </p>
                              <p className="text-[10px] text-muted-foreground">{data.count} purchases</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground">No karat breakdown data</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {karatChartData.map((k) => (
                <Badge key={k.name} variant="outline" className="text-xs gap-1.5 py-1 px-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: k.color }} />
                  <span>{k.name}: <strong>{k.value.toLocaleString()}{unitSymbol}</strong></span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Certified Quality Grade Horizontal / Vertical Bar Chart */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Quality Grade Certified Volume
                </h3>
                <p className="text-xs text-muted-foreground">
                  Intake volume ({unitSymbol}) categorized by export, commercial, and artisanal grade
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {qualityChartData.length} Grades
              </Badge>
            </div>

            <div className="h-56 w-full pt-2">
              {qualityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#888888" tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="#888888" tickLine={false} tickFormatter={(val) => `${val}${unitSymbol}`} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-popover/95 border border-border shadow-md rounded-xl text-xs space-y-0.5">
                              <p className="font-bold text-foreground">{label}</p>
                              <p className="font-mono text-emerald-600 dark:text-emerald-400">
                                {Number(data.value).toLocaleString()} {unitSymbol}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{data.count} purchases</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" name={`Volume (${unitSymbol})`} radius={[6, 6, 0, 0]}>
                      {qualityChartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No quality grade data recorded.
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {qualityChartData.map((q) => (
                <Badge key={q.name} variant="outline" className="text-xs gap-1.5 py-1 px-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color }} />
                  <span>{q.name}: <strong>{q.value.toLocaleString()}g</strong></span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- SUPPLIER DETAILED BREAKDOWN TABLES (COMPANIES & ASM MINERS) ----------------- */}
      <div className="space-y-4">
        <DashboardSectionHeader
          title="Supplier Performance & Sourcing Breakdown"
          description="Detailed tabular results per supplying mining companies and registered ASM miners"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Companies Breakdown Table */}
          <AnalyticsPanel
            title="Registered Companies Sourcing Ledger"
            description="Purchasing volume, transactions, and settlement per corporate seller"
            headerAction={
              <Badge variant="outline" className="text-xs font-mono">
                {period?.company_breakdown?.length || 0} Companies
              </Badge>
            }
          >
            <DataTable columns={companyBreakdownColumns} data={period?.company_breakdown || []} />
          </AnalyticsPanel>

          {/* ASM Miners Breakdown Table */}
          <AnalyticsPanel
            title="ASM Miners & Individual Sourcing Ledger"
            description="Purchasing volume and delivery history per artisanal and small-scale miner"
            headerAction={
              <Badge variant="outline" className="text-xs font-mono">
                {period?.asm_breakdown?.length || 0} Miners
              </Badge>
            }
          >
            <DataTable columns={asmBreakdownColumns} data={period?.asm_breakdown || []} />
          </AnalyticsPanel>
        </div>
      </div>

      {/* ----------------- RECENT GOLD PURCHASES REGISTER ----------------- */}
      <AnalyticsPanel
        title="Recent Gold Purchases"
        description="Latest purchasing transactions recorded by this purchasing center"
        headerAction={
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href={`${basePath}/purchases`}>
              View Full Register <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      >
        <DataTable columns={recentPurchaseColumns} data={recentPurchases} />
      </AnalyticsPanel>

      {/* ----------------- CENTER ACCOUNTS SUMMARY ----------------- */}
      <AnalyticsPanel
        title="Purchasing Center Staff & Accounts"
        description="Direct center users (no departments or hierarchical structures)"
        headerAction={
          can("PURCHASING_CENTER_USERS:READ") ? (
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href={`${basePath}/users`}>
                Manage Staff <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Total Staff Accounts</p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {userCounts?.total || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Active Staff</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {userCounts?.active || 0}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <p className="text-xs text-muted-foreground">Direct Membership</p>
            <p className="text-sm font-semibold mt-1 text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Center Bound
            </p>
          </div>
        </div>
      </AnalyticsPanel>
    </div>
  );
}
