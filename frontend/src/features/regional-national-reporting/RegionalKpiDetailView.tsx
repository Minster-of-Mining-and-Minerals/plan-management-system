"use client";

import React, { useState, useMemo } from "react";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { RegionalDirectFormModal } from "./RegionalDirectFormModal";
import { PeriodCountdownProgressBar } from "./PeriodCountdownProgressBar";
import { SubmissionVersionHistoryModal } from "../national-reporting/SubmissionVersionHistoryModal";
import { RegionalPublicationModal } from "./RegionalPublicationModal";
import { RegionalMappingModal } from "./RegionalMappingModal";
import { RegionalConfirmationModal } from "./RegionalConfirmationModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  Sparkles,
  Layers,
  Scale,
  FolderTree,
  Send,
  Eye,
  FileCheck,
  Target,
  BarChart3,
  Percent,
  Lock,
  Unlock,
} from "lucide-react";
import { generateReportingPeriods } from "@/utils/nationalReportingPeriodUtils";

interface Props {
  assignment: NationalReportingAssignment;
  regionId: string;
  onBack: () => void;
  isFormReportingActive?: boolean;
}

export function RegionalKpiDetailView({
  assignment,
  regionId,
  onBack,
  isFormReportingActive = true,
}: Props) {
  const req = assignment.requirement;
  const activeMapping = assignment.activeMapping;
  const mappedNode = activeMapping?.planNode;

  // Selected period for direct form modal
  const [activePeriodForForm, setActivePeriodForForm] = useState<ReportingPeriod | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Modals state
  const [versionHistoryParams, setVersionHistoryParams] = useState<{
    requirementId: string;
    reportingPeriodLabel?: string;
    titleHint?: string;
  } | null>(null);

  const [viewReceiptData, setViewReceiptData] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isConfirmingMappingOpen, setIsConfirmingMappingOpen] = useState(false);

  // Compute full recurring periods list
  const recurringPeriods: ReportingPeriod[] = useMemo(() => {
    if (assignment.recurringPeriods && assignment.recurringPeriods.length > 0) {
      return assignment.recurringPeriods;
    }
    if (req?.effective_start_date && req?.effective_end_date) {
      return generateReportingPeriods(
        req.effective_start_date,
        req.effective_end_date,
        req.frequency || "quarterly"
      );
    }
    return [
      { period_index: 1, period_label: "Q1", name: "Quarter 1", start_date: "", end_date: "" },
      { period_index: 2, period_label: "Q2", name: "Quarter 2", start_date: "", end_date: "" },
      { period_index: 3, period_label: "Q3", name: "Quarter 3", start_date: "", end_date: "" },
      { period_index: 4, period_label: "Q4", name: "Quarter 4", start_date: "", end_date: "" },
    ];
  }, [assignment.recurringPeriods, req]);

  // Analytics Computations across recurring periods
  const analytics = useMemo(() => {
    const totalPeriods = recurringPeriods.length;
    let reportedCount = 0;
    let totalTarget = 0;
    let totalActual = 0;
    let hasTarget = false;

    for (const p of recurringPeriods) {
      const isReported =
        p.reported_actual !== null &&
        p.reported_actual !== undefined &&
        (p.submission_status === "published" ||
          p.submission_status === "submitted" ||
          p.status === "published" ||
          p.status === "submitted");

      if (isReported) {
        reportedCount++;
        totalActual += Number(p.reported_actual || 0);
      }

      if (p.planned_target !== null && p.planned_target !== undefined) {
        hasTarget = true;
        totalTarget += Number(p.planned_target || 0);
      }
    }

    const reportingProgressPercent = totalPeriods > 0 ? Math.round((reportedCount / totalPeriods) * 100) : 0;
    const overallAchievementPercent =
      hasTarget && totalTarget > 0 ? Math.round((totalActual / totalTarget) * 1000) / 10 : null;

    // Determine currently active period (by current date)
    const now = Date.now();
    let currentPeriod: ReportingPeriod | null = null;
    for (const p of recurringPeriods) {
      if (p.start_date && p.end_date) {
        const s = new Date(p.start_date).getTime();
        const e = new Date(p.end_date).getTime();
        if (now >= s && now <= e) {
          currentPeriod = p;
          break;
        }
      }
    }
    if (!currentPeriod && recurringPeriods.length > 0) {
      currentPeriod = recurringPeriods.find((p) => p.status === "active") || recurringPeriods[0];
    }

    return {
      totalPeriods,
      reportedCount,
      reportingProgressPercent,
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      overallAchievementPercent,
      hasTarget,
      currentPeriod,
    };
  }, [recurringPeriods]);

  const handleOpenPeriodForm = (period: ReportingPeriod) => {
    setActivePeriodForForm(period);
    setIsFormModalOpen(true);
  };

  const handleViewReceipt = (period: ReportingPeriod) => {
    setViewReceiptData({
      publicationReference: period.publication_reference || "NAT-REF-VERIFIED",
      requirementCode: req?.code,
      reportingPeriod: `${period.period_label} (${period.start_date || ""} ~ ${period.end_date || ""})`,
      standardizedValue: `${period.reported_actual !== null ? period.reported_actual : "—"} ${req?.expected_unit}`,
      achievementPercent: `${period.achievement_rate !== null ? period.achievement_rate : "—"}%`,
      publishedAt: period.published_at || new Date().toISOString(),
      revisionNumber: (period as any).revision_number || 1,
    });
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assigned Mandates
          </Button>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block"></div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Nationally Assigned KPI Detail
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFormReportingActive ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 text-xs">
              Form-Based Reporting Active
            </Badge>
          ) : (
            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700 text-xs">
              Node Mapping Active
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Header & Mandate Specifications */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                {req?.code}
              </span>
              <Badge variant="outline" className="text-xs capitalize">
                {req?.category?.replace(/_/g, " ")}
              </Badge>
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                Expected Unit: {req?.expected_unit} ({req?.unit_category})
              </Badge>
              {assignment.is_mandatory && (
                <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 text-[10px] uppercase tracking-wider font-semibold">
                  Mandatory Federal Indicator
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {req?.title}
            </h1>

            {req?.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {req.description}
              </p>
            )}
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 shrink-0 min-w-[240px]">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Annual Reporting Cycle
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Dates:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {req?.effective_start_date || "2026-07-01"} ~ {req?.effective_end_date || "2027-06-30"}
              </strong>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Frequency:{" "}
              <strong className="capitalize text-slate-800 dark:text-slate-200">
                {req?.frequency?.replace(/_/g, " ")} ({recurringPeriods.length} Periods)
              </strong>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Deadline Window:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                within {req?.submission_deadline_days || 15} days of period close
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Analytics Card 1: Reporting Progress */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Reporting Progress</span>
            <BarChart3 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {analytics.reportingProgressPercent}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({analytics.reportedCount}/{analytics.totalPeriods} Periods)
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, analytics.reportingProgressPercent)}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 block">
            {analytics.reportedCount === analytics.totalPeriods
              ? "All periods submitted"
              : `${analytics.totalPeriods - analytics.reportedCount} period(s) pending`}
          </span>
        </div>

        {/* Analytics Card 2: Total Planned Target */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Planned Target</span>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {analytics.hasTarget ? analytics.totalTarget.toLocaleString() : "—"}
          </div>
          <span className="text-[11px] text-slate-500 block truncate font-mono">
            {req?.expected_unit} across {analytics.totalPeriods} periods
          </span>
        </div>

        {/* Analytics Card 3: Total Reported Actual */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Reported Actual</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {analytics.totalActual.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block truncate font-mono">
            {req?.expected_unit} recorded to date
          </span>
        </div>

        {/* Analytics Card 4: Overall Achievement Rate */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Overall Achievement</span>
            <Percent className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                analytics.overallAchievementPercent && analytics.overallAchievementPercent >= 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {analytics.overallAchievementPercent !== null
                ? `${analytics.overallAchievementPercent}%`
                : "—"}
            </span>
            {analytics.overallAchievementPercent && analytics.overallAchievementPercent > 100 && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                Overachieved
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {analytics.hasTarget ? "Weighted lifecycle progress" : "No targets configured"}
          </span>
        </div>
      </div>

      {/* Node Mapping Banner if mapped */}
      {!isFormReportingActive && mappedNode && (
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <FolderTree className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                Mapped Regional Plan Node: {mappedNode.title}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Conversion factor: {activeMapping?.unit_conversion_factor ?? 1} • Local unit: {activeMapping?.local_unit || mappedNode.target_unit || "—"}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMappingModalOpen(true)}
            className="text-xs h-8"
          >
            Review Mapping
          </Button>
        </div>
      )}

      {/* Recurring Reporting Periods Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Assigned Reporting Periods & Submissions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit reports directly against the designated federal period. The year and reporting window are defined by the federal mandate.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total {recurringPeriods.length} Scheduled Periods
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700/60">
              <tr>
                <th className="px-4 py-3">Reporting Period</th>
                <th className="px-4 py-3">Cycle Dates</th>
                <th className="px-4 py-3">Planned Target</th>
                <th className="px-4 py-3">Reported Actual</th>
                <th className="px-4 py-3">Achievement</th>
                <th className="px-4 py-3 min-w-[200px]">Window & Countdown</th>
                <th className="px-4 py-3 text-center">Status / Version</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {recurringPeriods.map((period) => {
                const isReported =
                  period.reported_actual !== null &&
                  period.reported_actual !== undefined &&
                  (period.submission_status === "published" ||
                    period.submission_status === "submitted" ||
                    period.status === "published" ||
                    period.status === "submitted");

                const targetVal = period.planned_target;
                const actualVal = period.reported_actual;
                const achRate =
                  targetVal && targetVal > 0 && actualVal !== null && actualVal !== undefined
                    ? Math.round((Number(actualVal) / Number(targetVal)) * 1000) / 10
                    : null;

                const isOverAchieved = achRate !== null && achRate > 100;
                const revisionNum = (period as any).revision_number || (isReported ? 1 : null);

                return (
                  <tr
                    key={period.period_label}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Period Label */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                          {period.period_label}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 text-xs">
                          {period.name || period.period_label}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Year: {req?.effective_start_date ? new Date(req.effective_start_date).getFullYear() : 2026}
                      </span>
                    </td>

                    {/* Cycle Dates */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {period.start_date && period.end_date ? (
                        <>
                          <span>{period.start_date}</span>
                          <span className="text-slate-400"> ~ </span>
                          <span>{period.end_date}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Standard Schedule</span>
                      )}
                    </td>

                    {/* Planned Target */}
                    <td className="px-4 py-3.5 font-mono">
                      {targetVal !== null && targetVal !== undefined ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {Number(targetVal).toLocaleString()}{" "}
                          <span className="text-[10px] text-slate-500 font-sans">
                            {req?.expected_unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Reported Actual */}
                    <td className="px-4 py-3.5 font-mono">
                      {actualVal !== null && actualVal !== undefined ? (
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {Number(actualVal).toLocaleString()}{" "}
                          <span className="text-[10px] text-slate-500 font-sans">
                            {req?.expected_unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not reported</span>
                      )}
                    </td>

                    {/* Achievement */}
                    <td className="px-4 py-3.5 font-mono">
                      {achRate !== null ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              achRate >= 100
                                ? "text-emerald-600 dark:text-emerald-400"
                                : achRate >= 70
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {achRate}%
                          </span>
                          {isOverAchieved && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1 py-0 font-mono">
                              +{(achRate - 100).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Window & Countdown */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <PeriodCountdownProgressBar
                          startDate={period.start_date}
                          endDate={period.end_date}
                          status={isReported ? "published" : period.status}
                          compact={true}
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {period.is_manually_unlocked ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] px-1.5 py-0 flex items-center gap-1">
                              <Unlock className="h-2.5 w-2.5" />
                              Admin Override
                            </Badge>
                          ) : period.is_locked ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9px] px-1.5 py-0 flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              {period.lock_state === "upcoming" ? "Upcoming" : "Window Locked"}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] px-1.5 py-0 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Window Open
                            </Badge>
                          )}
                          {period.deadline_date && (
                            <span className="text-[10px] text-slate-400">
                              (Due: {period.deadline_date})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status & Version */}
                    <td className="px-4 py-3.5 text-center">
                      {isReported ? (
                        <div className="flex flex-col items-center gap-1">
                          <Badge className="bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Reported
                          </Badge>
                          {revisionNum && (
                            <button
                              type="button"
                              onClick={() =>
                                setVersionHistoryParams({
                                  requirementId: req?.requirement_id || "",
                                  reportingPeriodLabel: period.period_label,
                                  titleHint: `${req?.title} (${period.period_label})`,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                            >
                              <History className="h-2.5 w-2.5" />
                              v{revisionNum}
                            </button>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </td>

                    {/* Actions: Submit Form ONLY on period row! */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isFormReportingActive && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPeriodForm(period)}
                              disabled={period.is_locked}
                              title={
                                period.is_locked
                                  ? period.lock_reason || "Reporting window is locked for this period."
                                  : undefined
                              }
                              className={`h-7 px-2.5 text-xs font-semibold flex items-center gap-1 ${
                                period.is_locked
                                  ? "opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                                  : isReported
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {period.is_locked ? (
                                <>
                                  <Lock className="h-3 w-3" />
                                  Locked
                                </>
                              ) : (
                                <>
                                  <FileText className="h-3 w-3" />
                                  {isReported ? "Update (New Version)" : "Submit Form"}
                                </>
                              )}
                            </Button>
                          )}

                          {isReported && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewReceipt(period)}
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                              title="View Publication Receipt"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {period.is_locked && period.lock_reason && (
                          <span className="text-[10px] text-slate-400 text-right max-w-[180px] truncate" title={period.lock_reason}>
                            {period.lock_reason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {/* 1. Direct Form Reporting Modal (Pre-populated and locked to selected period) */}
      {isFormModalOpen && activePeriodForForm && (
        <RegionalDirectFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setActivePeriodForForm(null);
          }}
          assignment={assignment}
          regionId={regionId}
          selectedPeriod={activePeriodForForm}
        />
      )}

      {/* 2. Version History Modal */}
      {versionHistoryParams && (
        <SubmissionVersionHistoryModal
          isOpen={!!versionHistoryParams}
          onClose={() => setVersionHistoryParams(null)}
          requirementId={versionHistoryParams.requirementId}
          regionId={regionId}
          reportingPeriodLabel={versionHistoryParams.reportingPeriodLabel}
          titleHint={versionHistoryParams.titleHint}
        />
      )}

      {/* 3. Publication Receipt Modal */}
      {isReceiptModalOpen && viewReceiptData && (
        <RegionalPublicationModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setViewReceiptData(null);
          }}
          assignment={assignment}
          regionId={regionId}
          viewReceipt={viewReceiptData}
        />
      )}

      {/* 4. Potential Mapping Modal (for node mapping mode) */}
      {isMappingModalOpen && (
        <RegionalMappingModal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          assignment={assignment}
          regionId={regionId}
        />
      )}
    </div>
  );
}
