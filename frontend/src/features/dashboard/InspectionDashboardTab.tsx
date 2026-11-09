"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Building2,
  FileCheck2,
  Calendar,
  RefreshCw,
  Award,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCheck,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldAlert,
  Users2,
  MapPin,
  CalendarCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  useGetInspectionAnalyticsQuery,
} from "@/redux/api/inspectionAnalyticsApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import type {
  InspectionLicenseType,
  InspectionInterval,
} from "@/redux/types/inspectionAnalytics";
import { KpiCard } from "@/features/plan-management/dashboard/components/KpiCard";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  submitted: "#10b981", // emerald-500
  completed: "#10b981",
  in_progress: "#f59e0b", // amber-500
  todo: "#3b82f6", // blue-500
  pending: "#3b82f6",
  overdue: "#ef4444", // red-500
  other: "#94a3b8", // slate-400
};

export function InspectionDashboardTab() {
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | (Record<string, unknown> & {
        region_id?: string;
        is_regional?: boolean;
        name?: string;
      })
    | undefined;

  const isRegionalUser = Boolean(sessionUser?.region_id || sessionUser?.is_regional);
  const userRegionId = sessionUser?.region_id;

  // Filter states
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [licenseType, setLicenseType] = useState<InspectionLicenseType>("all");
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    userRegionId || "all"
  );
  const [interval, setInterval] = useState<InspectionInterval>("month");

  // Fetch regions for federal filtering
  const { data: regions = [] } = useGetRegionsQuery(undefined, {
    skip: isRegionalUser,
  });

  // Query analytics API via Plan Management backend proxy
  const queryParams = useMemo(() => {
    return {
      from: fromDate || undefined,
      to: toDate || undefined,
      license_type: licenseType,
      region_id: isRegionalUser ? userRegionId : selectedRegionId !== "all" ? selectedRegionId : undefined,
      interval,
    };
  }, [fromDate, toDate, licenseType, selectedRegionId, interval, isRegionalUser, userRegionId]);

  const {
    data: analytics,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetInspectionAnalyticsQuery(queryParams);

  // Quick date presets
  const applyPreset = (preset: "this_year" | "last_6_months" | "clear") => {
    const now = new Date();
    if (preset === "this_year") {
      const year = now.getFullYear();
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
    } else if (preset === "last_6_months") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      setFromDate(sixMonthsAgo.toISOString().split("T")[0]);
      setToDate(now.toISOString().split("T")[0]);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  const summary = analytics?.summary;
  const metadata = analytics?.metadata;
  const isStale = metadata?.is_stale;

  if (isLoading && !analytics) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-4">
        <Loading01 />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Connecting to Inspection System analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* ----------------- INSPECTION HEADER & FILTERS ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <ClipboardCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Mining Inspection Analytics Dashboard
            </h2>

            {isStale ? (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">
                Stale Cached Data
              </Badge>
            ) : metadata?.data_freshness === "cached" ? (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200">
                Cached (5m TTL)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200">
                Live Inspection API
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            National and regional regulatory oversight, field compliance rates, inspection score trends, and operational breakdown across mining and exploration licenses.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-teal-600")} />
            {isFetching ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* ----------------- STALE DATA WARNING BANNER ----------------- */}
      {isStale && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold">Inspection System Connection Fallback: </span>
              {metadata?.cached_at
                ? `The external Inspection Analytics API is temporarily unreachable. Displaying cached data from ${new Date(metadata.cached_at).toLocaleString()}.`
                : "The external Inspection Analytics API is currently unreachable. Displaying offline fallback data."}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-8 border-amber-400 bg-white/60 dark:bg-amber-900/40 hover:bg-white text-amber-900 dark:text-amber-100"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* ----------------- ERROR STATE (WHEN NO FALLBACK) ----------------- */}
      {isError && !analytics && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Inspection Analytics Unavailable</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {(error as { data?: { message?: string } })?.data?.message ||
                "Failed to communicate with the Inspection System. Verify network access and integration credentials."}
            </p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </div>
      )}

      {/* ----------------- COMPREHENSIVE FILTER CONTROLS ----------------- */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5" />
            Inspection Dashboard Filters
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("this_year")}
              className="h-7 text-xs px-2.5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              This Year
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => applyPreset("last_6_months")}
              className="h-7 text-xs px-2.5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              Last 6 Months
            </Button>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyPreset("clear")}
                className="h-7 text-xs px-2.5 rounded-lg text-destructive hover:bg-destructive/10"
              >
                Reset Dates
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* From Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">From Date</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">To Date</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* License Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">License Category</label>
            <Select
              value={licenseType}
              onValueChange={(val) => setLicenseType(val as InspectionLicenseType)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Licenses</SelectItem>
                <SelectItem value="mining">Mining</SelectItem>
                <SelectItem value="exploration">Exploration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Region Filter (Federal only) */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              {isRegionalUser ? "Assigned Region" : "Regional Scope"}
            </label>
            {isRegionalUser ? (
              <div className="h-9 px-3 flex items-center border border-border rounded-xl bg-muted/40 text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
                Regional Account
              </div>
            ) : (
              <Select
                value={selectedRegionId}
                onValueChange={(val) => setSelectedRegionId(val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="All Regions (National)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions (National)</SelectItem>
                  {regions.map((reg) => (
                    <SelectItem key={reg.region_id} value={reg.region_id}>
                      {reg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Trend Interval */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Trend Interval</label>
            <Select
              value={interval}
              onValueChange={(val) => setInterval(val as InspectionInterval)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Monthly" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly Interval</SelectItem>
                <SelectItem value="week">Weekly Interval</SelectItem>
                <SelectItem value="day">Daily Interval</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {analytics && summary && (
        <>
          {/* ----------------- 1. SUMMARY STATISTICS CARDS (8 CARDS) ----------------- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                Key Inspection Performance Indicators
              </h3>
              <span className="text-xs text-muted-foreground">
                Aggregated from source: Mining Inspection Management System
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Inspections */}
              <KpiCard
                title="Total Inspections"
                value={summary.total_inspections.toLocaleString()}
                subtitle="Scheduled field inspections in period"
                icon={ClipboardCheck}
                accent="primary"
              />

              {/* Card 2: Completed Inspections */}
              <KpiCard
                title="Completed / Submitted"
                value={summary.completed_inspections.toLocaleString()}
                subtitle={`${summary.completion_rate}% verified completion`}
                icon={CheckCircle2}
                trend={`${summary.completion_rate}% rate`}
                accent="success"
              />

              {/* Card 3: In Progress */}
              <KpiCard
                title="In Progress"
                value={summary.in_progress_inspections.toLocaleString()}
                subtitle="Currently undergoing field review"
                icon={Clock}
                accent="warning"
              />

              {/* Card 4: Pending / To-Do */}
              <KpiCard
                title="Pending / To-Do"
                value={summary.pending_inspections.toLocaleString()}
                subtitle="Queued inspection assignments"
                icon={Layers}
                accent="info"
              />

              {/* Card 5: Overdue Inspections */}
              <KpiCard
                title="Overdue Inspections"
                value={summary.overdue_inspections.toLocaleString()}
                subtitle={`${summary.overdue_rate}% of scheduled total`}
                icon={AlertTriangle}
                accent="error"
              />

              {/* Card 6: Completion Rate */}
              <KpiCard
                title="Overall Completion Rate"
                value={`${summary.completion_rate}%`}
                subtitle={`${summary.completed_inspections} of ${summary.total_inspections} completed`}
                icon={TrendingUp}
                accent={summary.completion_rate >= 75 ? "success" : "warning"}
              />

              {/* Card 7: Average Inspection Score */}
              <KpiCard
                title="Average Inspection Score"
                value={
                  summary.average_score !== null
                    ? `${summary.average_score} / 100`
                    : "N/A"
                }
                subtitle="Computed from submitted inspections"
                icon={Award}
                accent="primary"
              />

              {/* Card 8: On-Time Submission Rate */}
              <KpiCard
                title="On-Time Rate"
                value={`${summary.on_time_rate}%`}
                subtitle={`${summary.on_time_submissions} on-time submissions`}
                icon={CalendarCheck}
                accent="success"
              />
            </div>
          </div>

          {/* ----------------- 2. OPERATIONAL AUXILIARY METRICS ----------------- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-card border border-border text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Companies Inspected</p>
                <p className="text-base font-bold text-foreground">{summary.companies_inspected}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Licenses Audited</p>
                <p className="text-base font-bold text-foreground">{summary.licenses_inspected}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <CheckCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">On-Time Submissions</p>
                <p className="text-base font-bold text-foreground">{summary.on_time_submissions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Late Submissions</p>
                <p className="text-base font-bold text-foreground">{summary.late_submissions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Returned For Review</p>
                <p className="text-base font-bold text-foreground">{summary.returned_inspections}</p>
              </div>
            </div>
          </div>

          {/* ----------------- 3. CHARTS ROW: STATUS & CATEGORY ----------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Status Breakdown Donut Chart */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-teal-600" />
                    Inspection Lifecycle Status
                  </h4>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {summary.total_inspections} Total
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Distribution of completed, in-progress, pending, and overdue inspections.
                </p>
              </div>

              <div className="h-64 w-full">
                {analytics.by_status.length > 0 && summary.total_inspections > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.by_status}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {analytics.by_status.map((entry, index) => (
                          <Cell
                            key={`status-cell-${index}`}
                            fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${val} inspections`, "Count"]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No status data available for period
                  </div>
                )}
              </div>

              {/* Status breakdown pills */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/60">
                {analytics.by_status.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-xs"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.status] || "#94a3b8" }}
                      />
                      {item.label}
                    </span>
                    <span className="font-bold text-foreground">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* License Category Breakdown (Mining vs Exploration) */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-teal-600" />
                    License Category Performance
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Mining vs Exploration
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Comparative inspection execution and compliance across license regimes.
                </p>
              </div>

              <div className="space-y-4">
                {analytics.by_category.map((cat) => (
                  <div
                    key={cat.category}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground capitalize">
                          {cat.label || cat.category} Licenses
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold",
                            cat.completion_rate >= 75
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {cat.completion_rate}% Completion Rate
                        </Badge>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {cat.completed} of {cat.total} Completed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${cat.total > 0 ? (cat.in_progress / cat.total) * 100 : 0}%`,
                        }}
                      />
                      <div
                        className="bg-rose-500 transition-all duration-500"
                        style={{
                          width: `${cat.total > 0 ? (cat.overdue / cat.total) * 100 : 0}%`,
                        }}
                      />
                    </div>

                    {/* Category mini stats */}
                    <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
                      <div className="text-center p-1.5 rounded-lg bg-card">
                        <span className="text-muted-foreground block">Total Due</span>
                        <span className="font-bold text-foreground">{cat.total}</span>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-card">
                        <span className="text-emerald-600 block">Completed</span>
                        <span className="font-bold text-foreground">{cat.completed}</span>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-card">
                        <span className="text-amber-600 block">In Progress</span>
                        <span className="font-bold text-foreground">{cat.in_progress}</span>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-card">
                        <span className="text-rose-600 block">Overdue</span>
                        <span className="font-bold text-foreground">{cat.overdue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                <span>Color key: Emerald (Completed) • Amber (In Progress) • Rose (Overdue)</span>
                <span className="font-medium text-teal-600">Source: MIMS Regulatory Analytics</span>
              </div>
            </div>
          </div>

          {/* ----------------- 4. REGIONAL BREAKDOWN CHART & TABLE ----------------- */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  Regional Inspection Performance & Completion
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inspection workload and resolution across regional bureaus and administrations.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {analytics.by_region.length} Regional Jurisdictions
              </Badge>
            </div>

            {analytics.by_region.length > 0 ? (
              <div className="space-y-6">
                {/* Regional Bar Chart */}
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.by_region}
                      margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        dataKey="region_name"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        height={50}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar dataKey="total" name="Total Scheduled" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Regional Table */}
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Region Name</th>
                        <th className="py-2.5 px-3 text-right">Total Due</th>
                        <th className="py-2.5 px-3 text-right">Completed</th>
                        <th className="py-2.5 px-3 text-right">In Progress</th>
                        <th className="py-2.5 px-3 text-right">Overdue</th>
                        <th className="py-2.5 px-3 text-right">Completion %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {analytics.by_region.map((reg) => (
                        <tr key={reg.region_id || reg.region_name} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {reg.region_name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{reg.total}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{reg.completed}</td>
                          <td className="py-2.5 px-3 text-right text-amber-600">{reg.in_progress}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{reg.overdue}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0",
                                reg.completion_rate >= 75
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              )}
                            >
                              {reg.completion_rate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No regional inspection records found for the applied scope.
              </div>
            )}
          </div>

          {/* ----------------- 5. TEAM BREAKDOWN (NO PII) ----------------- */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-teal-600" />
                  Inspection Team Performance (Aggregated)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Operational output by assigned field inspection teams. Strictly aggregated without personal inspector information.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {analytics.by_team.length} Active Teams
              </Badge>
            </div>

            {analytics.by_team.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Team Code</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3 text-right">Total Due</th>
                      <th className="py-2.5 px-3 text-right">Completed</th>
                      <th className="py-2.5 px-3 text-right">In Progress</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-right">Overdue</th>
                      <th className="py-2.5 px-3 text-right">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.by_team.map((team) => (
                      <tr key={team.team_id || team.team_name} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-muted-foreground">
                          {team.team_code || "TEAM"}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {team.team_name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{team.total}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{team.completed}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600">{team.in_progress}</td>
                        <td className="py-2.5 px-3 text-right text-blue-600">{team.pending}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{team.overdue}</td>
                        <td className="py-2.5 px-3 text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0",
                              team.completion_rate >= 75
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {team.completion_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No team-specific breakdown reported for this timeframe.
              </div>
            )}
          </div>

          {/* ----------------- 6. TIME-SERIES TRENDS ----------------- */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  Inspection Activity Progression Over Time
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completed vs Scheduled inspections by {interval} interval.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {(["month", "week", "day"] as InspectionInterval[]).map((int) => (
                  <Button
                    key={int}
                    variant={interval === int ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInterval(int)}
                    className="h-7 text-xs px-2.5 rounded-lg capitalize"
                  >
                    {int}ly
                  </Button>
                ))}
              </div>
            </div>

            {analytics.trends.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.trends}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total Due"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#totalGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#completedGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No time-series data points available for the selected dates.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
