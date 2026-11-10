"use client";

import React, { useState } from "react";
import {
  useGetRegionalAssignedRequirementsQuery,
  useGetRegionNationalReportingConfigQuery,
} from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { RegionalMappingModal } from "./RegionalMappingModal";
import { RegionalConfirmationModal } from "./RegionalConfirmationModal";
import { RegionalPublicationModal } from "./RegionalPublicationModal";
import { RegionalDirectFormModal } from "./RegionalDirectFormModal";
import { PeriodCountdownProgressBar } from "./PeriodCountdownProgressBar";
import { SubmissionVersionHistoryModal } from "../national-reporting/SubmissionVersionHistoryModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Send,
  FileCheck,
  FolderTree,
  Scale,
  Sparkles,
  FileText,
  Clock,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
} from "lucide-react";

interface Props {
  regionId: string;
}

export function RegionalAssignedRequirementsTab({ regionId }: Props) {
  const { data: assignments = [], isLoading } =
    useGetRegionalAssignedRequirementsQuery({ regionId });

  const { data: regionConfig } = useGetRegionNationalReportingConfigQuery(
    regionId,
    { skip: !regionId }
  );

  // Form-based reporting is the system default unless explicitly set to node_mapping
  const isFormReportingActive = regionConfig
    ? Boolean(regionConfig.is_form_reporting_effective)
    : true;

  const [mappingAssignment, setMappingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [confirmingAssignment, setConfirmingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [publishingAssignment, setPublishingAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [directFormAssignment, setDirectFormAssignment] =
    useState<NationalReportingAssignment | null>(null);
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string | undefined>(undefined);
  const [viewReceiptData, setViewReceiptData] = useState<any | null>(null);
  const [versionHistoryParams, setVersionHistoryParams] = useState<{
    requirementId: string;
    reportingPeriodLabel?: string;
    titleHint?: string;
  } | null>(null);

  // Expanded state for requirements recurring periods table (default open)
  const [expandedReqs, setExpandedReqs] = useState<Record<string, boolean>>({});

  const toggleExpand = (assignmentId: string) => {
    setExpandedReqs((prev) => ({
      ...prev,
      [assignmentId]: prev[assignmentId] === false ? true : false,
    }));
  };

  const handleOpenForm = (assignment: NationalReportingAssignment, periodLabel?: string) => {
    setSelectedPeriodLabel(periodLabel);
    setDirectFormAssignment(assignment);
  };

  const handleViewReceipt = (
    assignment: NationalReportingAssignment,
    period: ReportingPeriod
  ) => {
    const req = assignment.requirement;
    setViewReceiptData({
      publicationReference: period.publication_reference || "NAT-REF-VERIFIED",
      requirementCode: req?.code,
      reportingPeriod: `${period.period_label} (${period.start_date || ""} ~ ${period.end_date || ""})`,
      standardizedValue: `${period.reported_actual !== null ? period.reported_actual : "—"} ${req?.expected_unit}`,
      achievementPercent: `${period.achievement_rate !== null ? period.achievement_rate : "—"}%`,
      publishedAt: period.published_at || new Date().toISOString(),
      revisionNumber: 1,
    });
    setPublishingAssignment(assignment);
  };

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
              <FileText className={`h-4 w-4 ${isFormReportingActive ? "text-emerald-600" : "text-slate-400"}`} />
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
              ? "Direct KPI form reporting is active. Submit periodic targets, achievements, and narratives with real-time validation and versioning."
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
              <Layers className={`h-4 w-4 ${!isFormReportingActive ? "text-blue-600" : "text-slate-400"}`} />
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

      {/* Assigned Requirements List with Recurring Periods */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            Loading assigned national reporting requirements and period schedules...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            No national reporting requirements assigned to this regional state yet.
          </div>
        ) : (
          assignments.map((assignment) => {
            const req = assignment.requirement;
            const mapping = assignment.activeMapping;
            const node = mapping?.planNode;
            const periods = assignment.recurringPeriods || [];
            const isExpanded = expandedReqs[assignment.assignment_id] !== false; // default expanded

            return (
              <div
                key={assignment.assignment_id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Requirement Header */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {req?.code}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {req?.category?.replace(/_/g, " ")}
                      </Badge>
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        Unit: {req?.expected_unit} ({req?.unit_category})
                      </Badge>
                      {assignment.is_mandatory && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Mandatory Federal Indicator
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {req?.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Annual Cycle: {req?.effective_start_date || "2026-07-01"} ~{" "}
                        {req?.effective_end_date || "2027-06-30"}
                      </span>
                      <span>•</span>
                      <span className="capitalize font-medium">
                        Frequency: {req?.frequency?.replace(/_/g, " ")} ({periods.length} Periods)
                      </span>
                      {!isFormReportingActive && node && (
                        <>
                          <span>•</span>
                          <span>
                            Mapped Node:{" "}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {node.title}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {/* Direct Form Submit Button (when Form active) */}
                    {isFormReportingActive && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenForm(assignment)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 flex items-center gap-1 font-semibold"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Submit KPI Form
                      </Button>
                    )}

                    {/* Regional Node Mapping Button (when Node mapping active) */}
                    {!isFormReportingActive && !mapping && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMappingAssignment(assignment)}
                        className="text-xs h-8 flex items-center gap-1 border-blue-300 text-blue-800 dark:text-blue-300 hover:bg-blue-50"
                      >
                        <FolderTree className="h-3.5 w-3.5 mr-1" />
                        Map Node
                      </Button>
                    )}

                    {/* Expand/Collapse Toggle Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(assignment.assignment_id)}
                      className="text-xs h-8 px-2 text-slate-500 hover:text-slate-900"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Periods
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          View Periods ({periods.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Recurring Periods Schedule Table */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/60 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Reporting Period</th>
                          <th className="px-4 py-2.5 min-w-[200px]">Window & Countdown</th>
                          <th className="px-4 py-2.5">Planned Target</th>
                          <th className="px-4 py-2.5">Reported Actual</th>
                          <th className="px-4 py-2.5">Achievement Rate</th>
                          <th className="px-4 py-2.5">Method Used</th>
                          <th className="px-4 py-2.5">Period Status</th>
                          <th className="px-4 py-2.5 text-right">Period Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {periods.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                              No periods defined for this reporting cycle.
                            </td>
                          </tr>
                        ) : (
                          periods.map((p) => {
                            const isPeriodPublished = p.status === "published";
                            const isReadyToPublish = p.status === "ready_to_publish";
                            const isConfirmed = p.status === "confirmed";
                            const achievementVal = p.achievement_rate !== null && p.achievement_rate !== undefined ? Number(p.achievement_rate) : null;
                            const isOverAchieved = achievementVal !== null && achievementVal > 100;

                            return (
                              <tr
                                key={p.period_index || p.period_label}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                                  {p.period_label}
                                  {p.period_name && p.period_name !== p.period_label && (
                                    <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                                      ({p.period_name})
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 font-mono text-slate-500">
                                  {p.start_date && p.end_date ? (
                                    <div className="space-y-1">
                                      <div className="text-[11px]">
                                        {p.start_date} ~ {p.end_date}
                                      </div>
                                      <PeriodCountdownProgressBar
                                        startDate={p.start_date}
                                        endDate={p.end_date}
                                        status={p.status}
                                      />
                                    </div>
                                  ) : (
                                    <span className="italic text-slate-400">Configured Window</span>
                                  )}
                                </td>

                                <td className="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                                  {p.planned_target !== null && p.planned_target !== undefined
                                    ? `${Number(p.planned_target).toLocaleString()} ${req?.expected_unit}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {p.reported_actual !== null && p.reported_actual !== undefined
                                    ? `${Number(p.reported_actual).toLocaleString()} ${req?.expected_unit}`
                                    : "—"}
                                </td>

                                <td className="px-4 py-3">
                                  {achievementVal !== null ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`font-mono font-bold ${
                                            achievementVal >= 100
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : achievementVal >= 80
                                              ? "text-blue-600 dark:text-blue-400"
                                              : "text-amber-600 dark:text-amber-400"
                                          }`}
                                        >
                                          {achievementVal.toFixed(1)}%
                                        </span>
                                      </div>
                                      {isOverAchieved && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 w-fit">
                                          <TrendingUp className="h-2.5 w-2.5" />
                                          +{(achievementVal - 100).toFixed(1)}% Over
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">—</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {p.reporting_method_used === "form_based" ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                                    >
                                      Direct Form
                                    </Badge>
                                  ) : p.reporting_method_used === "node_mapping" ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200"
                                    >
                                      Node Mapping
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 italic">—</span>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  {isPeriodPublished ? (
                                    <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit text-[10px]">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Published
                                    </Badge>
                                  ) : isReadyToPublish ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 w-fit text-[10px] animate-pulse">
                                      <Sparkles className="h-3 w-3 text-emerald-600" />
                                      Ready to Publish
                                    </Badge>
                                  ) : isConfirmed ? (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                      Confirmed
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-slate-400 border-dashed text-[10px]">
                                      Unreported
                                    </Badge>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Version History Button */}
                                    {(isPeriodPublished || p.reported_actual !== null) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setVersionHistoryParams({
                                            requirementId: req?.requirement_id || "",
                                            reportingPeriodLabel: p.period_label,
                                            titleHint: req?.title,
                                          })
                                        }
                                        className="text-[11px] h-7 px-2 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                        title="View version revisions history"
                                      >
                                        <History className="h-3 w-3 mr-1 text-slate-500" />
                                        History
                                      </Button>
                                    )}

                                    {/* View Published Proof / Receipt */}
                                    {isPeriodPublished && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewReceipt(assignment, p)}
                                        className="text-[11px] h-7 px-2 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50"
                                        title="View official publication receipt"
                                      >
                                        <FileCheck className="h-3 w-3 mr-1 text-emerald-600" />
                                        Proof
                                      </Button>
                                    )}

                                    {/* Direct Form Action for this Period (when Form Active) */}
                                    {isFormReportingActive && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenForm(assignment, p.period_label)}
                                        className={`text-[11px] h-7 px-2 ${
                                          isPeriodPublished
                                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                        }`}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        {isPeriodPublished ? "Edit Version" : "Submit Form"}
                                      </Button>
                                    )}

                                    {/* Node Mapping Actions (when Node Mapping Active) */}
                                    {!isFormReportingActive && isReadyToPublish && (
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          setViewReceiptData(null);
                                          setPublishingAssignment(assignment);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 px-2 font-semibold"
                                      >
                                        <Send className="h-3 w-3 mr-1" />
                                        Publish
                                      </Button>
                                    )}

                                    {!isFormReportingActive && p.status === "potential" && (
                                      <Button
                                        size="sm"
                                        onClick={() => setConfirmingAssignment(assignment)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-2"
                                      >
                                        <CalendarCheck className="h-3 w-3 mr-1" />
                                        Confirm
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {mappingAssignment && (
        <RegionalMappingModal
          isOpen={!!mappingAssignment}
          onClose={() => setMappingAssignment(null)}
          assignment={mappingAssignment}
          regionId={regionId}
        />
      )}

      {confirmingAssignment && (
        <RegionalConfirmationModal
          isOpen={!!confirmingAssignment}
          onClose={() => setConfirmingAssignment(null)}
          assignment={confirmingAssignment}
          regionId={regionId}
        />
      )}

      {publishingAssignment && (
        <RegionalPublicationModal
          isOpen={!!publishingAssignment}
          onClose={() => {
            setPublishingAssignment(null);
            setViewReceiptData(null);
          }}
          assignment={publishingAssignment}
          regionId={regionId}
          viewReceipt={viewReceiptData}
        />
      )}

      {directFormAssignment && (
        <RegionalDirectFormModal
          isOpen={!!directFormAssignment}
          onClose={() => {
            setDirectFormAssignment(null);
            setSelectedPeriodLabel(undefined);
          }}
          assignment={directFormAssignment}
          regionId={regionId}
          initialPeriodLabel={selectedPeriodLabel}
        />
      )}

      {/* Version History Modal */}
      {versionHistoryParams && (
        <SubmissionVersionHistoryModal
          isOpen={!!versionHistoryParams}
          onClose={() => setVersionHistoryParams(null)}
          regionId={regionId}
          requirementId={versionHistoryParams.requirementId}
          reportingPeriodLabel={versionHistoryParams.reportingPeriodLabel}
          titleHint={versionHistoryParams.titleHint}
        />
      )}
    </div>
  );
}
