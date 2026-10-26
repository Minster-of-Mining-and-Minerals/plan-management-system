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
  DollarSign,
  PieChart,
  BarChart3,
  Layers,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { useBranding } from "@/providers/BrandingProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useGetPurchasingCenterDashboardQuery } from "@/redux/api/purchasingCenterApi";
import { useGetGoldCenterDashboardQuery } from "@/redux/api/goldApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import {
  AnalyticsPanel,
  DashboardSectionHeader,
} from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import { useDashboardAppearance } from "@/features/plan-management/dashboard/hooks/useDashboardAppearance";
import { SimpleBarChart } from "@/features/plan-management/dashboard/components/SimpleBarChart";
import { DonutStatCard } from "@/features/plan-management/dashboard/components/DonutStatCard";

export interface PurchasingCenterDashboardViewProps {
  overrideCenterId?: string;
  hideHeaderNavigation?: boolean;
}

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


  const centerInfo = baseData?.purchasing_center || goldData?.purchasing_center;
  const userCounts = baseData?.counts?.users;
  const today = goldData?.today;
  const period = goldData?.period_summary;
  const recentPurchases = goldData?.recent_purchases || [];
  const dailyTrends = goldData?.daily_trends || [];

  // Chart Items for Daily Volume Trends
  const volumeTrendItems = (dailyTrends || []).map((t) => ({
    label: t.date,
    value: parseFloat(parseFloat(String(t.canonical_quantity || 0)).toFixed(2)),
    subtitle: `${parseFloat(String(t.amount || 0)).toLocaleString()} ETB`,
    color: "#f59e0b",
  }));

  // Karat breakdown segments for Donut chart
  const karatPalette = ["#f59e0b", "#eab308", "#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#64748b"];
  const karatSegments = (period?.karat_breakdown || []).map((k, idx) => ({
    label: k.karat,
    value: parseFloat(parseFloat(String(k.canonical_quantity)).toFixed(2)),
    color: karatPalette[idx % karatPalette.length],
  }));

  // Quality grade segments for Donut chart
  const qualityPalette = ["#10b981", "#3b82f6", "#f59e0b", "#64748b", "#8b5cf6"];
  const qualitySegments = (period?.quality_breakdown || []).map((q, idx) => ({
    label: q.quality_grade,
    value: parseFloat(parseFloat(String(q.canonical_quantity)).toFixed(2)),
    color: qualityPalette[idx % qualityPalette.length],
  }));

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
        header: "Volume (g)",
        cell: ({ row }) => {
          const totalVol = period?.total_canonical_quantity || 1;
          const canonical = Number(row.original.canonical_quantity ?? 0);
          const sharePct = ((canonical / totalVol) * 100).toFixed(1);
          return (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
              {canonical.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              g <span className="text-[10px] text-muted-foreground font-normal">({sharePct}%)</span>
            </span>
          );
        },
      },
      {
        id: "amount",
        header: "Settlement",
        cell: ({ row }) => {
          const amt = Number(row.original.amount ?? row.original.total_amount ?? 0);
          return (
            <span className="font-mono font-semibold text-foreground text-xs text-right block">
              {amt.toLocaleString()} ETB
            </span>
          );
        },
      },
    ],
    [period]
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
        header: "Volume (g)",
        cell: ({ row }) => {
          const totalVol = period?.total_canonical_quantity || 1;
          const canonical = Number(row.original.canonical_quantity ?? 0);
          const sharePct = ((canonical / totalVol) * 100).toFixed(1);
          return (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
              {canonical.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              g <span className="text-[10px] text-muted-foreground font-normal">({sharePct}%)</span>
            </span>
          );
        },
      },
      {
        id: "amount",
        header: "Settlement",
        cell: ({ row }) => {
          const amt = Number(row.original.amount ?? row.original.total_amount ?? 0);
          return (
            <span className="font-mono font-semibold text-foreground text-xs text-right block">
              {amt.toLocaleString()} ETB
            </span>
          );
        },
      },
    ],
    [period]
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
              <span className="font-medium text-foreground text-xs">
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
          <span className="font-mono text-muted-foreground text-xs">
            {parseFloat(String(row.original.quantity_in_canonical_unit || 0)).toLocaleString()} g
          </span>
        ),
      },
      {
        id: "total_amount",
        header: "Total Amount",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-foreground text-xs">
            {parseFloat(String(row.original.total_amount || 0)).toLocaleString()} ETB
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
      <div className="p-8 text-center border rounded-2xl bg-destructive/5 text-destructive space-y-4 max-w-xl mx-auto my-12">
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
              <Button asChild size="default" className="gap-2 shadow-sm font-semibold">
                <Link href={`${basePath}/purchases/new`}>
                  <PlusCircle className="h-4 w-4" />
                  Record Purchase
                </Link>
              </Button>
            )}

            {can("GOLD_REPORTS:READ") && (
              <Button asChild variant="outline" size="default" className="gap-2 bg-background/80 backdrop-blur-sm">
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
            title="Today's Gold Quantity"
            value={`${(today?.canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Canonical weight (grams base)"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Today's Total Value"
            value={`${(today?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Total purchasing payout today"
            icon={DollarSign}
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

      {/* ----------------- CUMULATIVE PERIOD SUMMARY & TIME RANGE FILTER ----------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <DashboardSectionHeader
            title="Cumulative Purchasing Intelligence"
            description="Total gold volume acquired, canonical weight rollups, and supplier sourcing analytics"
          />

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 bg-card p-1 rounded-2xl border border-border shadow-xs self-start sm:self-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Gold Purchases"
            value={period?.total_purchases?.toLocaleString() || "0"}
            subtitle={`Transactions in ${timeRange === "all" ? "full history" : timeRange}`}
            icon={Coins}
            accent="primary"
          />
          <KpiCard
            title="Total Canonical Gold"
            value={`${(period?.total_canonical_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g`}
            subtitle="Aggregated standard metric weight"
            icon={Scale}
            accent="success"
          />
          <KpiCard
            title="Total Purchase Payout"
            value={`${(period?.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`}
            subtitle="Capital disbursed to suppliers"
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

      {/* ----------------- DIAGRAMS, CHARTS & VISUAL ANALYTICS ----------------- */}
      <div className="space-y-4">
        <DashboardSectionHeader
          title="Intake Visualizations & Diagrams"
          description="Visual intake trajectory, karat purity composition, and certified quality distributions"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Bar Chart */}
          <div className="lg:col-span-2">
            <SimpleBarChart
              title="Daily Gold Volume Intake Trends"
              description={`Canonical gold weight (grams) recorded per business day (${timeRange === "all" ? "all records" : timeRange})`}
              items={volumeTrendItems}
              valueSuffix=" g"
              height={240}
              color="#f59e0b"
            />
          </div>

          {/* Karat Donut */}
          <div>
            <DonutStatCard
              title="Karat Purity Sourcing"
              description="Gold weight canonical volume split by karat grade"
              segments={karatSegments}
              centerLabel="Canonical Gold"
              centerValue={`${(period?.total_canonical_quantity || 0).toFixed(1)}g`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quality Grading Donut */}
          <DonutStatCard
            title="Certified Quality Grade Breakdown"
            description="Volume distribution by export, commercial, and artisanal quality grades"
            segments={qualitySegments}
            centerLabel="Total Weight"
            centerValue={`${(period?.total_canonical_quantity || 0).toFixed(1)}g`}
          />

          {/* Unit Breakdown */}
          <AnalyticsPanel
            title="Recorded Quantity by Measurement Unit"
            description="Non-lossy totals displayed per configurable unit"
            headerAction={
              <Badge variant="outline" className="text-xs">
                {period?.unit_breakdown?.length || 0} Unit{period?.unit_breakdown?.length === 1 ? "" : "s"} Used
              </Badge>
            }
          >
            {period?.unit_breakdown && period.unit_breakdown.length > 0 ? (
              <div className="divide-y divide-border">
                {period.unit_breakdown.map((u) => (
                  <div key={u.code} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                        {u.symbol}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.purchase_count} transaction{u.purchase_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-foreground">
                        {u.total_quantity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{" "}
                        <span className="text-xs font-normal text-muted-foreground">{u.symbol}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No purchase records found for the selected period.
              </div>
            )}
          </AnalyticsPanel>
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
            description="Purchasing volume and payout per artisanal and small-scale miner"
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
