"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Cell,
} from "recharts";
import {
  ArrowLeft,
  Building,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  NationalReportingAssignment,
  NationalPublishedRecord,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { PeriodLockOverrideModal } from "./PeriodLockOverrideModal";

interface Props {
  region: {
    region_id: string;
    name: string;
    code: string;
    national_reporting_method?: string;
    form_reporting_active?: boolean;
  };
  assignments: NationalReportingAssignment[];
  publishedRecords?: NationalPublishedRecord[];
  reportingYear: number;
  periodLabel: string;
  onYearChange: (year: number) => void;
  onPeriodChange: (period: string) => void;
  onBack: () => void;
}

export function NationalRegionDetailView({
  region,
  assignments,
  publishedRecords = [],
  reportingYear,
  periodLabel,
  onYearChange,
  onPeriodChange,
  onBack,
}: Props) {
  const router = useRouter();

  // Filters for Assigned KPIs DataTable
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mandateFilter, setMandateFilter] = useState("all");
  const [overachievedOnly, setOverachievedOnly] = useState(false);

  // Selected assignment for lock override management
  const [selectedAssignmentForLock, setSelectedAssignmentForLock] =
    useState<NationalReportingAssignment | null>(null);

  // Unique categories across assigned requirements
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.requirement?.category) set.add(a.requirement.category);
    });
    return Array.from(set);
  }, [assignments]);

  // Flattened KPI reporting dataset for the active period/year
  const kpiDataset = useMemo(() => {
    return assignments.map((asgn) => {
      const req = asgn.requirement;
      const periods: ReportingPeriod[] = (asgn as any).reporting_periods || [];

      // Find period data matching the selected period filter or latest published
      let matchingPeriod = periods.find((p) => {
        if (!periodLabel || periodLabel === "all") return true;
        return (
          String(p.period_label).trim().toLowerCase() ===
          periodLabel.trim().toLowerCase()
        );
      });

      if (!matchingPeriod && periods.length > 0) {
        matchingPeriod = periods[0];
      }

      // Check published records
      const matchingPub = publishedRecords.find((pub) => {
        const matchesReq = pub.requirement_id === asgn.requirement_id;
        const matchesYear =
          !reportingYear || pub.reporting_year === reportingYear;
        const matchesPeriod =
          !periodLabel ||
          periodLabel === "all" ||
          String(pub.reporting_period_label).trim().toLowerCase() ===
            periodLabel.trim().toLowerCase();
        return matchesReq && matchesYear && matchesPeriod;
      });

      const isPublished =
        Boolean(matchingPub) ||
        matchingPeriod?.status === "published" ||
        (asgn as any).workflowStatus === "published";

      const plannedTarget =
        matchingPub?.planned_target ??
        matchingPeriod?.planned_target ??
        matchingPeriod?.standardized_target ??
        null;

      const reportedActual =
        matchingPub?.reported_actual ??
        matchingPeriod?.reported_actual ??
        matchingPeriod?.standardized_actual ??
        null;

      const expectedUnit =
        req?.expected_unit || matchingPub?.local_unit || "Unit";

      let achievementPercent: number | null = null;
      if (matchingPub?.achievement_percent != null) {
        achievementPercent = Number(matchingPub.achievement_percent);
      } else if (matchingPeriod?.achievement_percent != null) {
        achievementPercent = Number(matchingPeriod.achievement_percent);
      } else if (
        reportedActual != null &&
        plannedTarget != null &&
        Number(plannedTarget) > 0
      ) {
        achievementPercent =
          Math.round((Number(reportedActual) / Number(plannedTarget)) * 1000) / 10;
      }

      const isOver = achievementPercent != null && achievementPercent > 100;
      const publicationReference =
        matchingPub?.publication_reference ||
        matchingPeriod?.publication_reference ||
        null;

      const lockState = matchingPeriod?.lock_state || "open";
      const isLocked = Boolean(matchingPeriod?.is_locked);
      const isManuallyUnlocked = Boolean(matchingPeriod?.is_manually_unlocked);

      return {
        assignmentId: asgn.assignment_id,
        requirementId: asgn.requirement_id,
        rawAssignment: asgn,
        code: req?.code || "—",
        title: req?.title || "National Indicator",
        category: req?.category || "Uncategorized",
        expectedUnit,
        frequency: asgn.frequency_override || req?.frequency || "quarterly",
        isMandatory: asgn.is_mandatory,
        submissionMethod:
          matchingPub?.submission_method ||
          region.national_reporting_method ||
          (region.form_reporting_active ? "form_based" : "node_mapping") ||
          "form_based",
        isPublished,
        status: isPublished ? "published" : "pending",
        plannedTarget,
        reportedActual,
        achievementPercent,
        isOver,
        publicationReference,
        publishedAt: matchingPub?.published_at || matchingPeriod?.published_at || null,
        narrative: matchingPub?.narrative || matchingPeriod?.narrative || null,
        lockState,
        isLocked,
        isManuallyUnlocked,
        matchingPeriod,
      };
    });
  }, [assignments, publishedRecords, reportingYear, periodLabel, region]);

  // Filtered dataset for DataTable
  const filteredKpis = useMemo(() => {
    return kpiDataset.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter === "published" && !item.isPublished) return false;
      if (statusFilter === "pending" && item.isPublished) return false;
      if (mandateFilter === "mandatory" && !item.isMandatory) return false;
      if (mandateFilter === "optional" && item.isMandatory) return false;
      if (overachievedOnly && !item.isOver) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.expectedUnit.toLowerCase().includes(q)
      );
    });
  }, [
    kpiDataset,
    searchQuery,
    categoryFilter,
    statusFilter,
    mandateFilter,
    overachievedOnly,
  ]);

  // Executive Rollup Statistics
  const totalAssignedCount = assignments.length;
  const publishedCount = kpiDataset.filter((k) => k.isPublished).length;
  const pendingCount = totalAssignedCount - publishedCount;
  const complianceRate =
    totalAssignedCount > 0
      ? Math.round((publishedCount / totalAssignedCount) * 100)
      : 0;

  const overachievedCount = kpiDataset.filter((k) => k.isOver).length;

  const calculatedFulfillmentSum = kpiDataset.reduce((sum, item) => {
    return item.achievementPercent != null ? sum + item.achievementPercent : sum;
  }, 0);
  const itemsWithAchievement = kpiDataset.filter(
    (item) => item.achievementPercent != null
  ).length;
  const avgFulfillmentRate =
    itemsWithAchievement > 0
      ? Math.round((calculatedFulfillmentSum / itemsWithAchievement) * 10) / 10
      : null;

  // Chart Data: Target vs Actual comparison across assigned KPIs
  const barChartData = useMemo(() => {
    return kpiDataset
      .slice(0, 10) // display top 10 for clean layout
      .map((k) => ({
        name: k.code,
        title: k.title,
        target: k.plannedTarget != null ? Number(k.plannedTarget) : 0,
        actual: k.reportedActual != null ? Number(k.reportedActual) : 0,
        unit: k.expectedUnit,
      }));
  }, [kpiDataset]);

  // TanStack DataTable Columns
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "indicator",
        header: "National Indicator",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1 max-w-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {item.code}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {item.category?.replace(/_/g, " ")}
                </Badge>
              </div>
              <p
                className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-2"
                title={item.title}
              >
                {item.title}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>Unit: {item.expectedUnit}</span>
                <span>•</span>
                <span className="capitalize">{item.frequency}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "mandate",
        header: "Mandate",
        cell: ({ row }) => {
          const isMandatory = row.original.isMandatory;
          return isMandatory ? (
            <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 text-[10px]">
              Mandatory
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-600 text-[10px]">
              Optional
            </Badge>
          );
        },
      },
      {
        id: "method",
        header: "Method",
        cell: ({ row }) => {
          const method = row.original.submissionMethod;
          return method === "form_based" ? (
            <Badge variant="outline" className="text-teal-700 border-teal-300 bg-teal-50/50 text-[10px]">
              Form-Based
            </Badge>
          ) : (
            <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50/50 text-[10px]">
              Node Mapping
            </Badge>
          );
        },
      },
      {
        id: "plannedTarget",
        header: "Planned Target",
        cell: ({ row }) => {
          const item = row.original;
          return item.plannedTarget != null ? (
            <div className="font-mono text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Number(item.plannedTarget).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {item.expectedUnit}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: "reportedActual",
        header: "Reported Actual",
        cell: ({ row }) => {
          const item = row.original;
          return item.reportedActual != null ? (
            <div className="font-mono text-xs">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {Number(item.reportedActual).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans">
                {item.expectedUnit}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">Pending</span>
          );
        },
      },
      {
        id: "achievement",
        header: "Fulfillment",
        cell: ({ row }) => {
          const item = row.original;
          if (item.achievementPercent == null) {
            return <span className="text-slate-400 text-xs">—</span>;
          }
          const rate = item.achievementPercent;
          return (
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`font-bold text-xs ${
                  rate >= 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : rate >= 70
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {rate}%
              </span>
              {item.isOver && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 font-mono">
                  +{(rate - 100).toFixed(1)}%
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Submission Status",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-0.5">
              {item.isPublished ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted & Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] flex items-center gap-1 w-fit">
                  <Clock className="h-3 w-3" />
                  Pending Submission
                </Badge>
              )}
              {item.publicationReference && (
                <span className="text-[9px] font-mono text-slate-400 block">
                  Ref: {item.publicationReference}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "lockStatus",
        header: "Period Lock",
        cell: ({ row }) => {
          const item = row.original;
          if (item.isManuallyUnlocked) {
            return (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 text-[10px] flex items-center gap-1 w-fit">
                <Unlock className="h-2.5 w-2.5" />
                Admin Override
              </Badge>
            );
          }
          if (item.isLocked) {
            return (
              <Badge variant="outline" className="text-rose-600 border-rose-300 bg-rose-50/50 text-[10px] flex items-center gap-1 w-fit">
                <Lock className="h-2.5 w-2.5" />
                Locked
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50/50 text-[10px] flex items-center gap-1 w-fit">
              <Clock className="h-2.5 w-2.5" />
              Open Window
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/national-reporting/indicators/${item.requirementId}?year=${reportingYear}&period=${periodLabel}`
                  )
                }
                className="h-7 text-xs border-slate-300 hover:bg-slate-100 dark:border-slate-700 flex items-center gap-1"
                title="View full indicator details and across-regional comparative statistics"
              >
                <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Indicator Detail</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedAssignmentForLock(item.rawAssignment)}
                className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950 flex items-center gap-1"
                title="Admin period unlock/lock management"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Lock Control</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [router, reportingYear, periodLabel]
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 -ml-2 mb-1 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to National Dashboard</span>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {region.name}
            </h1>
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300">
              {region.code}
            </span>
            <Badge
              variant="outline"
              className={
                complianceRate === 100
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : complianceRate >= 50
                  ? "bg-teal-50 text-teal-800 border-teal-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }
            >
              {complianceRate === 100
                ? "100% Fully Compliant"
                : `${complianceRate}% Compliance Rate`}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              Method:{" "}
              {region.national_reporting_method === "node_mapping"
                ? "Node Mapping"
                : "Form-Based"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated Federal Analysis of Nationally Assigned Reporting KPIs,
            Period Submissions, and Provincial Achievements for {region.name}.
          </p>
        </div>

        {/* Global Cycle Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(reportingYear)}
            onValueChange={(val) => onYearChange(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((yr) => (
                <SelectItem key={yr} value={String(yr)} className="text-xs">
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodLabel} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <Clock className="h-3.5 w-3.5 mr-1 text-slate-500" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Periods (Annual)
              </SelectItem>
              <SelectItem value="Q1" className="text-xs">
                Quarter 1 (Q1)
              </SelectItem>
              <SelectItem value="Q2" className="text-xs">
                Quarter 2 (Q2)
              </SelectItem>
              <SelectItem value="Q3" className="text-xs">
                Quarter 3 (Q3)
              </SelectItem>
              <SelectItem value="Q4" className="text-xs">
                Quarter 4 (Q4)
              </SelectItem>
              <SelectItem value="Semi-Annual 1" className="text-xs">
                Semi-Annual 1
              </SelectItem>
              <SelectItem value="Annual" className="text-xs">
                Full Annual
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Assigned */}
        <Card className="p-3.5 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Assigned Indicators</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {totalAssignedCount}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Active national mandates
          </span>
        </Card>

        {/* Published Submissions */}
        <Card className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs">
            <span>Published Reports</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            {publishedCount}
          </div>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">
            Submitted & officially verified
          </span>
        </Card>

        {/* Missing Submissions */}
        <Card className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs">
            <span>Pending Submissions</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300 mt-1">
            {pendingCount}
          </div>
          <span className="text-[10px] text-amber-600/80 block mt-0.5">
            Awaiting provincial submission
          </span>
        </Card>

        {/* Compliance Rate */}
        <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Compliance Rate</span>
            <Building className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {complianceRate}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                complianceRate === 100
                  ? "bg-emerald-600"
                  : complianceRate >= 50
                  ? "bg-teal-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, complianceRate)}%` }}
            />
          </div>
        </Card>

        {/* Over-Achieved / Avg Fulfillment */}
        <Card className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs">
            <span>Avg Fulfillment</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-800 dark:text-blue-300 mt-1 flex items-center gap-1.5">
            {avgFulfillmentRate != null ? `${avgFulfillmentRate}%` : "—"}
            {overachievedCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 font-mono">
                {overachievedCount} Over
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-blue-600/80 block mt-0.5">
            Across reported indicators
          </span>
        </Card>
      </div>

      {/* Visual Analytics Bar Chart: Planned Target vs Reported Output */}
      {barChartData.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Target vs Reported Actual Comparison ({reportingYear} {periodLabel !== "all" ? periodLabel : "Annual"})
              </span>
              <span className="text-xs font-normal text-slate-400">
                Top assigned indicators
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toLocaleString()} ${item.payload.unit}`,
                      name === "target" ? "Planned Target" : "Reported Output",
                    ]}
                    labelFormatter={(label: any, items: any) => {
                      const first = items?.[0]?.payload;
                      return first ? `${first.name} - ${first.title}` : label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="target" name="Planned Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Reported Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabular List of Assigned National Reporting KPIs */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <span>Assigned National Indicators Matrix for {region.name}</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Official federal requirements assigned to this regional state with reporting fulfillment and lock status.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search indicators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Categories
                  </SelectItem>
                  {uniqueCategories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">
                      {c.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[125px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Status
                  </SelectItem>
                  <SelectItem value="published" className="text-xs">
                    Submitted
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs">
                    Pending
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Mandate Filter */}
              <Select value={mandateFilter} onValueChange={setMandateFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue placeholder="Mandate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Mandates
                  </SelectItem>
                  <SelectItem value="mandatory" className="text-xs">
                    Mandatory
                  </SelectItem>
                  <SelectItem value="optional" className="text-xs">
                    Optional
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Over-Achieved Toggle */}
              <Button
                variant={overachievedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setOverachievedOnly(!overachievedOnly)}
                className={`h-8 text-xs flex items-center gap-1.5 ${
                  overachievedOnly
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Over-Achieved</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1">
          <DataTable
            columns={columns}
            data={filteredKpis}
            defaultPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Lock Override Modal */}
      {selectedAssignmentForLock && (
        <PeriodLockOverrideModal
          isOpen={Boolean(selectedAssignmentForLock)}
          onClose={() => setSelectedAssignmentForLock(null)}
          assignment={selectedAssignmentForLock}
        />
      )}
    </div>
  );
}

