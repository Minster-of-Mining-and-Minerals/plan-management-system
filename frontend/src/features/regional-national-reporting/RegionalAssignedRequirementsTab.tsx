"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetRegionNationalReportingConfigQuery,
  useGetNationalCategoriesQuery,
} from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { RegionalKpiDetailView } from "./RegionalKpiDetailView";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import type { FilterField } from "@/types/tableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Layers,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FolderOpen,
} from "lucide-react";

interface Props {
  regionId: string;
}

export function RegionalAssignedRequirementsTab({ regionId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").toLowerCase().trim();

  const {
    data: assignments = [],
    isLoading,
    isError,
    refetch,
  } = useGetRegionalAssignedRequirementsQuery({ regionId });

  const { data: customCategories = [] } = useGetNationalCategoriesQuery();

  const { data: regionConfig } = useGetRegionNationalReportingConfigQuery(
    regionId,
    { skip: !regionId }
  );

  // Form-based reporting is the system default unless explicitly configured otherwise
  const isFormReportingActive = regionConfig
    ? Boolean(regionConfig.is_form_reporting_effective)
    : true;

  // Selected assignment for detailed view
  const [selectedAssignment, setSelectedAssignment] =
    useState<NationalReportingAssignment | null>(null);

  // Collapsible category state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [kpiFilter, setKpiFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [mandatoryFilter, setMandatoryFilter] = useState("all");

  // Cascaded KPI options based on Category filter
  const cascadedKpiOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: "all", label: "All KPIs" },
    ];
    assignments.forEach((a) => {
      if (!a.requirement) return;
      if (categoryFilter !== "all" && a.requirement.category !== categoryFilter) return;
      list.push({
        value: a.requirement.requirement_id,
        label: `${a.requirement.code} — ${a.requirement.title}`,
      });
    });
    return list;
  }, [assignments, categoryFilter]);

  const handleCategoryChange = (nextCat: string) => {
    setCategoryFilter(nextCat);
    if (
      kpiFilter !== "all" &&
      !assignments.some(
        (a) =>
          a.requirement?.requirement_id === kpiFilter &&
          (nextCat === "all" || a.requirement?.category === nextCat)
      )
    ) {
      setKpiFilter("all");
    }
  };

  // Category metadata lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof customCategories)[0]>();
    customCategories.forEach((cat) => {
      map.set(cat.code, cat);
    });
    return map;
  }, [customCategories]);

  // Dynamic filter options based on real categories
  const dynamicCategories = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [
      { value: "all", label: "All Categories" },
    ];
    customCategories.forEach((cat) => {
      list.push({
        value: cat.code,
        label: `${cat.icon || "📊"} ${cat.label}`,
      });
    });
    return list;
  }, [customCategories]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return assignments.filter((a) => {
      const req = a.requirement;
      if (!req) return false;

      const catMeta = categoryMap.get(req.category);

      // Search query across code, title, expected_unit, category, category label
      if (searchQuery) {
        const matchTitle = (req.title || "").toLowerCase().includes(searchQuery);
        const matchCode = (req.code || "").toLowerCase().includes(searchQuery);
        const matchUnit = (req.expected_unit || "").toLowerCase().includes(searchQuery);
        const matchCat = (req.category || "").toLowerCase().includes(searchQuery);
        const matchCatLabel = (catMeta?.label || "").toLowerCase().includes(searchQuery);
        if (!matchTitle && !matchCode && !matchUnit && !matchCat && !matchCatLabel) return false;
      }

      // Category filter
      if (categoryFilter !== "all" && req.category !== categoryFilter) {
        return false;
      }

      // Cascaded KPI filter
      if (kpiFilter !== "all" && req.requirement_id !== kpiFilter) {
        return false;
      }

      // Frequency filter
      if (frequencyFilter !== "all" && req.frequency !== frequencyFilter) {
        return false;
      }

      // Mandatory filter
      if (mandatoryFilter === "mandatory" && !a.is_mandatory) return false;
      if (mandatoryFilter === "optional" && a.is_mandatory) return false;

      // Progress filter
      const periods = a.recurringPeriods || [];
      const reportedCount = periods.filter(
        (p) =>
          p.reported_actual !== null &&
          p.reported_actual !== undefined &&
          (p.submission_status === "published" ||
            p.submission_status === "submitted" ||
            p.status === "published" ||
            p.status === "submitted")
      ).length;

      const totalPeriods = periods.length || 1;
      const isCompleted = reportedCount >= totalPeriods;
      const isStarted = reportedCount > 0;

      if (progressFilter === "completed" && !isCompleted) return false;
      if (progressFilter === "in_progress" && (!isStarted || isCompleted)) return false;
      if (progressFilter === "not_started" && isStarted) return false;

      return true;
    });
  }, [
    assignments,
    searchQuery,
    categoryFilter,
    kpiFilter,
    frequencyFilter,
    mandatoryFilter,
    progressFilter,
    categoryMap,
  ]);

  // Group filtered assignments by Category
  const groupedCategories = useMemo(() => {
    const map = new Map<string, NationalReportingAssignment[]>();
    filteredData.forEach((a) => {
      const catKey = a.requirement?.category || "uncategorized";
      if (!map.has(catKey)) map.set(catKey, []);
      map.get(catKey)!.push(a);
    });

    const list: Array<{
      code: string;
      label: string;
      icon: string;
      description?: string;
      frequency_default?: string;
      assignments: NationalReportingAssignment[];
    }> = [];

    // Order according to customCategories
    customCategories.forEach((cat) => {
      const items = map.get(cat.code);
      if (items && items.length > 0) {
        list.push({
          code: cat.code,
          label: cat.label,
          icon: cat.icon || "📊",
          description: cat.description,
          frequency_default: cat.frequency_default,
          assignments: items,
        });
        map.delete(cat.code);
      }
    });

    // Remainder categories
    map.forEach((items, code) => {
      list.push({
        code,
        label: code.replace(/^cat_/, "").replace(/_/g, " "),
        icon: "📁",
        assignments: items,
      });
    });

    return list;
  }, [filteredData, customCategories]);

  // Collapsible helper functions
  const isCategoryExpanded = (code: string) => {
    if (searchQuery.trim().length > 0) return true;
    return !collapsedCategories[code];
  };

  const toggleCategory = (code: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleExpandAll = () => {
    setCollapsedCategories({});
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedCategories.forEach((g) => {
      allCollapsed[g.code] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  // If user selected an assignment, render the detailed analytics & period view
  if (selectedAssignment) {
    return (
      <RegionalKpiDetailView
        assignment={selectedAssignment}
        regionId={regionId}
        onBack={() => setSelectedAssignment(null)}
        isFormReportingActive={isFormReportingActive}
      />
    );
  }

  // Columns for DataTable
  const columns: ColumnDef<NationalReportingAssignment>[] = [
    {
      id: "kpi",
      header: "National Indicator / KPI",
      cell: ({ row }) => {
        const item = row.original;
        const req = item.requirement;
        const catMeta = req ? categoryMap.get(req.category) : null;
        return (
          <div className="space-y-1 py-1 max-w-md">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {req?.code}
              </span>
              <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">
                <span className="mr-1">{catMeta?.icon || "📊"}</span>
                <span>{catMeta?.label || req?.category?.replace(/_/g, " ")}</span>
              </Badge>
              {item.is_mandatory && (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Mandatory
                </span>
              )}
            </div>
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2">
              {req?.title}
            </div>
          </div>
        );
      },
    },
    {
      id: "unit_frequency",
      header: "Unit & Frequency",
      cell: ({ row }) => {
        const item = row.original;
        const req = item.requirement;
        return (
          <div className="space-y-0.5 text-xs">
            <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {req?.expected_unit}{" "}
              <span className="text-[10px] text-slate-400 font-sans">
                ({req?.unit_category})
              </span>
            </div>
            <div className="text-[11px] text-slate-500 capitalize">
              {req?.frequency?.replace(/_/g, " ")}
            </div>
          </div>
        );
      },
    },
    {
      id: "division_window",
      header: "Division & Target",
      cell: ({ row }) => {
        const item = row.original;
        const periods = item.recurringPeriods || [];
        return (
          <div className="space-y-0.5 text-xs">
            {item.annual_target != null ? (
              <div className="font-medium text-emerald-700 dark:text-emerald-400 font-mono">
                Target: {Number(item.annual_target).toLocaleString()} {item.requirement?.expected_unit}
              </div>
            ) : (
              <div className="text-slate-400 italic text-[11px]">No preset annual target</div>
            )}
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span>{periods.length || 12} Scheduled Periods</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "progress",
      header: "Reporting Progress",
      cell: ({ row }) => {
        const item = row.original;
        const periods = item.recurringPeriods || [];
        const totalPeriods = periods.length || 1;
        const reportedCount = periods.filter(
          (p) =>
            p.reported_actual !== null &&
            p.reported_actual !== undefined &&
            (p.submission_status === "published" ||
              p.submission_status === "submitted" ||
              p.status === "published" ||
              p.status === "submitted")
        ).length;

        const progressPercent = Math.round((reportedCount / totalPeriods) * 100);

        return (
          <div className="space-y-1 text-xs min-w-[140px]">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {reportedCount}/{totalPeriods} Reported
              </span>
              <span
                className={`font-bold ${
                  progressPercent === 100
                    ? "text-emerald-600"
                    : progressPercent > 0
                    ? "text-blue-600"
                    : "text-slate-400"
                }`}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progressPercent === 100
                    ? "bg-emerald-600"
                    : progressPercent > 0
                    ? "bg-blue-600"
                    : "bg-slate-300"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      id: "method",
      header: "Reporting Method",
      cell: () => {
        return isFormReportingActive ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
            Form-Based
          </Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-semibold">
            Node Mapping
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
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedAssignment(item)}
              className="h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-slate-800"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>View Details</span>
            </Button>
          </div>
        );
      },
    },
  ];

  // Filters configuration for TableLayout
  const filters: FilterField[] = [
      {
        key: "category",
        label: "Category",
        type: "select",
        placeholder: "All Categories",
        value: categoryFilter,
        onChange: handleCategoryChange,
        options: dynamicCategories,
      },
      {
        key: "kpi",
        label: "KPI / Indicator",
        type: "select",
        placeholder: "All KPIs",
        value: kpiFilter,
        onChange: setKpiFilter,
        options: cascadedKpiOptions,
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "select",
        placeholder: "All Frequencies",
        value: frequencyFilter,
        onChange: setFrequencyFilter,
        options: [
          { label: "All Frequencies", value: "all" },
          { label: "Daily", value: "daily" },
          { label: "Monthly", value: "monthly" },
          { label: "Quarterly", value: "quarterly" },
          { label: "Semi-Annually", value: "semi_annually" },
          { label: "Annually", value: "annually" },
        ],
      },
    {
      key: "progress",
      label: "Reporting Progress",
      type: "select",
      placeholder: "All Progress States",
      value: progressFilter,
      onChange: setProgressFilter,
      options: [
        { label: "All Progress States", value: "all" },
        { label: "Fully Reported (100%)", value: "completed" },
        { label: "In Progress (> 0%)", value: "in_progress" },
        { label: "Not Started (0%)", value: "not_started" },
      ],
    },
    {
      key: "mandatory",
      label: "Requirement Type",
      type: "select",
      placeholder: "All Types",
      value: mandatoryFilter,
      onChange: setMandatoryFilter,
      options: [
        { label: "All Types", value: "all" },
        { label: "Mandatory Indicators Only", value: "mandatory" },
        { label: "Optional Indicators Only", value: "optional" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Mutually Exclusive Reporting Policy Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Form-Based Reporting Banner (Default) */}
        <div
          className={`p-4 rounded-xl border space-y-1 transition-all ${
            isFormReportingActive
              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-500/10 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText
                className={`h-4 w-4 ${isFormReportingActive ? "text-emerald-600" : "text-slate-400"}`}
              />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Form-Based National Reporting
              </h3>
            </div>
            {isFormReportingActive ? (
              <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                Default / Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {isFormReportingActive
              ? "Direct KPI form reporting is active. Submissions are entered per scheduled period with automated versioning and Amharic validation."
              : "Direct KPI form reporting is inactive for this region. Mode switchable from Federal administration."}
          </p>
          {isFormReportingActive && regionConfig?.form_reporting_end_date && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 pt-0.5">
              <Clock className="h-3 w-3" />
              <span>Effective until {regionConfig.form_reporting_end_date}</span>
            </div>
          )}
        </div>

        {/* Node Mapping Banner */}
        <div
          className={`p-4 rounded-xl border space-y-1 transition-all ${
            !isFormReportingActive
              ? "border-blue-300 dark:border-blue-700 bg-blue-500/10 shadow-sm"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers
                className={`h-4 w-4 ${!isFormReportingActive ? "text-blue-600" : "text-slate-400"}`}
              />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Regional Plan-Node Mapping
              </h3>
            </div>
            {!isFormReportingActive ? (
              <Badge className="bg-blue-600 text-white text-[10px] font-semibold">
                Active Method
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {!isFormReportingActive
              ? "Regional plan hierarchy mapping is active. Link regional KPIs, record periodic execution, and validate reports through the regional gateway."
              : "Node mapping is inactive while Form-Based Reporting is active. One reporting method operates at a time."}
          </p>
        </div>
      </div>

      {/* Tabular List of Assigned Mandates Grouped by Category */}
      <TableLayout
        title="Assigned National Indicators & Mandates"
        description="Regional mining KPIs grouped by Global Regulatory Category with independent category sub-tables."
        filters={filters}
        filterColumnsPerRow={4}
      >
        <div className="space-y-4 pt-2">
          {/* Master Summary Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-emerald-600" />
                {groupedCategories.length} Categories
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>{filteredData.length} Total Assigned Indicators</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExpandAll}
                className="h-7 text-xs px-2.5 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                Expand All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCollapseAll}
                className="h-7 text-xs px-2.5 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Loading / Error States */}
          {isLoading && (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading regional assigned indicators...
            </div>
          )}

          {isError && (
            <div className="p-8 text-center text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg">
              Failed to load assigned indicators.{" "}
              <Button variant="link" size="sm" onClick={() => refetch()} className="text-rose-700 underline">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && groupedCategories.length === 0 && (
            <div className="p-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
              <div className="text-3xl">🔍</div>
              <div className="font-medium text-slate-700 dark:text-slate-300">
                No assigned indicators match your filters
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try selecting "All Categories", clearing search, or adjusting the filter criteria.
              </p>
            </div>
          )}

          {/* Collapsible Category Cards with Independent Pagination per Category */}
          {!isLoading &&
            !isError &&
            groupedCategories.map((group) => {
              const isExpanded = isCategoryExpanded(group.code);
              return (
                <div
                  key={group.code}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs transition-all"
                >
                  {/* Category Header Banner */}
                  <div
                    onClick={() => toggleCategory(group.code)}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none border-b border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1 rounded-md bg-white dark:bg-slate-700 shadow-xs text-slate-500 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <span className="text-xl shrink-0">{group.icon}</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                            {group.label}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0"
                          >
                            {group.assignments.length}{" "}
                            {group.assignments.length === 1 ? "KPI" : "KPIs"}
                          </Badge>
                        </div>
                        {group.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {group.frequency_default && (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono capitalize hidden md:inline-flex bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {group.frequency_default.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400 font-mono hidden lg:inline">
                        {group.code}
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Sub-Table with Independent Pagination per Category */}
                  {isExpanded && (
                    <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                      <DataTable
                        columns={columns}
                        data={group.assignments}
                        defaultPageSize={10}
                        resetKey={`${searchQuery}-${categoryFilter}-${frequencyFilter}-${mandatoryFilter}-${progressFilter}-${group.code}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </TableLayout>
    </div>
  );
}
