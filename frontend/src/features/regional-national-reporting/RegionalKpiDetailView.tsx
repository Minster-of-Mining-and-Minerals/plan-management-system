"use client";

import React, { useState, useMemo } from "react";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { RegionalDirectFormModal } from "./RegionalDirectFormModal";
import { RegionalCascadedPeriodsSection } from "./RegionalCascadedPeriodsSection";
import { PeriodCountdownProgressBar } from "./PeriodCountdownProgressBar";
import { SubmissionVersionHistoryModal } from "../national-reporting/SubmissionVersionHistoryModal";
import { RegionalPublicationModal } from "./RegionalPublicationModal";
import { RegionalMappingModal } from "./RegionalMappingModal";
import { RegionalConfirmationModal } from "./RegionalConfirmationModal";
import { RegionalDelegateNationalKpiModal } from "./RegionalDelegateNationalKpiModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
  Building2,
  UserCheck,
  Users,
  Share2,
} from "lucide-react";
import { generateReportingPeriods } from "@/utils/nationalReportingPeriodUtils";
import { useGetPeriodConfigsQuery } from "@/redux/api/nationalReportingApi";

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

  const { data: periodConfigs } = useGetPeriodConfigsQuery();

  const divisionCustomNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!periodConfigs) return map;
    const freq = (
      assignment?.frequency_override ||
      assignment?.requirement?.frequency ||
      "monthly"
    ).toLowerCase();
    const matchingConfig = periodConfigs.find((c) => c.frequency === freq);
    if (matchingConfig?.divisions) {
      matchingConfig.divisions.forEach((d) => {
        if (d.custom_name) {
          map[d.division_key] = d.custom_name;
          map[d.default_name] = d.custom_name;
          map[String(d.index)] = d.custom_name;
        }
      });
    }
    return map;
  }, [periodConfigs, assignment]);

  // Selected period for direct form modal
  const [activePeriodForForm, setActivePeriodForForm] = useState<ReportingPeriod | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "assignments">("overview");
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

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
    const startDt = assignment.effective_start_date || req?.effective_start_date || "2026-07-08";
    const endDt = assignment.effective_end_date || req?.effective_end_date || "2027-07-07";
    const calSys = (assignment as any).effective_calendar_system || assignment.calendar_system_override || req?.calendar_system || "EC";
    if (startDt && endDt) {
      return generateReportingPeriods(
        startDt,
        endDt,
        assignment.frequency_override || req?.frequency || "quarterly",
        calSys
      );
    }
    return [
      { period_index: 1, period_label: "Q1", name: "Quarter 1", start_date: "", end_date: "" },
      { period_index: 2, period_label: "Q2", name: "Quarter 2", start_date: "", end_date: "" },
      { period_index: 3, period_label: "Q3", name: "Quarter 3", start_date: "", end_date: "" },
      { period_index: 4, period_label: "Q4", name: "Quarter 4", start_date: "", end_date: "" },
    ];
  }, [assignment, req]);

  // Analytics Computations across recurring periods
  const analytics = useMemo(() => {
    const totalPeriods = recurringPeriods.length;
    let reportedCount = 0;
    let totalTarget = 0;
    let totalActual = 0;
    let hasTarget = false;

    const presetAnnualTarget =
      assignment.annual_target != null && !isNaN(Number(assignment.annual_target))
        ? Number(assignment.annual_target)
        : null;

    if (presetAnnualTarget != null) {
      totalTarget = presetAnnualTarget;
      hasTarget = true;
    }

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

      if (presetAnnualTarget == null && p.planned_target !== null && p.planned_target !== undefined) {
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
      presetAnnualTarget,
      totalTarget: Math.round(totalTarget * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      overallAchievementPercent,
      hasTarget,
      currentPeriod,
    };
  }, [recurringPeriods, assignment.annual_target]);

  // Active window countdown notification logic for the regional officer
  const periodNotificationInfo = useMemo(() => {
    const ethiopiaTodayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const toUtcNoonMs = (d: string) => new Date(`${String(d).slice(0, 10)}T12:00:00Z`).getTime();
    const now = toUtcNoonMs(ethiopiaTodayStr);
    const msPerDay = 1000 * 60 * 60 * 24;

    // 1. Check if any period is currently in grace period
    const gracePeriod = recurringPeriods.find(
      (p) => (p.lock_state === "grace_period" || p.is_in_grace_period) && !p.reported_actual
    );
    if (gracePeriod) {
      const deadline = gracePeriod.phase_end_date || gracePeriod.deadline_date || gracePeriod.end_date;
      const deadlineTime = deadline ? toUtcNoonMs(deadline) : now;
      const daysLeft = Math.max(0, Math.round((deadlineTime - now) / msPerDay));
      return {
        type: "grace_period" as const,
        period: gracePeriod,
        daysLeft,
        deadline,
        periodLabel: gracePeriod.period_label,
        customName: divisionCustomNameMap[gracePeriod.period_label] || gracePeriod.name || gracePeriod.period_label,
        openDaysBefore: (assignment as any).effective_phase_config?.open_days_before ?? 5,
        closeDaysAfter: (assignment as any).effective_phase_config?.close_days_after ?? 5,
        isCustomTimeline: assignment.reporting_phase_override?.is_custom === true,
      };
    }

    // 2. Check if any period is actively open for reporting
    const openPeriod = recurringPeriods.find(
      (p) =>
        (!p.is_locked || p.lock_state === "reporting_open" || p.is_manually_unlocked) &&
        p.lock_state !== "closed_deadline_passed" &&
        !p.reported_actual
    );
    if (openPeriod) {
      const standardEnd = openPeriod.end_date;
      const deadline = openPeriod.phase_end_date || openPeriod.deadline_date || openPeriod.end_date;
      const deadlineTime = deadline ? toUtcNoonMs(deadline) : now;
      const daysLeft = Math.max(0, Math.round((deadlineTime - now) / msPerDay));
      const daysToStandardEnd = standardEnd
        ? Math.max(0, Math.round((toUtcNoonMs(standardEnd) - now) / msPerDay))
        : null;

      return {
        type: "reporting_open" as const,
        period: openPeriod,
        daysLeft,
        daysToStandardEnd,
        standardEnd,
        deadline,
        periodLabel: openPeriod.period_label,
        customName: divisionCustomNameMap[openPeriod.period_label] || openPeriod.name || openPeriod.period_label,
        openDaysBefore: (assignment as any).effective_phase_config?.open_days_before ?? 5,
        closeDaysAfter: (assignment as any).effective_phase_config?.close_days_after ?? 5,
        isCustomTimeline: assignment.reporting_phase_override?.is_custom === true,
      };
    }

    // 3. Check for the nearest upcoming period
    const upcomingPeriod = recurringPeriods.find(
      (p) => p.lock_state === "upcoming_phase" || p.lock_state === "upcoming"
    );
    if (upcomingPeriod) {
      const openDate = upcomingPeriod.phase_start_date || upcomingPeriod.start_date;
      const openTime = openDate ? toUtcNoonMs(openDate) : now;
      const daysUntilOpen = Math.max(0, Math.round((openTime - now) / msPerDay));

      return {
        type: "upcoming_phase" as const,
        period: upcomingPeriod,
        daysUntilOpen,
        openDate,
        periodLabel: upcomingPeriod.period_label,
        customName: divisionCustomNameMap[upcomingPeriod.period_label] || upcomingPeriod.name || upcomingPeriod.period_label,
        openDaysBefore: (assignment as any).effective_phase_config?.open_days_before ?? 5,
        closeDaysAfter: (assignment as any).effective_phase_config?.close_days_after ?? 5,
        isCustomTimeline: assignment.reporting_phase_override?.is_custom === true,
      };
    }

    return null;
  }, [recurringPeriods, divisionCustomNameMap, assignment]);

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
      revisionNumber: period.revision_number || (period as any).revision_number || 1,
      submittedBy: period.publishedByUser || null,
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

        {/* Analytics Card 2: Federal Preset Annual Target */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Federal Preset Annual Target</span>
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 flex items-baseline gap-2">
            <span>{analytics.hasTarget ? analytics.totalTarget.toLocaleString() : "—"}</span>
            {analytics.presetAnnualTarget != null && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-normal border-emerald-300">
                Preset
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-500 block truncate font-mono">
            {req?.expected_unit} assigned annual target for this region
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

      {/* View Tabs: Reporting Window & Cascaded Periods vs Internal Delegation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "overview" | "assignments")}
        className="w-full space-y-4"
      >
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-4 w-4" />
            Reporting Window &amp; Cascaded Periods
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-1.5 text-xs">
            <Share2 className="h-4 w-4" />
            Internal Bureau Delegation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Real-time Reporting Window Countdown Notification Banner */}
          {periodNotificationInfo && (
            <div
              className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                periodNotificationInfo.type === "grace_period"
                  ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-700/60"
                  : periodNotificationInfo.type === "reporting_open"
                  ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-700/60"
                  : "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-blue-200 dark:border-blue-800/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    periodNotificationInfo.type === "grace_period"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : periodNotificationInfo.type === "reporting_open"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  {periodNotificationInfo.type === "grace_period" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : periodNotificationInfo.type === "reporting_open" ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Calendar className="h-5 w-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {periodNotificationInfo.type === "grace_period"
                        ? `Grace Submission Active: ${periodNotificationInfo.periodLabel} (${periodNotificationInfo.customName})`
                        : periodNotificationInfo.type === "reporting_open"
                        ? `Reporting Window Active: ${periodNotificationInfo.periodLabel} (${periodNotificationInfo.customName})`
                        : `Upcoming Reporting Window: ${periodNotificationInfo.periodLabel} (${periodNotificationInfo.customName})`}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        periodNotificationInfo.type === "grace_period"
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold"
                          : periodNotificationInfo.type === "reporting_open"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {periodNotificationInfo.type === "grace_period"
                        ? `${periodNotificationInfo.daysLeft}d left to lock`
                        : periodNotificationInfo.type === "reporting_open"
                        ? `${periodNotificationInfo.daysLeft}d left in window`
                        : `Opens in ${periodNotificationInfo.daysUntilOpen}d`}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {periodNotificationInfo.type === "grace_period" ? (
                      <>
                        Standard operating period has passed. The grace submission window is active with{" "}
                        <strong className="text-amber-800 dark:text-amber-300 font-bold">
                          {periodNotificationInfo.daysLeft} day(s) remaining
                        </strong>{" "}
                        before the window permanently locks on{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{periodNotificationInfo.deadline}</strong>.
                      </>
                    ) : periodNotificationInfo.type === "reporting_open" ? (
                      <>
                        The reporting window is active. You have{" "}
                        <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
                          {periodNotificationInfo.daysLeft} day(s) remaining
                        </strong>{" "}
                        to submit your regional achievement. (Final grace closing date:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{periodNotificationInfo.deadline}</strong>).
                      </>
                    ) : (
                      <>
                        The operating cycle is in progress. Reporting submission opens in{" "}
                        <strong className="text-blue-800 dark:text-blue-300 font-bold">
                          {periodNotificationInfo.daysUntilOpen} day(s)
                        </strong>{" "}
                        on{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{periodNotificationInfo.openDate}</strong>.
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500 font-mono">
                    <span>
                      Timeline:{" "}
                      {periodNotificationInfo.isCustomTimeline ? "Custom Assignment Override" : "Standard Federal Matrix"} (
                      {periodNotificationInfo.openDaysBefore}d early / {periodNotificationInfo.closeDaysAfter}d grace)
                    </span>
                  </div>
                </div>
              </div>

              {(periodNotificationInfo.type === "reporting_open" || periodNotificationInfo.type === "grace_period") && (
                <Button
                  size="sm"
                  onClick={() => handleOpenPeriodForm(periodNotificationInfo.period)}
                  className={`shrink-0 text-xs font-semibold self-start sm:self-center ${
                    periodNotificationInfo.type === "grace_period"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Submit {periodNotificationInfo.periodLabel} Report
                </Button>
              )}
            </div>
          )}

          {/* Cascaded Card-Based Period Classification & Reporting */}
          <RegionalCascadedPeriodsSection
            assignment={assignment}
            req={req}
            recurringPeriods={recurringPeriods}
            divisionCustomNameMap={divisionCustomNameMap}
            isFormReportingActive={isFormReportingActive}
            onOpenPeriodForm={handleOpenPeriodForm}
            onViewReceipt={handleViewReceipt}
            onViewHistory={(period) =>
              setVersionHistoryParams({
                requirementId: assignment.requirement_id,
                reportingPeriodLabel: period.period_label,
                titleHint: req?.title,
              })
            }
          />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-emerald-600" />
                  Internal Regional Bureau Delegation
                </CardTitle>
                <CardDescription>
                  Delegate responsibility for gathering evidence and submitting progress for this national KPI to an internal directorate or officer
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-1.5 self-start sm:self-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setIsDelegationModalOpen(true)}
              >
                <Share2 className="h-4 w-4" />
                {assignment.delegated_user_id || assignment.regional_structure_id
                  ? "Reassign / Update Delegation"
                  : "Delegate Indicator"}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {!assignment.delegated_user_id && !assignment.regional_structure_id ? (
                <div className="py-8 text-center space-y-3">
                  <div className="h-10 w-10 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Not Delegated Internally
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      This indicator is currently managed at the regional bureau level. You can assign it to a specific regional directorate or reporting officer.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsDelegationModalOpen(true)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Share2 className="h-4 w-4" />
                    Assign to Department / Person
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        Assigned Regional Department
                      </span>
                      <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {assignment.regionalStructure?.name || "Entire Regional Bureau"}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {assignment.regionalStructure?.code ? `Code: ${assignment.regionalStructure.code}` : "All departments eligible"}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Assigned Reporting Officer
                      </span>
                      <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {assignment.delegatedUser?.full_name || "Any Officer in Department"}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {assignment.delegatedUser?.email || "Open submission within department"}
                      </span>
                    </div>
                  </div>

                  {assignment.delegation_notes && (
                    <div className="p-4 rounded-xl border bg-white dark:bg-slate-950 space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Delegation Instructions &amp; Methodology Notes
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {assignment.delegation_notes}
                      </p>
                    </div>
                  )}

                  {assignment.delegated_at && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Delegated on: {new Date(assignment.delegated_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Internal Delegation Modal */}
      {isDelegationModalOpen && (
        <RegionalDelegateNationalKpiModal
          isOpen={isDelegationModalOpen}
          onClose={() => setIsDelegationModalOpen(false)}
          assignment={assignment}
          regionId={regionId}
        />
      )}

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
