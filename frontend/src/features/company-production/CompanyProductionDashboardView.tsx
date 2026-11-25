"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Factory,
  TrendingUp,
  Target,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Plus,
  Scale,
  FileText,
  BarChart3,
  Layers,
  HelpCircle,
  Activity,
  Sparkles,
  Filter,
  Search,
  ArrowUpRight,
  PieChart as PieIcon,
  ShieldCheck,
  Zap,
  X,
  ShieldAlert,
  SlidersHorizontal,
  Award,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CompanyProductionTabsHeader } from "./CompanyProductionTabsHeader";
import {
  useGetCompanyProductionDashboardQuery,
  useGetAssignmentsQuery,
  useGetProductionPerformanceQuery,
} from "@/redux/api/productionApi";
import type {
  CompanyProductionAssignment,
  CompanyProductionTarget,
} from "@/redux/types/production";

export function CompanyProductionDashboardView({
  companyId: propCompanyId,
}: {
  companyId?: string;
}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();

  const companyId = propCompanyId || params?.id || session?.user?.company_id;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedItemId, setSelectedItemId] = useState<string>("all");
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [selectedCompliance, setSelectedCompliance] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeDashboardTab, setActiveDashboardTab] = useState<
    "analytics" | "commitments" | "reports"
  >("analytics");

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    refetch,
  } = useGetCompanyProductionDashboardQuery(
    { companyId: companyId as string },
    { skip: !companyId }
  );

  const { data: assignments = [] } = useGetAssignmentsQuery(
    { company_id: companyId as string, is_active: true },
    { skip: !companyId }
  );

  const recentReports = dashboardData?.recent_reports || [];

  // Chart 2: Output Trajectory & Reporting Timeline (Hook unconditionally placed at top level)
  const timelineChartData = useMemo(() => {
    if (!recentReports || recentReports.length === 0) return [];
    const dateMap = new Map<string, number>();
    recentReports.forEach((r: any) => {
      const d = r.report_date;
      const q = Number(r.quantity_reported || r.normalized_quantity || 0);
      if (d) {
        dateMap.set(d, (dateMap.get(d) || 0) + q);
      }
    });
    const sortedDates = Array.from(dateMap.keys()).sort();
    let runningCumulative = 0;
    return sortedDates.map((date) => {
      const dailyQty = dateMap.get(date) || 0;
      runningCumulative += dailyQty;
      return {
        date: date.length > 5 ? date.slice(5) : date,
        fullDate: date,
        daily: dailyQty,
        cumulative: runningCumulative,
      };
    });
  }, [recentReports]);

  if (isLoading) {
    return <Loading01 />;
  }

  if (!companyId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Unauthorized Company Context</h2>
        <p className="text-sm text-muted-foreground mt-1">
          No company context was identified for your active session.
        </p>
      </div>
    );
  }

  const performances = dashboardData?.performances || [];

  // Multi-Filter Application
  const filteredPerformances = performances.filter((p) => {
    // 1. Mineral Item filter
    if (
      selectedItemId !== "all" &&
      p.assignment.production_item_id !== selectedItemId
    ) {
      return false;
    }
    // 2. Search query filter (matches name, code, or assignment id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (
        p.performance.production_item?.name ||
        p.assignment.productionItem?.name ||
        ""
      ).toLowerCase();
      const code = (
        p.performance.production_item?.code ||
        p.assignment.productionItem?.code ||
        ""
      ).toLowerCase();
      const assignId = (p.assignment.assignment_id || "").toLowerCase();
      if (!name.includes(q) && !code.includes(q) && !assignId.includes(q)) {
        return false;
      }
    }
    // 3. Health status filter
    const achievement = p.performance.achievement_percentage ?? 0;
    if (selectedHealth === "completed" && achievement < 100) return false;
    if (
      selectedHealth === "on_track" &&
      (achievement < 70 || achievement >= 100)
    )
      return false;
    if (
      selectedHealth === "moderate" &&
      (achievement < 40 || achievement >= 70)
    )
      return false;
    if (selectedHealth === "at_risk" && achievement >= 40) return false;

    // 4. Compliance filter
    const compRate =
      p.performance.reporting_compliance?.compliance_rate ?? 100;
    if (selectedCompliance === "high" && compRate < 80) return false;
    if (selectedCompliance === "low" && compRate >= 80) return false;

    return true;
  });

  // Aggregated Portfolio Metrics
  let totalTarget = 0;
  let totalActual = 0;
  let totalExpectedReports = 0;
  let totalSubmittedReports = 0;
  let totalMissingReports = 0;
  let completedCount = 0;
  let onTrackCount = 0;
  let moderateCount = 0;
  let atRiskCount = 0;

  performances.forEach((p) => {
    const t = Number(p.performance.target_quantity || 0);
    const a = Number(p.performance.actual_quantity || 0);
    const ach =
      p.performance.achievement_percentage ??
      (t > 0 ? (a / t) * 100 : 0);

    totalTarget += t;
    totalActual += a;

    if (ach >= 100) completedCount++;
    else if (ach >= 70) onTrackCount++;
    else if (ach >= 40) moderateCount++;
    else atRiskCount++;

    if (p.performance.reporting_compliance) {
      totalExpectedReports +=
        p.performance.reporting_compliance.expected_reports || 0;
      totalSubmittedReports +=
        p.performance.reporting_compliance.submitted_reports || 0;
      totalMissingReports +=
        p.performance.reporting_compliance.missing_reports || 0;
    }
  });

  const netVariance = totalActual - totalTarget;
  const overallAchievementPct =
    totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  const overallComplianceRate =
    totalExpectedReports > 0
      ? Math.min(
          100,
          Math.round((totalSubmittedReports / totalExpectedReports) * 100)
        )
      : 100;

  // Chart 1: Target vs Actual by Mineral Item
  const targetVsActualChartData = filteredPerformances.map((p) => {
    const name =
      p.performance.production_item?.name ||
      p.assignment.productionItem?.name ||
      "Mineral";
    const target = Number(p.performance.target_quantity || 0);
    const actual = Number(p.performance.actual_quantity || 0);
    const unit =
      p.performance.display_unit?.symbol ||
      p.assignment.defaultReportingUnit?.symbol ||
      "";
    const ach =
      p.performance.achievement_percentage ??
      (target > 0 ? Math.round((actual / target) * 100) : 0);
    return {
      name: name.length > 15 ? `${name.slice(0, 13)}...` : name,
      fullName: name,
      target,
      actual,
      achievement: ach,
      unit,
    };
  });

  // Chart 3: Mineral Output Share (Donut)
  const piePalette = [
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
    "#f97316",
  ];

  const mineralShareData = filteredPerformances
    .filter((p) => Number(p.performance.actual_quantity || 0) > 0)
    .map((p, idx) => ({
      name:
        p.performance.production_item?.name ||
        p.assignment.productionItem?.name ||
        `Mineral ${idx + 1}`,
      value: Number(p.performance.actual_quantity || 0),
      color: piePalette[idx % piePalette.length],
      unit:
        p.performance.display_unit?.symbol ||
        p.assignment.defaultReportingUnit?.symbol ||
        "",
    }));

  // Chart 4: Reporting Compliance Benchmark
  const complianceChartData = filteredPerformances.map((p) => {
    const name =
      p.performance.production_item?.name ||
      p.assignment.productionItem?.name ||
      "Mineral";
    const comp = p.performance.reporting_compliance;
    return {
      name: name.length > 15 ? `${name.slice(0, 13)}...` : name,
      fullName: name,
      submitted: comp?.submitted_reports || 0,
      missing: comp?.missing_reports || 0,
      expected: comp?.expected_reports || 0,
      rate: comp?.compliance_rate || 100,
    };
  });

  const recentReportColumns: ColumnDef<any>[] = [
    {
      accessorKey: "report_date",
      header: "Production Date",
      cell: ({ row }) => (
        <span className="font-medium font-mono text-xs">
          {row.original.report_date}
        </span>
      ),
    },
    {
      id: "item",
      header: "Item",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Factory className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="font-semibold text-xs">
            {row.original.productionItem?.name || "N/A"}
          </span>
        </div>
      ),
    },
    {
      id: "reported_quantity",
      header: "Reported Quantity",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground text-xs font-mono">
          {Number(row.original.quantity_reported).toLocaleString()}{" "}
          <span className="text-muted-foreground font-sans font-normal text-[11px]">
            {row.original.reportedUnit?.symbol ||
              row.original.reportedUnit?.code}
          </span>
        </span>
      ),
    },
    {
      id: "base_quantity",
      header: "Base Quantity",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {Number(row.original.normalized_quantity).toLocaleString()}{" "}
          {row.original.productionItem?.baseUnit?.symbol ||
            (row.original.productionItem as any)?.base_unit?.symbol ||
            "base"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "approved"
                ? "default"
                : s === "submitted"
                ? "secondary"
                : s === "rejected"
                ? "destructive"
                : "outline"
            }
            className={`capitalize text-[11px] font-semibold ${
              s === "approved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                : s === "submitted"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                : ""
            }`}
          >
            {s}
          </Badge>
        );
      },
    },
    {
      id: "submitted_by",
      header: "Submitted By",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.submittedByUser?.full_name || "Self-Reported"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const assignId = row.original.assignment_id;
        return assignId ? (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
          >
            <Link
              href={`/companies/${companyId}/productions/${assignId}?tab=reporting`}
            >
              Matrix &rarr;
            </Link>
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===================== HEADER ===================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-card to-card p-6 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
              <Factory className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Company Production Operations
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
                >
                  Concession Execution
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time tracking of mineral production actuals, scheduled reporting compliance, and target hierarchies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 h-9 border-border/80 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Sync Actuals
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-2 h-9 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs"
          >
            <Link href={`/companies/${companyId}/production/submit`}>
              <Plus className="h-4 w-4" />
              Submit Daily Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <CompanyProductionTabsHeader companyId={companyId} />

      {/* ===================== EMPTY STATE ===================== */}
      {performances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Scale className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No Production Reporting Configured
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Federal administrators have not yet assigned mineral production items or reporting targets to your company.
            Once configured, you will be able to submit scheduled reports and track performance against your targets here.
          </p>
        </div>
      ) : (
        <>
          {/* ===================== MULTI-FILTER SUITE ===================== */}
          <div className="bg-card p-4 rounded-2xl border border-border/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                <span>Portfolio Analytics & Concession Filters</span>
              </div>
              {(selectedItemId !== "all" ||
                selectedHealth !== "all" ||
                selectedCompliance !== "all" ||
                searchQuery.trim()) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedItemId("all");
                    setSelectedHealth("all");
                    setSelectedCompliance("all");
                    setSearchQuery("");
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mineral, code..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Mineral Item Filter */}
              <div>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">
                    All Minerals ({performances.length})
                  </option>
                  {Array.from(
                    new Map(
                      performances.map((p) => [
                        p.assignment.production_item_id,
                        p,
                      ])
                    ).values()
                  ).map((p) => (
                    <option
                      key={p.assignment.assignment_id}
                      value={p.assignment.production_item_id}
                    >
                      {p.performance.production_item?.name ||
                        p.assignment.productionItem?.name}{" "}
                      ({p.assignment.productionItem?.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Health Filter */}
              <div>
                <select
                  value={selectedHealth}
                  onChange={(e) => setSelectedHealth(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Execution Health</option>
                  <option value="completed">Completed (&ge;100%)</option>
                  <option value="on_track">On Track (70% - 99%)</option>
                  <option value="moderate">In Progress (40% - 69%)</option>
                  <option value="at_risk">At Risk (&lt;40%)</option>
                </select>
              </div>

              {/* Compliance Filter */}
              <div>
                <select
                  value={selectedCompliance}
                  onChange={(e) => setSelectedCompliance(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Compliance Cadences</option>
                  <option value="high">High Compliance (&ge;80%)</option>
                  <option value="low">Needs Attention (&lt;80%)</option>
                </select>
              </div>

              {/* Calendar Year Indicator */}
              <div className="flex items-center justify-between px-3 h-9 rounded-lg border border-border/80 bg-muted/20 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  Cycle Year
                </span>
                <span className="font-bold text-foreground">{selectedYear}</span>
              </div>
            </div>

            {/* Dashboard View Mode Toggle Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={activeDashboardTab === "analytics" ? "default" : "outline"}
                  onClick={() => setActiveDashboardTab("analytics")}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeDashboardTab === "analytics"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Visual Analytics & Charts
                </Button>

                <Button
                  size="sm"
                  variant={activeDashboardTab === "commitments" ? "default" : "outline"}
                  onClick={() => setActiveDashboardTab("commitments")}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeDashboardTab === "commitments"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Mineral Commitments ({filteredPerformances.length})
                </Button>

                <Button
                  size="sm"
                  variant={activeDashboardTab === "reports" ? "default" : "outline"}
                  onClick={() => setActiveDashboardTab("reports")}
                  className={`h-8 text-xs font-semibold gap-1.5 ${
                    activeDashboardTab === "reports"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Recent Daily Reports ({recentReports.length})
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono">
                Showing {filteredPerformances.length} of {performances.length} assignments
              </div>
            </div>
          </div>

          {/* ===================== OVERVIEW KPI CARDS (6 METRIC SUITE) ===================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* 1. Assigned Minerals */}
            <Card className="border border-border/80 bg-card p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Active Concessions
                </span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Factory className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {performances.length}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Active mineral production portfolios
              </div>
            </Card>

            {/* 2. Total Approved Target */}
            <Card className="border border-border/80 bg-card p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Approved Target
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Target className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono truncate">
                {totalTarget.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Annual concession target commitment
              </div>
            </Card>

            {/* 3. Total Extracted Output */}
            <Card className="border border-border/80 bg-card p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Total Extracted
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300 font-mono truncate">
                {totalActual.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
                Verified extraction volume
              </div>
            </Card>

            {/* 4. Net Variance */}
            <Card className="border border-border/80 bg-card p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Net Variance
                </span>
                <span
                  className={`p-1.5 rounded-lg ${
                    netVariance >= 0
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  }`}
                >
                  <Scale className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className={`text-2xl font-bold tracking-tight font-mono truncate ${
                  netVariance >= 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {netVariance >= 0 ? "+" : ""}
                {netVariance.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {netVariance >= 0 ? "Production surplus" : "Production deficit"}
              </div>
            </Card>

            {/* 5. Execution Health % (Red to Green Indicator) */}
            <Card
              className={`border p-4 shadow-xs space-y-1 ${
                overallAchievementPct >= 100
                  ? "border-emerald-300 bg-emerald-500/5 dark:border-emerald-900/40"
                  : overallAchievementPct >= 70
                  ? "border-teal-300 bg-teal-500/5 dark:border-teal-900/40"
                  : overallAchievementPct >= 40
                  ? "border-amber-300 bg-amber-500/5 dark:border-amber-900/40"
                  : "border-rose-300 bg-rose-500/5 dark:border-rose-900/40"
              }`}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Achievement Rate
                </span>
                <span
                  className={`p-1.5 rounded-lg ${
                    overallAchievementPct >= 100
                      ? "bg-emerald-500/15 text-emerald-600"
                      : overallAchievementPct >= 70
                      ? "bg-teal-500/15 text-teal-600"
                      : overallAchievementPct >= 40
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-rose-500/15 text-rose-600"
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className={`text-2xl font-bold tracking-tight font-mono ${
                  overallAchievementPct >= 100
                    ? "text-emerald-700 dark:text-emerald-300"
                    : overallAchievementPct >= 70
                    ? "text-teal-700 dark:text-teal-300"
                    : overallAchievementPct >= 40
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {overallAchievementPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {overallAchievementPct >= 100
                  ? "Exceeding targets"
                  : overallAchievementPct >= 70
                  ? "On pace to deliver"
                  : overallAchievementPct >= 40
                  ? "Moderate delivery pace"
                  : "At critical risk"}
              </div>
            </Card>

            {/* 6. Regulatory Compliance */}
            <Card className="border border-border/80 bg-card p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider">
                  Reporting Compliance
                </span>
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {overallComplianceRate}%
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {totalSubmittedReports}/{totalExpectedReports} scheduled reports
              </div>
            </Card>
          </div>

          {/* ===================== OVERALL CONCESSION TARGET COMPLETION PROGRESS BAR ===================== */}
          {/* Dynamic coloring range from RED to GREEN based on percentage progress */}
          <Card
            className={`border p-5 shadow-xs space-y-3 transition-colors ${
              overallAchievementPct >= 100
                ? "border-emerald-300/70 bg-gradient-to-r from-emerald-500/10 via-card to-card dark:border-emerald-900/40"
                : overallAchievementPct >= 75
                ? "border-teal-300/70 bg-gradient-to-r from-teal-500/10 via-card to-card dark:border-teal-900/40"
                : overallAchievementPct >= 40
                ? "border-amber-300/70 bg-gradient-to-r from-amber-500/10 via-card to-card dark:border-amber-900/40"
                : "border-rose-300/70 bg-gradient-to-r from-rose-500/10 via-card to-card dark:border-rose-900/40"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  Overall Concession Target Completion
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-mono">
                  {totalActual.toLocaleString()} of{" "}
                  {totalTarget.toLocaleString()} Output Extracted
                </span>
              </div>

              {/* Dynamic Status Pill */}
              <Badge
                className={`font-mono text-[10.5px] font-bold border px-2.5 py-0.5 shadow-2xs self-start sm:self-auto ${
                  overallAchievementPct >= 100
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                    : overallAchievementPct >= 75
                    ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300"
                    : overallAchievementPct >= 40
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                }`}
              >
                {overallAchievementPct >= 100
                  ? `Fully Completed (${overallAchievementPct.toFixed(1)}%)`
                  : overallAchievementPct >= 75
                  ? `On Track (${overallAchievementPct.toFixed(1)}%)`
                  : overallAchievementPct >= 40
                  ? `Moderate Progress (${overallAchievementPct.toFixed(1)}%)`
                  : `At Risk / Deficit (${overallAchievementPct.toFixed(1)}%)`}
              </Badge>
            </div>

            {/* Red to Green Dynamic Gradient Progress Bar */}
            <div className="w-full h-4 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  overallAchievementPct >= 100
                    ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 shadow-sm shadow-emerald-500/50"
                    : overallAchievementPct >= 75
                    ? "bg-gradient-to-r from-lime-500 to-emerald-500 shadow-sm shadow-emerald-500/40"
                    : overallAchievementPct >= 40
                    ? "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-sm shadow-amber-500/30"
                    : "bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 shadow-sm shadow-red-500/40"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(2, overallAchievementPct))}%`,
                }}
              />
            </div>

            {/* Bottom Status Breakdown Footnote */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Completed: <strong>{completedCount}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  On Track: <strong>{onTrackCount}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  In Progress: <strong>{moderateCount}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  At Risk: <strong>{atRiskCount}</strong>
                </span>
              </div>
              <span className="font-mono text-[10px]">
                {totalMissingReports > 0
                  ? `${totalMissingReports} scheduled report(s) missing`
                  : "All daily reporting up to date"}
              </span>
            </div>
          </Card>

          {/* ===================== TAB CONTENT: ANALYTICS & CHARTS ===================== */}
          {activeDashboardTab === "analytics" && (
            <div className="space-y-6">
              {/* Executive Intelligence Narrative */}
              <Card className="border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-br from-amber-500/5 via-card to-card p-5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>Executive Concession Intelligence Synthesis</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50"
                  >
                    Automated Assessment
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Your mining enterprise currently manages{" "}
                  <strong>{performances.length}</strong> active mineral
                  concessions with an approved annual production target totaling{" "}
                  <strong>{totalTarget.toLocaleString()}</strong> output units.
                  To date, verified extraction across all operations stands at{" "}
                  <strong>{totalActual.toLocaleString()}</strong> units (
                  <strong>{overallAchievementPct.toFixed(1)}%</strong> overall
                  portfolio completion). Regulatory reporting compliance is at{" "}
                  <strong>{overallComplianceRate}%</strong> with{" "}
                  <strong>{totalSubmittedReports}</strong> reports submitted and{" "}
                  <strong>{totalMissingReports}</strong> missing windows
                  requiring immediate entry.
                </p>
              </Card>

              {/* Grid of 4 Interactive Recharts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Target vs Actual Extracted by Mineral Item */}
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-amber-600" />
                        Concession Extraction vs. Target by Mineral
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Target vs Actual
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Comparative side-by-side annual commitments and actual verified yield
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    {targetVsActualChartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        No mineral data matching active filter.
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={targetVsActualChartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                              opacity={0.6}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              interval={0}
                              angle={-20}
                              textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="p-2.5 rounded-lg border border-border bg-popover shadow-md text-xs space-y-1">
                                      <div className="font-bold text-foreground">
                                        {data.fullName}
                                      </div>
                                      <div className="text-amber-600 font-mono">
                                        Target: {data.target.toLocaleString()}{" "}
                                        {data.unit}
                                      </div>
                                      <div className="text-emerald-600 font-mono">
                                        Actual: {data.actual.toLocaleString()}{" "}
                                        {data.unit}
                                      </div>
                                      <div className="text-primary font-semibold text-[11px] pt-1 border-t border-border/50">
                                        Achievement: {data.achievement}%
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                            />
                            <Bar
                              dataKey="target"
                              name="Approved Target"
                              fill="#f59e0b"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="actual"
                              name="Actual Extracted"
                              fill="#10b981"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chart 2: Output Velocity & Reporting Timeline */}
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        Extraction Output Velocity & Timeline
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Trajectory
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Daily extraction reporting trajectory from validated reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    {timelineChartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        No daily report records available for timeline curve.
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={timelineChartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                          >
                            <defs>
                              <linearGradient
                                id="dailyGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#10b981"
                                  stopOpacity={0.4}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#10b981"
                                  stopOpacity={0.0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                              opacity={0.6}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              angle={-20}
                              textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="p-2.5 rounded-lg border border-border bg-popover shadow-md text-xs space-y-1">
                                      <div className="font-bold text-foreground">
                                        Date: {data.fullDate}
                                      </div>
                                      <div className="text-emerald-600 font-mono">
                                        Output Logged:{" "}
                                        {data.daily.toLocaleString()} units
                                      </div>
                                      <div className="text-muted-foreground font-mono text-[11px]">
                                        Cumulative Volume:{" "}
                                        {data.cumulative.toLocaleString()} units
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="daily"
                              name="Reported Output"
                              stroke="#10b981"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#dailyGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chart 3: Mineral Output Share (Donut) */}
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <PieIcon className="h-4 w-4 text-purple-600" />
                        Portfolio Mineral Yield Contribution
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Share %
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Proportional extraction output across active mineral concessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    {mineralShareData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        No extraction yield recorded yet.
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mineralShareData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {mineralShareData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  const pct =
                                    totalActual > 0
                                      ? (
                                          (data.value / totalActual) *
                                          100
                                        ).toFixed(1)
                                      : 0;
                                  return (
                                    <div className="p-2.5 rounded-lg border border-border bg-popover shadow-md text-xs space-y-1">
                                      <div className="font-bold text-foreground">
                                        {data.name}
                                      </div>
                                      <div className="font-mono text-emerald-600">
                                        Extracted: {data.value.toLocaleString()}{" "}
                                        {data.unit}
                                      </div>
                                      <div className="text-muted-foreground font-semibold">
                                        Portfolio Share: {pct}%
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Chart 4: Reporting Compliance Benchmark */}
                <Card className="border border-border/80 shadow-xs">
                  <CardHeader className="p-4 pb-2 border-b bg-muted/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        Reporting Compliance & Submission Cadence
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Integrity
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Submitted vs missing daily reports against statutory schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-5">
                    {complianceChartData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                        No compliance records found.
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={complianceChartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                              opacity={0.6}
                            />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              angle={-20}
                              textAnchor="end"
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="p-2.5 rounded-lg border border-border bg-popover shadow-md text-xs space-y-1">
                                      <div className="font-bold text-foreground">
                                        {data.fullName}
                                      </div>
                                      <div className="text-emerald-600 font-mono">
                                        Submitted: {data.submitted} reports
                                      </div>
                                      <div className="text-rose-600 font-mono">
                                        Missing: {data.missing} reports
                                      </div>
                                      <div className="text-primary font-semibold text-[11px] pt-1 border-t border-border/50">
                                        Compliance Rate: {data.rate}%
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                            />
                            <Bar
                              dataKey="submitted"
                              name="Submitted Reports"
                              fill="#10b981"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="missing"
                              name="Missing Windows"
                              fill="#f43f5e"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ===================== TAB CONTENT: COMMITMENT CARDS ===================== */}
          {activeDashboardTab === "commitments" && (
            <div className="space-y-6">
              {filteredPerformances.length === 0 ? (
                <div className="p-8 text-center border rounded-2xl bg-card text-muted-foreground">
                  No mineral commitments matching your filter criteria.
                </div>
              ) : (
                filteredPerformances.map((itemPerf) => (
                  <AssignmentCommitmentCard
                    key={itemPerf.assignment.assignment_id}
                    companyId={companyId}
                    itemPerf={itemPerf}
                  />
                ))
              )}
            </div>
          )}

          {/* ===================== TAB CONTENT: RECENT REPORTS TABLE ===================== */}
          {activeDashboardTab === "reports" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Recent Production Reports
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Latest validated and submitted reports for this company
                  </p>
                </div>

                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href={`/companies/${companyId}/production/reports`}>
                    View All Reports
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <DataTable columns={recentReportColumns} data={recentReports} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssignmentCommitmentCard({
  companyId,
  itemPerf,
}: {
  companyId: string;
  itemPerf: any;
}) {
  const { assignment, performance: initialPerformance } = itemPerf;
  const [selectedPeriodLabel, setSelectedPeriodLabel] =
    useState<string>("annual");

  // Child targets breakdown if configured (e.g. Q1, Q2, Q3, Q4)
  const childTargets = (assignment.targets || []).filter(
    (t: CompanyProductionTarget) =>
      t.target_period_type !== "year" && t.status === "published"
  );

  const selectedChildTarget = childTargets.find(
    (ct: CompanyProductionTarget) => ct.period_label === selectedPeriodLabel
  );

  // Authoritative backend drill-down query for selected sub-period
  const { data: drillDownPerformance, isFetching: isDrillingDown } =
    useGetProductionPerformanceQuery(
      {
        company_id: companyId,
        production_item_id: assignment.production_item_id,
        period_label: selectedPeriodLabel,
        period_type: selectedChildTarget?.target_period_type,
        start_date: selectedChildTarget?.period_start_date,
        end_date: selectedChildTarget?.period_end_date,
      },
      { skip: selectedPeriodLabel === "annual" }
    );

  const performance =
    selectedPeriodLabel === "annual"
      ? initialPerformance
      : drillDownPerformance || initialPerformance;

  const prodItem = performance.production_item;
  const unitSymbol =
    performance.display_unit?.symbol || performance.display_unit?.code || "";
  const achievement = performance.achievement_percentage;
  const isOverachieved = performance.is_overachieved;
  const targetQty = performance.target_quantity;
  const actualQty = performance.actual_quantity;
  const remainingQty = performance.remaining_quantity;
  const estimate = performance.projected_estimate;

  return (
    <div
      className={`rounded-2xl border p-6 shadow-xs space-y-6 transition-all bg-card ${
        isOverachieved || (achievement !== null && achievement >= 100)
          ? "border-emerald-500/40 hover:border-emerald-500/70"
          : achievement !== null && achievement >= 70
          ? "border-teal-500/40 hover:border-teal-500/70"
          : achievement !== null && achievement >= 40
          ? "border-amber-500/40 hover:border-amber-500/70"
          : "border-rose-500/40 hover:border-rose-500/70"
      }`}
    >
      {/* Item Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Factory className="h-5 w-5 text-amber-600" />
              {prodItem?.name}
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              {prodItem?.code}
            </Badge>
            {performance.target_version && (
              <Badge variant="secondary" className="text-xs">
                Target v{performance.target_version}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs capitalize bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300"
            >
              {assignment.reportingFrequency?.name || "Daily"} Reporting
            </Badge>

            {/* Health Badge with Red to Green Coloring */}
            <Badge
              className={`font-mono text-[10px] font-bold border ${
                isOverachieved || (achievement !== null && achievement >= 100)
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                  : achievement !== null && achievement >= 70
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300"
                  : achievement !== null && achievement >= 40
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
              }`}
            >
              {achievement !== null
                ? achievement >= 100
                  ? "Fully Completed"
                  : achievement >= 70
                  ? "On Track"
                  : achievement >= 40
                  ? "In Progress"
                  : "At Risk"
                : "No Target"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Allocation Depth:{" "}
            <strong className="capitalize">
              {assignment.target_allocation_depth}
            </strong>
            {" • "}Default Reporting Unit:{" "}
            <strong>
              {assignment.defaultReportingUnit?.name || unitSymbol}
            </strong>
            {" • "}Effective:{" "}
            <strong>
              {assignment.effective_from} to{" "}
              {assignment.effective_to || "Indefinite"}
            </strong>
          </p>
        </div>

        {/* Action Buttons: Direct Jump Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs h-8 text-xs font-semibold"
          >
            <Link
              href={`/companies/${companyId}/productions/${assignment.assignment_id}?tab=reporting`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Daily Matrix
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-700"
          >
            <Link
              href={`/companies/${companyId}/productions/${assignment.assignment_id}?tab=analytics`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Concession Analytics
            </Link>
          </Button>

          <Button asChild size="sm" variant="ghost" className="gap-1 h-8 text-xs">
            <Link
              href={`/companies/${companyId}/production/reports?item_id=${assignment.production_item_id}`}
            >
              Reports
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Drill-down Active Banner */}
      {selectedPeriodLabel !== "annual" && (
        <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-3 rounded-xl text-xs text-teal-900 dark:text-teal-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-teal-600 shrink-0" />
            <span>
              Drill-down active: Showing <strong>{selectedPeriodLabel}</strong>{" "}
              performance ({performance.period?.start_date} to{" "}
              {performance.period?.end_date})
            </span>
            {isDrillingDown && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-teal-600" />
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPeriodLabel("annual")}
            className="h-7 text-xs text-teal-700 hover:text-teal-800 dark:text-teal-300 font-semibold hover:bg-teal-100 dark:hover:bg-teal-900"
          >
            Return to Full Year
          </Button>
        </div>
      )}

      {/* Progress & Target Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {selectedPeriodLabel === "annual"
              ? "Annual Target"
              : `${selectedPeriodLabel} Target`}
          </span>
          <div className="text-xl font-bold text-foreground mt-1 font-mono">
            {targetQty !== null
              ? `${Number(targetQty).toLocaleString()} ${unitSymbol}`
              : "No Target Configured"}
          </div>
        </div>

        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Cumulative Actual
          </span>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
            {Number(actualQty).toLocaleString()} {unitSymbol}
          </div>
          <span className="text-[11px] text-muted-foreground">
            From {performance.report_count} validated report(s)
          </span>
        </div>

        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Remaining Target
          </span>
          <div className="text-xl font-bold text-foreground mt-1 font-mono">
            {remainingQty !== null ? (
              remainingQty > 0 ? (
                `${Number(remainingQty).toLocaleString()} ${unitSymbol}`
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Target Achieved
                </span>
              )
            ) : (
              "N/A"
            )}
          </div>
        </div>

        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Target Achievement
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-bold font-mono ${
                isOverachieved || (achievement !== null && achievement >= 100)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : achievement !== null && achievement >= 70
                  ? "text-teal-600 dark:text-teal-400"
                  : achievement !== null && achievement >= 40
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {achievement !== null ? `${achievement}%` : "No Target"}
            </span>
            {isOverachieved && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] border-emerald-500/20">
                Overachieved
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Visual Progress Bar with Dynamic Red to Green Coloring */}
      {targetQty !== null && targetQty > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Progress against{" "}
              {selectedPeriodLabel === "annual"
                ? "Annual Commitment"
                : `${selectedPeriodLabel} Target`}
            </span>
            <span className="font-semibold text-foreground font-mono">
              {Number(actualQty).toLocaleString()} /{" "}
              {Number(targetQty).toLocaleString()} {unitSymbol} ({achievement}%)
            </span>
          </div>
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 dark:border-slate-700 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverachieved || (achievement !== null && achievement >= 100)
                  ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 shadow-2xs shadow-emerald-500/50"
                  : achievement !== null && achievement >= 70
                  ? "bg-gradient-to-r from-lime-500 to-emerald-500"
                  : achievement !== null && achievement >= 40
                  ? "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                  : "bg-gradient-to-r from-red-600 via-rose-500 to-orange-500"
              }`}
              style={{
                width: `${Math.min(100, Math.max(2, achievement || 0))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Expected Pace & Projected Achievement (Annual view only) */}
      {selectedPeriodLabel === "annual" && estimate && estimate.is_estimate && (
        <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl text-xs">
          <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <span>
                {estimate.label || "Expected Pace & Performance Projection"}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-normal border-blue-300"
              >
                Calculated Estimate
              </Badge>
            </div>
            <p className="text-muted-foreground">
              At day {estimate.elapsed_days} of {estimate.total_period_days},{" "}
              expected pace to date is{" "}
              <strong>
                {estimate.expected_pace_to_date.toLocaleString()} {unitSymbol}
              </strong>
              . Current actual is achieving{" "}
              <strong>{estimate.pace_achievement_percentage ?? 0}%</strong> of
              expected elapsed-time pace. Projected year-end production:{" "}
              <strong>
                {estimate.projected_period_end_actual.toLocaleString()}{" "}
                {unitSymbol}
              </strong>
              .
            </p>
          </div>
        </div>
      )}

      {/* Target Hierarchy Breakdown: Interactive Sub-Period Selector */}
      {childTargets.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              Sub-Period Target Allocations ({assignment.target_allocation_depth})
              — Click a period to inspect performance
            </h4>
            {selectedPeriodLabel !== "annual" && (
              <button
                type="button"
                onClick={() => setSelectedPeriodLabel("annual")}
                className="text-xs text-primary hover:underline font-medium"
              >
                &larr; Back to Full Year
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {childTargets.map((ct: CompanyProductionTarget) => {
              const isActive = selectedPeriodLabel === ct.period_label;
              return (
                <button
                  type="button"
                  key={ct.target_id}
                  onClick={() =>
                    setSelectedPeriodLabel(
                      isActive ? "annual" : ct.period_label
                    )
                  }
                  className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 cursor-pointer ${
                    isActive
                      ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-sm"
                      : "border-border bg-card/60 hover:bg-card hover:border-amber-400 dark:hover:border-amber-700 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      {ct.period_label}
                    </span>
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className={`text-[10px] ${
                        isActive ? "bg-amber-600 text-white" : ""
                      }`}
                    >
                      {isActive ? "Active View" : ct.target_period_type}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-primary font-mono">
                    {Number(ct.target_quantity).toLocaleString()} {unitSymbol}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {ct.period_start_date} &rarr; {ct.period_end_date}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
