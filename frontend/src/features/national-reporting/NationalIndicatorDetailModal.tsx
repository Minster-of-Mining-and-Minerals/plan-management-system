"use client";

import React from "react";
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
  Scale,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AssignedRegionInfo {
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

interface NationalIndicatorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: {
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
  } | null;
  reportingYear?: number;
  periodLabel?: string;
}

export function NationalIndicatorDetailModal({
  isOpen,
  onClose,
  indicator,
  reportingYear,
  periodLabel,
}: NationalIndicatorDetailModalProps) {
  const router = useRouter();

  if (!indicator) return null;

  const actual = indicator.nationalTotalActual || 0;
  const target = indicator.nationalTotalTarget || 0;
  const achievementRate = indicator.achievementRate;
  const isOverAchieved = achievementRate !== null && achievementRate !== undefined && achievementRate > 100;
  const assignedList: AssignedRegionInfo[] = indicator.assignedRegions || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                  {indicator.code}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {indicator.category?.replace(/_/g, " ")}
                </Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {indicator.frequency}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {indicator.title}
              </DialogTitle>
              {indicator.description && (
                <p className="text-xs text-slate-500 max-w-2xl">
                  {indicator.description}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-slate-400 block">
                {reportingYear || new Date().getFullYear()} {periodLabel && periodLabel !== "all" ? periodLabel : "Annual"}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Unit: {indicator.expectedUnit}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Executive Aggregate Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-2">
          {/* Target */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              National Planned Target
            </span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
              {indicator.nationalTotalTarget != null
                ? Number(indicator.nationalTotalTarget).toLocaleString()
                : "—"}{" "}
              <span className="text-xs font-sans font-normal text-slate-500">
                {indicator.expectedUnit}
              </span>
            </div>
          </div>

          {/* Actual */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold block">
              National Reported Actual
            </span>
            <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-1">
              {indicator.nationalTotalActual != null
                ? Number(indicator.nationalTotalActual).toLocaleString()
                : "—"}{" "}
              <span className="text-xs font-sans font-normal text-slate-500">
                {indicator.expectedUnit}
              </span>
            </div>
          </div>

          {/* Fulfillment Rate */}
          <div className="p-3.5 bg-card border rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              National Fulfillment Rate
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {achievementRate != null ? `${achievementRate}%` : "—"}
              </span>
              {isOverAchieved && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 font-mono">
                  +{(achievementRate! - 100).toFixed(1)}% Over
                </Badge>
              )}
            </div>
          </div>

          {/* Regional Submissions Completeness */}
          <div className="p-3.5 bg-card border rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Regional Completeness
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {indicator.dataCompletenessPercent}%
              </span>
              <span className="text-xs font-mono text-slate-500">
                {indicator.submittedRegionsCount} / {indicator.assignedRegionsCount} regions
              </span>
            </div>
          </div>
        </div>

        {/* Data Completeness Banner */}
        {!indicator.isCompleteData ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Partial National Rollup:</strong> Only {indicator.submittedRegionsCount} of {indicator.assignedRegionsCount} assigned regional states have officially submitted reports for this cycle ({indicator.dataCompletenessPercent}% complete).
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              <strong>100% Complete National Coverage:</strong> All {indicator.assignedRegionsCount} assigned regional states have submitted verified data.
            </span>
          </div>
        )}

        {/* Where Assigned & Regional Breakdown Table */}
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-emerald-600" />
              Regional Assignment Distribution & Submissions ({assignedList.length} States)
            </h4>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-slate-500 text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2.5">Regional State</th>
                    <th className="px-3.5 py-2.5">Method</th>
                    <th className="px-3.5 py-2.5 text-right">Planned Target</th>
                    <th className="px-3.5 py-2.5 text-right">Reported Actual</th>
                    <th className="px-3.5 py-2.5 text-right">Achievement</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assignedList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No regional assignments recorded for this indicator.
                      </td>
                    </tr>
                  ) : (
                    assignedList.map((asgn) => {
                      const hasSubmitted =
                        asgn.status === "published" || asgn.status === "clarification_requested";
                      const isOver =
                        asgn.achievementPercent != null && asgn.achievementPercent > 100;

                      return (
                        <tr
                          key={asgn.assignmentId || asgn.regionId}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          {/* Region Name & Code */}
                          <td className="px-3.5 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{asgn.regionName}</span>
                              {asgn.regionCode && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  [{asgn.regionCode}]
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-sans block">
                              {asgn.isMandatory ? "Mandatory mandate" : "Optional reporting"}
                            </span>
                          </td>

                          {/* Reporting Method */}
                          <td className="px-3.5 py-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize font-mono bg-slate-50 dark:bg-slate-900"
                            >
                              {asgn.submissionMethod?.replace(/_/g, " ") || "form based"}
                            </Badge>
                          </td>

                          {/* Planned Target */}
                          <td className="px-3.5 py-3 text-right font-mono">
                            {asgn.plannedTarget != null ? (
                              <span>
                                {Number(asgn.plannedTarget).toLocaleString()}{" "}
                                <span className="text-[10px] text-slate-400">
                                  {asgn.localUnit || indicator.expectedUnit}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Reported Actual */}
                          <td className="px-3.5 py-3 text-right font-mono">
                            {asgn.reportedActual != null ? (
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {Number(asgn.reportedActual).toLocaleString()}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {asgn.localUnit || indicator.expectedUnit}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending</span>
                            )}
                          </td>

                          {/* Achievement */}
                          <td className="px-3.5 py-3 text-right font-mono">
                            {asgn.achievementPercent != null ? (
                              <div className="flex items-center justify-end gap-1">
                                <span
                                  className={`font-bold ${
                                    asgn.achievementPercent >= 100
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : asgn.achievementPercent >= 70
                                      ? "text-blue-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {asgn.achievementPercent}%
                                </span>
                                {isOver && (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[8px] px-1 py-0">
                                    +{(asgn.achievementPercent - 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Submission Status */}
                          <td className="px-3.5 py-3 text-center">
                            {hasSubmitted ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] flex items-center justify-center gap-1 mx-auto w-fit">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] mx-auto w-fit">
                                Pending
                              </Badge>
                            )}
                            {asgn.publicationReference && (
                              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                {asgn.publicationReference}
                              </span>
                            )}
                          </td>

                          {/* Direct Link Action */}
                          <td className="px-3.5 py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                onClose();
                                router.push(`/regions/${asgn.regionId}/national-reporting?tab=assigned`);
                              }}
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-auto"
                              title={`Open regional reporting workspace for ${asgn.regionName}`}
                            >
                              <span>View Region</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
