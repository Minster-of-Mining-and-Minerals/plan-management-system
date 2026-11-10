"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetRegionNationalReportingConfigQuery,
} from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { RegionalKpiDetailView } from "./RegionalKpiDetailView";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
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

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const [mandatoryFilter, setMandatoryFilter] = useState("all");

  // Filtered dataset
  const filteredData = useMemo(() => {
    return assignments.filter((a) => {
      const req = a.requirement;
      if (!req) return false;

      // Search query across code, title, expected_unit, category
      if (searchQuery) {
        const matchTitle = (req.title || "").toLowerCase().includes(searchQuery);
        const matchCode = (req.code || "").toLowerCase().includes(searchQuery);
        const matchUnit = (req.expected_unit || "").toLowerCase().includes(searchQuery);
        const matchCat = (req.category || "").toLowerCase().includes(searchQuery);
        if (!matchTitle && !matchCode && !matchUnit && !matchCat) return false;
      }

      // Category filter
      if (categoryFilter !== "all" && req.category !== categoryFilter) {
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
    frequencyFilter,
    mandatoryFilter,
    progressFilter,
  ]);

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
  const columns = [
    {
      key: "kpi",
      header: "National Indicator / KPI",
      render: (item: NationalReportingAssignment) => {
        const req = item.requirement;
        return (
          <div className="space-y-1 py-1 max-w-md">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {req?.code}
              </span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {req?.category?.replace(/_/g, " ")}
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
      key: "unit_frequency",
      header: "Unit & Frequency",
      render: (item: NationalReportingAssignment) => {
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
      key: "division_window",
      header: "Division & Window",
      render: (item: NationalReportingAssignment) => {
        const req = item.requirement;
        const periods = item.recurringPeriods || [];
        return (
          <div className="space-y-0.5 text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span>{periods.length} Scheduled Periods</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Window: within {req?.submission_deadline_days || 15} days
            </div>
          </div>
        );
      },
    },
    {
      key: "progress",
      header: "Reporting Progress",
      render: (item: NationalReportingAssignment) => {
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
      key: "method",
      header: "Reporting Method",
      render: () => {
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
      key: "actions",
      header: "Actions",
      render: (item: NationalReportingAssignment) => {
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
      onChange: setCategoryFilter,
      options: [
        { label: "All Categories", value: "all" },
        { label: "Mining Production", value: "mining_production" },
        { label: "Revenue & Royalty", value: "revenue_royalty" },
        { label: "Export & Trade", value: "export_trade" },
        { label: "Safety & Inspection", value: "safety_inspection" },
        { label: "Environmental Compliance", value: "environmental_compliance" },
        { label: "Artisanal & Small Scale", value: "artisanal_small_scale" },
      ],
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

      {/* Tabular List of Assigned Mandates */}
      <TableLayout
        title="Assigned National Indicators & Mandates"
        filters={filters}
        filterColumnsPerRow={4}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load assigned national reporting requirements."
          onRetry={refetch}
          resetKey={`${searchQuery}-${categoryFilter}-${frequencyFilter}-${mandatoryFilter}-${progressFilter}`}
        />
      </TableLayout>
    </div>
  );
}
