"use client";

import React, { useState } from "react";
import { useGetRegionalPublicationHistoryQuery } from "@/redux/api/nationalReportingApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileCheck,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { NationalPublishedRecord } from "@/redux/types/nationalReporting";

interface Props {
  regionId: string;
}

export function RegionalPublicationHistoryTab({ regionId }: Props) {
  const { data: history = [], isLoading } =
    useGetRegionalPublicationHistoryQuery({ regionId });

  const [selectedRecord, setSelectedRecord] =
    useState<NationalPublishedRecord | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Reference Code</th>
                <th className="px-5 py-3.5">National Indicator</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Local Value</th>
                <th className="px-5 py-3.5">Standardized (National)</th>
                <th className="px-5 py-3.5">Achievement</th>
                <th className="px-5 py-3.5">Published Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    Loading regional publication history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    No validated reports have been published to the National Framework yet.
                  </td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr
                    key={rec.published_record_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {rec.publication_reference}
                      <div className="text-[10px] text-slate-400 font-sans">
                        Rev #{rec.revision_number}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {rec.requirement?.title}
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        {rec.requirement?.code}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                      {rec.reporting_year} {rec.reporting_period_label}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {rec.reported_actual != null ? rec.reported_actual.toLocaleString() : "—"}{" "}
                      <span className="text-xs text-slate-400 font-sans">{rec.local_unit}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {rec.standardized_actual != null
                        ? rec.standardized_actual.toLocaleString()
                        : "—"}{" "}
                      <span className="text-xs font-sans text-emerald-600 font-normal">
                        {rec.standardized_unit}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {rec.achievement_percent !== null && rec.achievement_percent !== undefined ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs"
                        >
                          {rec.achievement_percent}%
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {new Date(rec.published_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecord(rec)}
                        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Receipt Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="w-full max-w-3xl sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              National Reporting Publication Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-2">
              <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-5 rounded-xl shadow-inner">
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                  Transmission Certificate
                </span>
                <h3 className="text-lg font-bold font-mono tracking-tight mt-1">
                  {selectedRecord.publication_reference}
                </h3>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-emerald-100 border-t border-emerald-800/80 pt-3">
                  <div>
                    <span className="text-emerald-300">Period:</span>{" "}
                    {selectedRecord.reporting_year} {selectedRecord.reporting_period_label}
                  </div>
                  <div>
                    <span className="text-emerald-300">Timestamp:</span>{" "}
                    {new Date(selectedRecord.published_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-emerald-300">Standardized:</span>{" "}
                    <span className="font-bold text-white">
                      {selectedRecord.standardized_actual} {selectedRecord.standardized_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-300">Local Reported:</span>{" "}
                    {selectedRecord.reported_actual} {selectedRecord.local_unit}
                  </div>
                </div>
              </div>

              {selectedRecord.narrative && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-500 uppercase">
                    Transmitted Narrative
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedRecord.narrative}
                  </p>
                </div>
              )}

              {selectedRecord.clarification_notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Federal Clarification Request
                  </span>
                  <p className="text-amber-900 dark:text-amber-200">
                    {selectedRecord.clarification_notes}
                  </p>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

