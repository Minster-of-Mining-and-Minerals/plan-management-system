"use client";

import React, { useMemo, useState } from "react";
import {
  useGetRegionalNationalDashboardQuery,
  useGetNationalCategoriesQuery,
  useGetRegionalAssignedRequirementsQuery,
} from "@/redux/api/nationalReportingApi";
import { NationalReportingAssignment } from "@/redux/types/nationalReporting";
import { RegionalKpiDetailView } from "./RegionalKpiDetailView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "recharts";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface Props {
  regionId: string;
}

export function RegionalNationalDashboardTab({ regionId }: Props) {
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [kpiFilter, setKpiFilter] = useState<string>("all");
  const [selectedAssignment, setSelectedAssignment] = useState<NationalReportingAssignment | null>(null);

  const { data: customCategories = [] } = useGetNationalCategoriesQuery();
  const { data: allAssignments = [], refetch: refetchAssignments } = useGetRegionalAssignedRequirementsQuery({
    regionId,
  });

  const { data: summary, isLoading } = useGetRegionalNationalDashboardQuery({
    regionId,
    reporting_year: yearFilter !== "all" ? yearFilter : "all",
    reporting_period_label: periodFilter !== "all" ? periodFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    requirement_id: kpiFilter !== "all" ? kpiFilter : undefined,
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, { code: string; label: string; icon?: string }>();
    (customCategories || []).forEach((c) => map.set(c.code, c));
    return map;
  }, [customCategories]);

  // Cascaded Category options from this region's assigned KPIs
  const cascadedCategoryOptions = useMemo(() => {
    const presentCats = new Set(
      allAssignments.map((a) => a.requirement?.category).filter(Boolean) as string[]
    );
    if (customCategories.length > 0) {
      return customCategories.filter((c) => presentCats.size === 0 || presentCats.has(c.code));
    }
    return Array.from(presentCats).map((code) => ({ code, label: code, icon: "📊" }));
  }, [allAssignments, customCategories]);

  // Cascaded KPI options based on Category filter
  const cascadedKpiOptions = useMemo(() => {
    return allAssignments
      .filter((a) => a.requirement && (categoryFilter === "all" || a.requirement.category === categoryFilter))
      .map((a) => a.requirement!);
  }, [allAssignments, categoryFilter]);

  const handleCategoryChange = (nextCat: string) => {
    setCategoryFilter(nextCat);
    if (
      kpiFilter !== "all" &&
      !allAssignments.some(
        (a) =>
          a.requirement?.requirement_id === kpiFilter &&
          (nextCat === "all" || a.requirement?.category === nextCat)
      )
    ) {
      setKpiFilter("all");
    }
  };

  if (selectedAssignment) {
    return (
      <RegionalKpiDetailView
        assignment={selectedAssignment}
        regionId={regionId}
        isFormReportingActive={true}
        onBack={() => {
          setSelectedAssignment(null);
          refetchAssignments();
        }}
      />
    );
  }

  const kpis = summary?.kpis || {
    totalAssignedCount: 0,
    submittedCount: 0,
    pendingCount: 0,
    complianceRate: 0,
    aggregateTarget: null,
    aggregateActual: null,
    overallAchievementRate: null,
  };

  const indicatorSummaries = summary?.indicatorSummaries || [];
  const categoryBreakdown = summary?.categoryBreakdown || [];

  const targetVsActualData = indicatorSummaries.slice(0, 12).map((item) => ({
    name: item.code,
    title: item.title,
    target: item.configuredTarget ?? 0,
    actual: item.reportedActual ?? 0,
    unit: item.expectedUnit,
  }));

  const columns: ColumnDef<any>[] = [
    {
      id: "indicator",
      header: "National Indicator",
      cell: ({ row }) => {
        const item = row.original;
        const catMeta = categoryMap.get(item.category);
        return (
          <div className="space-y-0.5 max-w-sm">
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2">
              {item.title}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                {item.code}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {catMeta?.icon || "📊"} {item.categoryLabel || catMeta?.label || item.category}
              </Badge>
              <span className="text-[10px] text-slate-400 capitalize">({item.frequency})</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "target",
      header: "Set Target",
      cell: ({ row }) => {
        const val = row.original.configuredTarget;
        return val != null ? (
          <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
            {Number(val).toLocaleString()}{" "}
            <span className="text-[10px] text-slate-400 font-sans">{row.original.expectedUnit}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">Not set</span>
        );
      },
    },
    {
      id: "actual",
      header: "Reported Actual",
      cell: ({ row }) => {
        const val = row.original.reportedActual;
        return val != null ? (
          <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
            {Number(val).toLocaleString()}{" "}
            <span className="text-[10px] text-slate-400 font-sans">{row.original.expectedUnit}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">Not reported</span>
        );
      },
    },
    {
      id: "achievement",
      header: "Achievement",
      cell: ({ row }) => {
        const rate = row.original.achievementRate;
        return rate != null ? (
          <span
            className={`font-mono font-bold text-xs ${
              rate >= 100 ? "text-emerald-600" : rate >= 70 ? "text-blue-600" : "text-amber-600"
            }`}
          >
            {rate}%
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        );
      },
    },
    {
      id: "progress",
      header: "Periods Reported",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.original.reportedPeriodsCount} / {row.original.totalPeriodsCount}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.status === "submitted" ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
            Submitted
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
            Pending
          </Badge>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const fullAsgn = allAssignments.find((a) => a.assignment_id === row.original.assignmentId);
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={!fullAsgn}
            onClick={() => fullAsgn && setSelectedAssignment(fullAsgn)}
            className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Open & Report</span>
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cascaded Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider mr-1">
            Cascaded Filters:
          </span>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2026">2026 (2018/19 EC)</SelectItem>
              <SelectItem value="2027">2027 (2019 EC)</SelectItem>
              <SelectItem value="2019">2019 E.C.</SelectItem>
              <SelectItem value="2018">2018 E.C.</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year Aggregated</SelectItem>
              <SelectItem value="Hamle (2018)">Hamle (2018 EC)</SelectItem>
              <SelectItem value="Nehase (2018)">Nehase (2018 EC)</SelectItem>
              <SelectItem value="Pagume (2018)">Pagume (2018 EC)</SelectItem>
              <SelectItem value="Meskerem (2019)">Meskerem (2019 EC)</SelectItem>
              <SelectItem value="Tikimt (2019)">Tikimt (2019 EC)</SelectItem>
              <SelectItem value="Hidar (2019)">Hidar (2019 EC)</SelectItem>
              <SelectItem value="Tahsas (2019)">Tahsas (2019 EC)</SelectItem>
              <SelectItem value="Tir (2019)">Tir (2019 EC)</SelectItem>
              <SelectItem value="Yekatit (2019)">Yekatit (2019 EC)</SelectItem>
              <SelectItem value="Megabit (2019)">Megabit (2019 EC)</SelectItem>
              <SelectItem value="Miazia (2019)">Miazia (2019 EC)</SelectItem>
              <SelectItem value="Ginbot (2019)">Ginbot (2019 EC)</SelectItem>
              <SelectItem value="Sene (2019)">Sene (2019 EC)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[220px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({cascadedCategoryOptions.length})</SelectItem>
              {cascadedCategoryOptions.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.icon || "📊"} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kpiFilter} onValueChange={setKpiFilter}>
            <SelectTrigger className="w-[240px] bg-slate-50 dark:bg-slate-950 text-xs">
              <SelectValue placeholder="All KPIs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KPIs ({cascadedKpiOptions.length})</SelectItem>
              {cascadedKpiOptions.map((req) => (
                <SelectItem key={req.requirement_id} value={req.requirement_id}>
                  {req.code} — {req.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(categoryFilter !== "all" || kpiFilter !== "all" || periodFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter("all");
                setKpiFilter("all");
                setPeriodFilter("all");
              }}
              className="h-8 text-xs text-rose-600"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>Category → KPI cascaded target analytics</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Assigned KPIs</span>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono">{kpis.totalAssignedCount}</span>
            <Layers className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Submitted / Rate</span>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold font-mono text-emerald-700">{kpis.submittedCount}</span>
              <span className="text-xs text-slate-500 ml-1.5">({kpis.complianceRate}%)</span>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-4">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500">
              Aggregate Target (By Unit)
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {kpis.aggregateTargetsByUnit && kpis.aggregateTargetsByUnit.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {kpis.aggregateTargetsByUnit.map((item) => (
                    <span
                      key={item.unit}
                      className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold font-mono text-slate-900 dark:text-slate-100"
                    >
                      {Number(item.totalTarget).toLocaleString()}
                      <span className="text-[11px] font-semibold text-slate-500">{item.unit}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {kpis.aggregateTarget != null ? Number(kpis.aggregateTarget).toLocaleString() : "—"}
                </span>
              )}
            </div>
            <Scale className="h-5 w-5 text-slate-600 shrink-0" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold uppercase text-emerald-700">Reported Actual</span>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-start justify-between gap-2">
            <div className="min-w-0">
              {kpis.aggregateTargetsByUnit && kpis.aggregateTargetsByUnit.length === 1 ? (
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {Number(kpis.aggregateTargetsByUnit[0].totalActual).toLocaleString()}{" "}
                  <span className="text-xs font-semibold">{kpis.aggregateTargetsByUnit[0].unit}</span>
                </span>
              ) : kpis.aggregateTargetsByUnit && kpis.aggregateTargetsByUnit.length > 1 ? (
                <div className="flex flex-wrap gap-1">
                  {kpis.aggregateTargetsByUnit.map((item) => (
                    <span
                      key={item.unit}
                      className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded"
                    >
                      {Number(item.totalActual).toLocaleString()} {item.unit}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {kpis.aggregateActual != null ? Number(kpis.aggregateActual).toLocaleString() : "0"}
                </span>
              )}
            </div>
            <BarChart3 className="h-5 w-5 text-emerald-600 shrink-0" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold uppercase text-teal-700">Achievement Rate</span>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-center justify-between">
            <span className="text-2xl font-bold font-mono text-teal-700">
              {kpis.overallAchievementRate != null ? `${kpis.overallAchievementRate}%` : "0%"}
            </span>
            <TrendingUp className="h-5 w-5 text-teal-600" />
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Cards */}
      {categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryBreakdown.map((cat) => (
            <Card
              key={cat.category}
              onClick={() => handleCategoryChange(categoryFilter === cat.category ? "all" : cat.category)}
              className={`cursor-pointer p-3 transition-all ${
                categoryFilter === cat.category
                  ? "border-emerald-600 ring-2 ring-emerald-500/20"
                  : "hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold truncate" title={cat.categoryLabel || cat.category}>
                  {cat.icon || "📊"} {cat.categoryLabel || cat.category}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono ml-1 shrink-0">
                  {cat.publishedCount}/{cat.assignmentsCount}
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                Target: {cat.totalTarget != null ? Number(cat.totalTarget).toLocaleString() : "—"} • Actual:{" "}
                {cat.totalActual != null ? Number(cat.totalActual).toLocaleString() : "0"}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Target vs Actual Graph */}
      {targetVsActualData.length > 0 && (
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span>Set Target vs Reported Actual (Top Filtered KPIs)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={targetVsActualData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="target" name="Set Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Reported Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regional KPI Target & Reporting Table */}
      <Card className="p-4">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Assigned KPIs Target & Reporting Summary
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {indicatorSummaries.length} Indicators
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={indicatorSummaries} isLoading={isLoading} defaultPageSize={10} />
        </CardContent>
      </Card>
    </div>
  );
}

