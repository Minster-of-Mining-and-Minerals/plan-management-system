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
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  FileText,
  Layers,
  Search,
  Globe,
  Sparkles,
} from "lucide-react";

export interface AssignedRegionInfo {
  assignmentId: string;
  regionId: string;
  regionName: string;
  regionCode: string;
  isMandatory: boolean;
  status: string;
  submissionMethod?: string | null;
  reportedActual?: number | null;
  plannedTarget?: number | null;
  localUnit?: string | null;
  standardizedActual?: number | null;
  standardizedTarget?: number | null;
  standardizedUnit?: string | null;
  achievementPercent?: number | null;
  publicationReference?: string | null;
  publishedAt?: string | null;
  publishedRecordId?: string | null;
  narrative?: string | null;
}

export interface NationalIndicatorDetailData {
  requirementId: string;
  code: string;
  title: string;
  description?: string | null;
  category: string;
  expectedUnit: string;
  frequency: string;
  assignedRegionsCount: number;
  submittedRegionsCount: number;
  isCompleteData: boolean;
  dataCompletenessPercent: number;
  nationalTotalTarget?: number | null;
  nationalTotalActual?: number | null;
  achievementRate?: number | null;
  assignedRegions?: AssignedRegionInfo[];
  submissions?: any[];
}

interface Props {
  indicator: NationalIndicatorDetailData;
  onBack: () => void;
  reportingYear?: number;
  periodLabel?: string;
}

export function NationalIndicatorDetailView({
  indicator,
  onBack,
  reportingYear = new Date().getFullYear(),
  periodLabel = "all",
}: Props) {
  const router = useRouter();

  // Search and filter state for regional assignments table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mandateFilter, setMandateFilter] = useState("all");

  const actual = indicator.nationalTotalActual || 0;
  const target = indicator.nationalTotalTarget || 0;
  const achievementRate = indicator.achievementRate;
  const isOverAchieved = achievementRate != null && achievementRate > 100;
  const assignedList: AssignedRegionInfo[] = indicator.assignedRegions || [];

  // Filtered regional assignments for the table
  const filteredAssignedList = useMemo(() => {
    return assignedList.filter((asgn) => {
      const hasSubmitted = asgn.status === "published" || asgn.status === "clarification_requested";
      if (statusFilter === "submitted" && !hasSubmitted) return false;
      if (statusFilter === "pending" && hasSubmitted) return false;

      if (mandateFilter === "mandatory" && !asgn.isMandatory) return false;
      if (mandateFilter === "optional" && asgn.isMandatory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        asgn.regionName.toLowerCase().includes(q) ||
        asgn.regionCode.toLowerCase().includes(q) ||
        (asgn.publicationReference && asgn.publicationReference.toLowerCase().includes(q))
      );
    });
  }, [assignedList, searchQuery, statusFilter, mandateFilter]);

  // Chart 1: Target vs Actual by Regional State
  const regionalBarChartData = useMemo(() => {
    return assignedList.map((asgn) => ({
      name: asgn.regionName,
      code: asgn.regionCode,
      target: asgn.standardizedTarget ?? asgn.plannedTarget ?? 0,
      actual: asgn.standardizedActual ?? asgn.reportedActual ?? 0,
      achievementRate: asgn.achievementPercent ?? 0,
    }));
  }, [assignedList]);

  // Table Columns Definition (TanStack DataTable)
  const columns: ColumnDef<AssignedRegionInfo>[] = useMemo(
    () => [
      {
        id: "region",
        header: "Regional State",
        cell: ({ row }) => {
          const asgn = row.original;
          return (
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{asgn.regionName}</span>
                {asgn.regionCode && (
                  <span className="text-[10px] font-mono text-slate-400">[{asgn.regionCode}]</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {asgn.isMandatory ? (
                  <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[9px] px-1.5 py-0 border-amber-300">
                    Mandatory
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    Optional
                  </Badge>
                )}
                <span className="text-[10px] text-slate-400 font-mono capitalize">
                  {asgn.submissionMethod?.replace(/_/g, " ") || "form based"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "plannedTarget",
        header: "Planned Target",
        cell: ({ row }) => {
          const asgn = row.original;
          return asgn.plannedTarget != null ? (
            <div className="space-y-0.5 font-mono text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {Number(asgn.plannedTarget).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block">
                {asgn.localUnit || indicator.expectedUnit}
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
          const asgn = row.original;
          return asgn.reportedActual != null ? (
            <div className="space-y-0.5 font-mono text-xs">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {Number(asgn.reportedActual).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block">
                {asgn.localUnit || indicator.expectedUnit}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">Not reported</span>
          );
        },
      },
      {
        id: "standardizedOutput",
        header: "Standardized Output",
        cell: ({ row }) => {
          const asgn = row.original;
          return asgn.standardizedActual != null ? (
            <div className="font-mono text-xs">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {Number(asgn.standardizedActual).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-sans block">
                {indicator.expectedUnit}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: "achievementRate",
        header: "Achievement",
        cell: ({ row }) => {
          const asgn = row.original;
          const isOver = asgn.achievementPercent != null && asgn.achievementPercent > 100;
          return asgn.achievementPercent != null ? (
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`font-bold text-xs ${
                  asgn.achievementPercent >= 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : asgn.achievementPercent >= 70
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {asgn.achievementPercent}%
              </span>
              {isOver && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 font-mono">
                  +{(asgn.achievementPercent - 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          );
        },
      },
      {
        id: "status",
        header: "Submission Status",
        cell: ({ row }) => {
          const asgn = row.original;
          const hasSubmitted = asgn.status === "published" || asgn.status === "clarification_requested";

          return (
            <div className="space-y-1">
              {hasSubmitted ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted & Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] w-fit">
                  Pending Submission
                </Badge>
              )}
              {asgn.publicationReference && (
                <span className="text-[10px] font-mono text-slate-400 block">
                  {asgn.publicationReference}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const asgn = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/regions/${asgn.regionId}/national-reporting?tab=assigned`)}
              className="h-8 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center gap-1.5"
              title={`View ${asgn.regionName}'s complete assigned national reporting KPIs and analytics`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Region's KPIs</span>
            </Button>
          );
        },
      },
    ],
    [indicator.expectedUnit, router]
  );

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs -ml-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1.5 mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to National Dashboard
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
              {indicator.code}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {indicator.category?.replace(/_/g, " ")}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize font-mono">
              Cycle: {indicator.frequency}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              Expected Unit: {indicator.expectedUnit}
            </Badge>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            {indicator.title}
          </h1>

          {indicator.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              {indicator.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Monitoring Framework
          </span>
          <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
            {reportingYear} {periodLabel && periodLabel !== "all" ? periodLabel : "Annual Aggregate"}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Federal Mandate Analysis
          </span>
        </div>
      </div>

      {/* Executive Aggregate Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* National Planned Target */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              National Planned Target
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {indicator.nationalTotalTarget != null
                ? Number(indicator.nationalTotalTarget).toLocaleString()
                : "—"}{" "}
              <span className="text-xs font-sans font-normal text-slate-500">
                {indicator.expectedUnit}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Combined target across {indicator.assignedRegionsCount} assigned regional states
            </span>
          </CardContent>
        </Card>

        {/* National Reported Actual */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              National Reported Output
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {indicator.nationalTotalActual != null
                ? Number(indicator.nationalTotalActual).toLocaleString()
                : "—"}{" "}
              <span className="text-xs font-sans font-normal text-slate-500">
                {indicator.expectedUnit}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Sum of verified regional reports received to date
            </span>
          </CardContent>
        </Card>

        {/* National Fulfillment Rate */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              National Fulfillment Rate
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {achievementRate != null ? `${achievementRate}%` : "—"}
              </span>
              {isOverAchieved && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 font-mono">
                  +{(achievementRate! - 100).toFixed(1)}% Over
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Total Actual vs Total Target ratio
            </span>
          </CardContent>
        </Card>

        {/* Regional Reporting Coverage */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Regional State Coverage
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {indicator.dataCompletenessPercent}%
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {indicator.submittedRegionsCount} / {indicator.assignedRegionsCount} States
              </Badge>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  indicator.isCompleteData
                    ? "bg-emerald-600"
                    : indicator.submittedRegionsCount > 0
                    ? "bg-amber-500"
                    : "bg-slate-300"
                }`}
                style={{ width: `${Math.min(100, indicator.dataCompletenessPercent)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Status Banner */}
      {!indicator.isCompleteData ? (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold block">Partial National Aggregate:</span>
            <span>
              {indicator.submittedRegionsCount} of {indicator.assignedRegionsCount} assigned regional states have officially submitted their figures for this period ({indicator.dataCompletenessPercent}% reporting completeness).
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <span className="font-bold block">100% Comprehensive National Coverage:</span>
            <span>
              All {indicator.assignedRegionsCount} designated regional states have submitted validated reporting data for this KPI indicator.
            </span>
          </div>
        </div>
      )}

      {/* Visual Analytics Chart: Regional Output Breakdown */}
      {regionalBarChartData.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart className="h-4 w-4 text-emerald-600" />
              Regional State Target vs Actual Output Comparison ({indicator.expectedUnit})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-3">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={regionalBarChartData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString()} ${indicator.expectedUnit}`,
                      name === "target" ? "Planned Target" : "Reported Output",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="target" name="Planned Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Reported Output" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabular Section: Assigned Regions Matrix (TanStack DataTable) */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-5 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                Regional Assignment Distribution & Submissions Matrix
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Every regional state assigned to report against this national KPI. Click "View Region's KPIs" to navigate into that region's assigned KPI analytics.
              </p>
            </div>

            <Badge variant="outline" className="font-mono text-xs w-fit">
              {filteredAssignedList.length} Regional States
            </Badge>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search region name, code, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Submission Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px] h-8 text-xs bg-slate-50 dark:bg-slate-950">
                  <SelectValue placeholder="All Submissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions</SelectItem>
                  <SelectItem value="submitted">Submitted & Verified</SelectItem>
                  <SelectItem value="pending">Pending Submission</SelectItem>
                </SelectContent>
              </Select>

              {/* Mandate Filter */}
              <Select value={mandateFilter} onValueChange={setMandateFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-50 dark:bg-slate-950">
                  <SelectValue placeholder="All Mandates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Mandates</SelectItem>
                  <SelectItem value="mandatory">Mandatory Only</SelectItem>
                  <SelectItem value="optional">Optional Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1">
          <DataTable
            columns={columns}
            data={filteredAssignedList}
            defaultPageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
