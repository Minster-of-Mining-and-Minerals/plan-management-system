"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetNationalDashboardSummaryQuery } from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Globe,
  Layers,
  Building,
  Scale,
  PieChart as PieChartIcon,
  BarChart3,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  ExternalLink,
} from "lucide-react";

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

export function NationalDashboardTab() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // Primary filters
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  // Regional table filters
  const [regionalSearchQuery, setRegionalSearchQuery] = useState<string>("");
  const [regionalStatusFilter, setRegionalStatusFilter] = useState<string>("all");

  // Indicator table filters
  const [indicatorSearchQuery, setIndicatorSearchQuery] = useState<string>("");
  const [indicatorCategoryFilter, setIndicatorCategoryFilter] = useState<string>("all");
  const [indicatorCompletenessFilter, setIndicatorCompletenessFilter] = useState<string>("all");
  const [indicatorOverachievedOnly, setIndicatorOverachievedOnly] = useState<boolean>(false);

  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });

  const { data: summary, isLoading } = useGetNationalDashboardSummaryQuery({
    reporting_year: yearFilter !== "all" ? parseInt(yearFilter, 10) : undefined,
    reporting_period_label: periodFilter !== "all" ? periodFilter : undefined,
    region_id: regionFilter !== "all" ? regionFilter : undefined,
  });

  const kpis = summary?.kpis || {
    totalRequirementsCount: 0,
    totalAssignmentsCount: 0,
    totalAssignedRegionsCount: 0,
    mappedAssignmentsCount: 0,
    confirmedAssignmentsCount: 0,
    totalPublishedSubmissions: 0,
    missingSubmissionsCount: 0,
    overallNationalComplianceRate: 0,
    openWindowsCount: 0,
    lockedWindowsCount: 0,
    overriddenWindowsCount: 0,
    totalWindowsCount: 0,
  };

  const regionalCompliance = summary?.regionalCompliance || [];
  const requirementSummaries = summary?.requirementSummaries || [];

  // Regional Compliance Filtered Dataset
  const filteredRegionalCompliance = useMemo(() => {
    return regionalCompliance.filter((r) => {
      if (regionalStatusFilter !== "all" && r.status !== regionalStatusFilter) return false;
      if (!regionalSearchQuery.trim()) return true;
      const q = regionalSearchQuery.toLowerCase();
      return (
        r.regionName.toLowerCase().includes(q) ||
        r.regionCode.toLowerCase().includes(q)
      );
    });
  }, [regionalCompliance, regionalSearchQuery, regionalStatusFilter]);

  // Unique categories for filtering
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    requirementSummaries.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [requirementSummaries]);

  // Indicator Summaries Filtered Dataset
  const filteredIndicators = useMemo(() => {
    return requirementSummaries.filter((req) => {
      if (indicatorCategoryFilter !== "all" && req.category !== indicatorCategoryFilter) return false;
      if (indicatorCompletenessFilter === "complete" && !req.isCompleteData) return false;
      if (indicatorCompletenessFilter === "partial" && (req.isCompleteData || req.submittedRegionsCount === 0)) return false;
      if (indicatorCompletenessFilter === "pending" && req.submittedRegionsCount > 0) return false;
      if (indicatorOverachievedOnly && (req.achievementRate == null || req.achievementRate <= 100)) return false;

      if (!indicatorSearchQuery.trim()) return true;
      const q = indicatorSearchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.code.toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q) ||
        req.expectedUnit.toLowerCase().includes(q)
      );
    });
  }, [
    requirementSummaries,
    indicatorSearchQuery,
    indicatorCategoryFilter,
    indicatorCompletenessFilter,
    indicatorOverachievedOnly,
  ]);

  // Regional Submissions Bar Chart Data
  const regionalBarData = regionalCompliance.map((r) => ({
    name: r.regionName,
    assigned: r.assignedRequirementsCount,
    submitted: r.publishedSubmissionsCount,
    compliance: r.complianceRate,
  }));

  // Target vs Actual National Performance Data
  const targetVsActualData = requirementSummaries.map((req) => {
    const actual = req.nationalTotalActual || 0;
    const target = req.nationalTotalTarget || 0;
    const rate = target > 0 ? (actual / target) * 100 : 0;
    return {
      name: req.code,
      title: req.title,
      target: target,
      actual: actual,
      rate: Number(rate.toFixed(1)),
      unit: req.expectedUnit,
    };
  });

  // Submission Status Distribution Pie Chart Data
  const submissionStatusData = [
    { name: "Published & Validated", value: kpis.totalPublishedSubmissions, color: "#10b981" },
    { name: "Missing Submissions", value: kpis.missingSubmissionsCount, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  // TanStack Columns: Regional Compliance Table
  const regionalColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "region",
        header: "Regional State",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{r.regionName}</span>
                {r.regionCode && (
                  <span className="text-[10px] font-mono text-slate-400">[{r.regionCode}]</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">Federal Assigned Jurisdiction</span>
            </div>
          );
        },
      },
      {
        id: "assigned",
        header: "Assigned KPIs",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {row.original.assignedRequirementsCount}
          </span>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {row.original.publishedSubmissionsCount}
          </span>
        ),
      },
      {
        id: "missing",
        header: "Missing",
        cell: ({ row }) => (
          <span
            className={`font-mono font-medium ${
              row.original.missingSubmissionsCount > 0 ? "text-amber-600" : "text-slate-400"
            }`}
          >
            {row.original.missingSubmissionsCount}
          </span>
        ),
      },
      {
        id: "compliance",
        header: "Compliance Rate",
        cell: ({ row }) => {
          const rate = row.original.complianceRate;
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    rate === 100
                      ? "bg-emerald-600"
                      : rate >= 50
                      ? "bg-teal-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
              <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                {rate}%
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          if (s === "complete") {
            return (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center gap-1 w-fit">
                <CheckCircle2 className="h-3 w-3" />
                Complete
              </Badge>
            );
          }
          if (s === "partial") {
            return (
              <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300 text-[10px] flex items-center gap-1 w-fit">
                <Clock className="h-3 w-3" />
                In Progress
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] w-fit">
              Pending
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(
                  `/national-reporting/regions/${r.regionId}?year=${yearFilter}&period=${periodFilter}`
                )
              }
              className="h-7 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1.5"
              title={`View assigned national reporting KPI details for ${r.regionName}`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View Regional KPIs</span>
            </Button>
          );
        },
      },
    ],
    [router, yearFilter, periodFilter]
  );

  // TanStack Columns: National Indicator Aggregates Table
  const indicatorColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "indicator",
        header: "National Indicator",
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div className="space-y-0.5 max-w-sm">
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs line-clamp-2">
                {req.title}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                  {req.code}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <Badge variant="outline" className="text-[9px] capitalize px-1.5 py-0">
                  {req.category?.replace(/_/g, " ")}
                </Badge>
                <span className="text-[10px] font-mono text-slate-400 capitalize">
                  ({req.frequency})
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "expectedUnit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {row.original.expectedUnit}
          </span>
        ),
      },
      {
        id: "nationalTarget",
        header: "National Target",
        cell: ({ row }) => {
          const val = row.original.nationalTotalTarget;
          return val != null ? (
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs">
              {Number(val).toLocaleString()}{" "}
              <span className="text-[10px] text-slate-400 font-sans">{row.original.expectedUnit}</span>
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        id: "nationalActual",
        header: "National Actual",
        cell: ({ row }) => {
          const val = row.original.nationalTotalActual;
          return val != null ? (
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
              {Number(val).toLocaleString()}{" "}
              <span className="text-[10px] text-slate-400 font-normal">{row.original.expectedUnit}</span>
            </span>
          ) : (
            <span className="text-slate-400 italic">Not reported</span>
          );
        },
      },
      {
        id: "achievementRate",
        header: "Achievement Rate",
        cell: ({ row }) => {
          const rate = row.original.achievementRate;
          const isOver = rate != null && rate > 100;
          return rate != null ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono font-bold text-xs ${
                  rate >= 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : rate >= 70
                    ? "text-blue-600"
                    : "text-amber-600"
                }`}
              >
                {rate}%
              </span>
              {isOver && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 font-mono">
                  +{(rate - 100).toFixed(1)}% Over
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          );
        },
      },
      {
        id: "regionalCompleteness",
        header: "Regional Coverage",
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div className="space-y-1 min-w-[130px]">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {req.dataCompletenessPercent}%
                </span>
                <span className="text-slate-500 text-[10px]">
                  {req.submittedRegionsCount} / {req.assignedRegionsCount} regions
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    req.isCompleteData
                      ? "bg-emerald-600"
                      : req.submittedRegionsCount > 0
                      ? "bg-amber-500"
                      : "bg-slate-300"
                  }`}
                  style={{ width: `${Math.min(100, req.dataCompletenessPercent)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const req = row.original;
          if (req.isCompleteData) {
            return (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center gap-1 w-fit">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Complete (100%)
              </Badge>
            );
          }
          if (req.submittedRegionsCount > 0) {
            return (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 text-[10px] flex items-center gap-1 w-fit">
                <AlertTriangle className="h-2.5 w-2.5" />
                Partial
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-slate-400 border-dashed text-[10px] w-fit">
              Pending
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const req = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(
                  `/national-reporting/indicators/${req.requirementId}?year=${yearFilter}&period=${periodFilter}`
                )
              }
              className="h-7 text-xs border-slate-300 hover:bg-slate-100 dark:border-slate-700 flex items-center gap-1.5"
              title="View full statistics and regional assignment distribution"
            >
              <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span>View Detail</span>
            </Button>
          );
        },
      },
    ],
    [router, yearFilter, periodFilter]
  );

  return (
    <div className="space-y-6">
      {/* Top Page Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <Globe className="h-4 w-4" />
            Federal Gateway & National Aggregation Framework
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            National Reporting Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor provincial compliance, standardized KPI performance rollups, and over-achievements across all regional states.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Monitoring Window:
          </span>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year Aggregated</SelectItem>
              <SelectItem value="Q1">Quarter 1 (Q1)</SelectItem>
              <SelectItem value="Q2">Quarter 2 (Q2)</SelectItem>
              <SelectItem value="Q3">Quarter 3 (Q3)</SelectItem>
              <SelectItem value="Q4">Quarter 4 (Q4)</SelectItem>
              <SelectItem value="Annual">Annual Review</SelectItem>
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[190px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="All Regional States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regional States</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.region_id} value={r.region_id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>Real-time federated reporting intelligence</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              National Requirements
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.totalRequirementsCount}
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Regional Assignments
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {kpis.totalAssignmentsCount}
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Validated Submissions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {kpis.totalPublishedSubmissions}
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              National Compliance
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
              {kpis.overallNationalComplianceRate}%
            </div>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Missing Submissions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {kpis.missingSubmissionsCount}
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reporting Window Health & On-Demand Override Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Open Reporting Windows
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-950 dark:text-emerald-100">
              {kpis.openWindowsCount ?? 0}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Active timeframes accepting submissions
            </span>
          </div>
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Locked / Closed Windows
            </span>
            <div className="text-2xl font-bold font-mono text-rose-950 dark:text-rose-100">
              {kpis.lockedWindowsCount ?? 0}
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400">
              Deadlines elapsed or upcoming cycles
            </span>
          </div>
          <div className="p-2.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Admin Overrides Active
            </span>
            <div className="text-2xl font-bold font-mono text-amber-950 dark:text-amber-100">
              {kpis.overriddenWindowsCount ?? 0}
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              Unlocked on demand by Federal Admin
            </span>
          </div>
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg">
            <Unlock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Category Thematic Performance Cards */}
      {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            Performance by Category & Thematic Domain
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.categoryBreakdown.map((cat) => (
              <Card key={cat.category} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {cat.category.replace(/_/g, " ")}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {cat.publishedCount} / {cat.assignmentsCount}
                  </Badge>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${
                      cat.complianceRate >= 80
                        ? "bg-emerald-600"
                        : cat.complianceRate >= 50
                        ? "bg-teal-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, cat.complianceRate)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Compliance</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {cat.complianceRate}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Row 1: Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Regional Submissions Comparison */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Regional Submission Compliance Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {regionalBarData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                No regional assignments available for chart display.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalBarData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        val,
                        name === "assigned" ? "Assigned Requirements" : "Validated Submissions",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="assigned" name="Assigned Requirements" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="submitted" name="Validated Submissions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Target vs Actual National Comparison */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              National Target vs Actual Output by Indicator
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {targetVsActualData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                No indicator data available for target vs actual comparison.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={targetVsActualData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} ${item.payload.unit || ""}`,
                        name === "target" ? "Planned National Target" : "Reported National Actual",
                      ]}
                      labelFormatter={(label: any, items: any) => {
                        const item = items?.[0]?.payload;
                        return item ? `${item.title} (${item.name})` : label;
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="target" name="National Target" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="National Actual" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Submission Fulfillment Donut & Tabular Regional Compliance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Submission Status Donut */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-600" />
              Submission Fulfillment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            {submissionStatusData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                No submission data available.
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={submissionStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {submissionStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [val, "Submissions"]}
                      contentStyle={{ borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 text-xs mt-1">
                  {submissionStatusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {d.name}: <strong>{d.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Reporting Compliance Tabular Matrix (TanStack DataTable) */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
          <CardHeader className="p-4 pb-2 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600" />
                Regional Compliance Breakdown
              </CardTitle>
              <span className="text-xs text-slate-500 font-mono">
                {filteredRegionalCompliance.length} Regional States
              </span>
            </div>

            {/* Table Search & Status Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by region name or code..."
                  value={regionalSearchQuery}
                  onChange={(e) => setRegionalSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={regionalStatusFilter} onValueChange={setRegionalStatusFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="complete">Complete (100%)</SelectItem>
                    <SelectItem value="partial">In Progress</SelectItem>
                    <SelectItem value="pending">Pending (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 pt-1">
            <DataTable
              columns={regionalColumns}
              data={filteredRegionalCompliance}
              defaultPageSize={10}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Tabular Standardized National Indicator Aggregates & Over-Achievement */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-5 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-600" />
                Standardized National Indicator Aggregates & Over-Achievement
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Full tabular rollups of national targets, reported actuals, over-achievement tracking, and regional assignments.
              </p>
            </div>

            <Badge variant="outline" className="font-mono text-xs w-fit">
              {filteredIndicators.length} Indicators
            </Badge>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search indicator code, title, unit..."
                value={indicatorSearchQuery}
                onChange={(e) => setIndicatorSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select value={indicatorCategoryFilter} onValueChange={setIndicatorCategoryFilter}>
                <SelectTrigger className="w-[170px] h-8 text-xs bg-slate-50 dark:bg-slate-950">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="capitalize">{cat.replace(/_/g, " ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Completeness Filter */}
              <Select
                value={indicatorCompletenessFilter}
                onValueChange={setIndicatorCompletenessFilter}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-50 dark:bg-slate-950">
                  <SelectValue placeholder="All Coverage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coverage</SelectItem>
                  <SelectItem value="complete">100% Complete</SelectItem>
                  <SelectItem value="partial">Partial Submissions</SelectItem>
                  <SelectItem value="pending">Pending (0%)</SelectItem>
                </SelectContent>
              </Select>

              {/* Over-Achievement Filter Toggle */}
              <Button
                variant={indicatorOverachievedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setIndicatorOverachievedOnly(!indicatorOverachievedOnly)}
                className={`h-8 text-xs flex items-center gap-1.5 ${
                  indicatorOverachievedOnly
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Over-Achieved Only</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1">
          <DataTable
            columns={indicatorColumns}
            data={filteredIndicators}
            defaultPageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}

