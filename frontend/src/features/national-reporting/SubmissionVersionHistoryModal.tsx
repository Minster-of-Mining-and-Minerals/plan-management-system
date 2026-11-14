"use client";

import React from "react";
import { useGetSubmissionVersionsQuery } from "@/redux/api/nationalReportingApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  AlertCircle,
  Sparkles,
  User,
} from "lucide-react";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recordId?: string;
  requirementId?: string;
  regionId?: string;
  reportingYear?: number;
  reportingPeriodLabel?: string;
  titleHint?: string;
}

export function SubmissionVersionHistoryModal({
  isOpen,
  onClose,
  recordId,
  requirementId,
  regionId,
  reportingYear,
  reportingPeriodLabel,
  titleHint,
}: Props) {
  const { data, isLoading, isError, refetch } = useGetSubmissionVersionsQuery(
    {
      recordId,
      requirementId,
      regionId,
      reportingYear,
      reportingPeriodLabel,
    },
    { skip: !isOpen || (!recordId && (!requirementId || !regionId)) }
  );

  const versions = data?.versions || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <History className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Submission Version History
                {versions.length > 0 && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {versions.length} {versions.length === 1 ? "Version" : "Versions"}
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological revision trail of all regional report submissions. Past versions are permanently preserved.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loading01 />
            <p className="text-xs text-slate-400 animate-pulse">
              Retrieving version audit trail...
            </p>
          </div>
        ) : isError ? (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Failed to load submission version history.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
            No revision history found for this reporting cycle.
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Context Summary Header */}
            {versions[0] && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {versions[0].requirement?.code} • {versions[0].requirement?.category}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {versions[0].requirement?.title || titleHint}
                  </h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Region: <strong className="text-slate-700 dark:text-slate-300">{versions[0].region?.name}</strong> • Period:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {versions[0].reporting_year} {versions[0].reporting_period_label}
                    </strong>
                  </div>
                </div>

                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs">
                  Standard Unit: {versions[0].standardized_unit || versions[0].requirement?.expected_unit}
                </Badge>
              </div>
            )}

            {/* Version Timeline Cards */}
            <div className="space-y-4">
              {versions.map((ver, idx) => {
                const isCurrent = ver.is_latest;
                const revNum = ver.revision_number;
                const diff = ver.diff;
                const achievementRate = ver.achievement_percent;
                const isOverAchieved = achievementRate !== null && achievementRate !== undefined && achievementRate > 100;

                return (
                  <div
                    key={ver.published_record_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-white dark:bg-slate-950 border-emerald-400 dark:border-emerald-700 shadow-sm ring-1 ring-emerald-400/20"
                        : "bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-90"
                    }`}
                  >
                    {/* Header: Revision badge + Status + Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`font-mono text-xs ${
                            isCurrent
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          Rev #{revNum} ({revNum === 1 ? "Initial Submission" : `Revision ${revNum}`})
                        </Badge>

                        {isCurrent ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                            Current / Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-slate-500">
                            Superseded by Rev #{revNum + 1}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(ver.published_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Submitter & Reference */}
                    <div className="py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800/60 gap-2">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>Submitted by: </span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {ver.publishedByUser?.full_name || "Regional Authority"}
                        </strong>
                        {ver.publishedByUser?.email && (
                          <span className="text-slate-400">({ver.publishedByUser.email})</span>
                        )}
                      </div>

                      <div className="font-mono text-[11px] text-slate-400">
                        Ref: {ver.publication_reference}
                      </div>
                    </div>

                    {/* Numeric Measurements Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Planned Target
                        </span>
                        <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                          {ver.planned_target != null ? ver.planned_target.toLocaleString() : "—"}{" "}
                          <span className="text-xs font-normal text-slate-500">{ver.standardized_unit}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold">
                          Reported Actual
                        </span>
                        <div className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
                          {ver.reported_actual != null ? ver.reported_actual.toLocaleString() : "—"}{" "}
                          <span className="text-xs font-normal text-emerald-600">{ver.standardized_unit}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                          Achievement Rate
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-base font-bold font-mono ${
                              achievementRate && achievementRate >= 100
                                ? "text-emerald-600 dark:text-emerald-400"
                                : achievementRate && achievementRate >= 70
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {achievementRate != null ? `${achievementRate}%` : "—"}
                          </span>

                          {isOverAchieved && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 font-mono">
                              +{Math.round((achievementRate - 100) * 10) / 10}% Over
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Calculated Delta / Changes from Previous Version */}
                    {diff && (
                      <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                        <div className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300 text-[11px] uppercase tracking-wide">
                          <Sparkles className="h-3.5 w-3.5" />
                          Modifications compared to {diff.previous_version}:
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
                          {diff.target_diff !== null && diff.target_diff !== undefined && (
                            <div>
                              <span className="text-blue-600 dark:text-blue-400">Target Δ: </span>
                              <strong>
                                {diff.target_diff > 0 ? `+${diff.target_diff}` : diff.target_diff} {ver.standardized_unit}
                              </strong>
                            </div>
                          )}

                          {diff.actual_diff !== null && diff.actual_diff !== undefined && (
                            <div>
                              <span className="text-blue-600 dark:text-blue-400">Actual Δ: </span>
                              <strong
                                className={
                                  diff.actual_diff > 0
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-amber-700 dark:text-amber-300"
                                }
                              >
                                {diff.actual_diff > 0 ? `+${diff.actual_diff}` : diff.actual_diff} {ver.standardized_unit}
                              </strong>
                            </div>
                          )}

                          {diff.achievement_diff !== null && diff.achievement_diff !== undefined && (
                            <div>
                              <span className="text-blue-600 dark:text-blue-400">Rate Δ: </span>
                              <strong
                                className={
                                  diff.achievement_diff > 0
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-amber-700 dark:text-amber-300"
                                }
                              >
                                {diff.achievement_diff > 0 ? `+${diff.achievement_diff}%` : `${diff.achievement_diff}%`}
                              </strong>
                            </div>
                          )}
                        </div>

                        {diff.narrative_changed && (
                          <div className="text-[11px] text-blue-700 dark:text-blue-300 italic pt-0.5">
                            • Justification narrative was revised in this version.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Narrative & Justification */}
                    {ver.narrative && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Report Narrative & Justification / የሪፖርት ማብራሪያ:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-900/60 p-2.5 rounded-lg whitespace-pre-wrap font-sans">
                          {ver.narrative}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Close History
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

