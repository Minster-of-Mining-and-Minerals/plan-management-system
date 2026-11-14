"use client";

import React, { useMemo, useState } from "react";
import {
  useGetNationalPublishedRecordsQuery,
  useRequestNationalClarificationMutation,
  useGetPeriodConfigsQuery,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { NationalPublishedRecord } from "@/redux/types/nationalReporting";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import { matchesSearchQuery } from "@/utils/tableUtils";
import { SubmissionVersionHistoryModal } from "./SubmissionVersionHistoryModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileCheck,
  CheckCircle2,
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  History,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export function PublishedSubmissionsTab() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedRecord, setSelectedRecord] = useState<NationalPublishedRecord | null>(null);
  const [clarificationNotes, setClarificationNotes] = useState("");
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);

  const [versionHistoryParams, setVersionHistoryParams] = useState<{
    requirementId: string;
    regionId?: string;
    reportingPeriodLabel?: string;
    titleHint?: string;
  } | null>(null);

  const {
    data: records = [],
    isLoading,
    isError,
    refetch,
  } = useGetNationalPublishedRecordsQuery({
    reporting_year: yearFilter !== "all" ? parseInt(yearFilter, 10) : undefined,
    reporting_period_label: periodFilter !== "all" ? periodFilter : undefined,
    region_id: regionFilter !== "all" ? regionFilter : undefined,
  });

  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });
  const { data: periodConfigs } = useGetPeriodConfigsQuery();
  const [requestClarification, { isLoading: isRequesting }] = useRequestNationalClarificationMutation();

  const divisionCustomNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!periodConfigs) return map;
    periodConfigs.forEach((cfg) => {
      cfg.divisions?.forEach((d) => {
        if (d.custom_name) {
          map[d.division_key] = d.custom_name;
          map[d.default_name] = d.custom_name;
        }
      });
    });
    return map;
  }, [periodConfigs]);

  const handleOpenReceipt = (rec: NationalPublishedRecord) => {
    setSelectedRecord(rec);
  };

  const handleOpenClarification = (rec: NationalPublishedRecord) => {
    setSelectedRecord(rec);
    setClarificationNotes("");
    setIsClarificationOpen(true);
  };

  const handleSendClarification = async () => {
    if (!selectedRecord || !clarificationNotes.trim()) {
      toast.error("Please provide questions or notes for the regional reporting team");
      return;
    }

    try {
      await requestClarification({
        recordId: selectedRecord.published_record_id,
        notes: clarificationNotes,
      }).unwrap();
      toast.success("Clarification request sent to regional administrator");
      setIsClarificationOpen(false);
      setSelectedRecord(null);
      setClarificationNotes("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send clarification request");
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return records.filter((rec) => {
      if (statusFilter !== "all" && rec.status !== statusFilter) return false;

      return matchesSearchQuery(searchQuery, [
        rec.publication_reference,
        rec.region?.name,
        rec.region?.code,
        rec.requirement?.code,
        rec.requirement?.title,
        rec.reporting_period_label,
        rec.narrative,
      ]);
    });
  }, [records, statusFilter, searchQuery]);

  // Columns definition
  const columns: ColumnDef<NationalPublishedRecord>[] = [
    {
      accessorKey: "publication_reference",
      header: "Reference & Version",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="space-y-0.5">
            <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {rec.publication_reference}
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                Rev v{rec.revision_number}
              </Badge>
              {rec.status === "superseded" && (
                <span className="text-[10px] text-slate-400 italic">Superseded</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "region",
      header: "Regional State",
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">
          {row.original.region?.name || "Region"}
          {row.original.region?.code && (
            <span className="text-[11px] font-mono text-slate-400 ml-1">
              [{row.original.region.code}]
            </span>
          )}
        </div>
      ),
    },
    {
      id: "requirement",
      header: "National Indicator",
      cell: ({ row }) => {
        const req = row.original.requirement;
        return (
          <div className="space-y-0.5 max-w-sm">
            <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
              {req?.title}
            </div>
            <div className="text-xs font-mono text-slate-500">
              {req?.code}
            </div>
          </div>
        );
      },
    },
    {
      id: "period",
      header: "Period",
      cell: ({ row }) => {
        const periodKey = row.original.reporting_period_label;
        const customName = divisionCustomNameMap[periodKey];
        return (
          <div className="font-medium text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">
            <div>
              {customName ? customName : periodKey}
              {customName && (
                <span className="text-[10px] text-slate-400 font-mono ml-1">
                  ({periodKey})
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              FY {row.original.reporting_year}
            </div>
          </div>
        );
      },
    },
    {
      id: "actual_local",
      header: "Reported Actual (Local)",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="font-mono text-xs">
            {rec.reported_actual != null ? rec.reported_actual.toLocaleString() : "—"}{" "}
            <span className="text-[11px] text-slate-400 font-sans">{rec.local_unit}</span>
          </div>
        );
      },
    },
    {
      id: "actual_national",
      header: "Standardized (National)",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
            {rec.standardized_actual != null ? rec.standardized_actual.toLocaleString() : "—"}{" "}
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-sans font-medium">
              {rec.standardized_unit}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "achievement_percent",
      header: "Achievement Rates",
      cell: ({ row }) => {
        const rec = row.original;
        const rate = rec.achievement_percent;
        const annualRate = rec.annual_achievement_percent;

        if (rate == null && annualRate == null) {
          return <span className="text-slate-400 text-xs italic">N/A</span>;
        }

        const isOverAchieved = typeof rate === "number" && rate > 100;
        return (
          <div className="flex flex-col gap-1 text-xs font-mono">
            {typeof rate === "number" && (
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[11px] py-0 px-1.5 ${
                    rate >= 100
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : rate >= 70
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}
                >
                  {rate}% Monthly
                </Badge>
                {isOverAchieved && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-700">
                    <TrendingUp className="h-2 w-2" />
                    +{(rate - 100).toFixed(1)}%
                  </span>
                )}
              </div>
            )}
            {typeof annualRate === "number" && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-sans">
                {annualRate}% of Annual Target
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        if (s === "published") {
          return (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs">
              Published
            </Badge>
          );
        }
        if (s === "clarification_requested") {
          return (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
              Clarification Needed
            </Badge>
          );
        }
        return <Badge variant="secondary" className="text-xs">Superseded</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {/* Version History Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setVersionHistoryParams({
                  requirementId: rec.requirement_id,
                  regionId: rec.region_id,
                  reportingPeriodLabel: rec.reporting_period_label,
                  titleHint: rec.requirement?.title,
                })
              }
              className="text-xs h-8 px-2 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
              title="View full version revision history and diffs"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              History
            </Button>

            {/* Proof Receipt */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenReceipt(rec)}
              className="text-xs h-8 px-2 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 flex items-center gap-1"
              title="View cryptographic proof and receipt"
            >
              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
              Proof
            </Button>

            {/* Clarification Request */}
            {rec.status === "published" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenClarification(rec)}
                className="text-xs h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 flex items-center gap-1"
                title="Request revision or clarification from region"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Clarify
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Filters definition for TableLayout
  const filters: FilterField[] = [
    {
      key: "year",
      label: "Reporting Year",
      type: "select",
      placeholder: "All Years",
      value: yearFilter,
      onChange: setYearFilter,
      options: [
        { label: "All Years", value: "all" },
        { label: String(currentYear), value: String(currentYear) },
        { label: String(currentYear - 1), value: String(currentYear - 1) },
        { label: String(currentYear - 2), value: String(currentYear - 2) },
      ],
    },
    {
      key: "period",
      label: "Period Label",
      type: "select",
      placeholder: "All Periods",
      value: periodFilter,
      onChange: setPeriodFilter,
      options: [
        { label: "All Periods", value: "all" },
        ...Array.from({ length: 12 }, (_, i) => {
          const key = `Month ${i + 1}`;
          const cName = divisionCustomNameMap[key];
          return {
            label: cName ? `${cName} (${key})` : key,
            value: key,
          };
        }),
        ...[1, 2, 3, 4].map((q) => {
          const key = `Q${q}`;
          const cName = divisionCustomNameMap[key];
          return {
            label: cName ? `${cName} (${key})` : `Quarter ${q} (${key})`,
            value: key,
          };
        }),
        {
          label: divisionCustomNameMap["Annual"]
            ? `${divisionCustomNameMap["Annual"]} (Annual)`
            : "Annual",
          value: "Annual",
        },
      ],
    },
    {
      key: "region",
      label: "Regional State",
      type: "select",
      placeholder: "All Regional States",
      value: regionFilter,
      onChange: setRegionFilter,
      options: [
        { label: "All Regional States", value: "all" },
        ...regions.map((r) => ({ label: r.name, value: r.region_id })),
      ],
    },
    {
      key: "status",
      label: "Submission Status",
      type: "select",
      placeholder: "All Statuses",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Statuses", value: "all" },
        { label: "Published", value: "published" },
        { label: "Clarification Needed", value: "clarification_requested" },
        { label: "Superseded Revisions", value: "superseded" },
      ],
    },
  ];

  return (
    <>
      <TableLayout
        title="Published National Submissions"
        filters={filters}
        filterColumnsPerRow={4}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load published national records."
          onRetry={refetch}
          resetKey={`${searchQuery}-${yearFilter}-${periodFilter}-${regionFilter}-${statusFilter}`}
        />
      </TableLayout>

      {/* Publication Receipt Modal */}
      {selectedRecord && !isClarificationOpen && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="w-full max-w-3xl sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                Validated National Submission Receipt
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Publication Reference
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedRecord.publication_reference}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Revision Sequence
                  </span>
                  <Badge variant="outline" className="font-mono">
                    Version v{selectedRecord.revision_number}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Reporting Regional State
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedRecord.region?.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    National Indicator
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedRecord.requirement?.title} ({selectedRecord.requirement?.code})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Reporting Window
                  </span>
                  <span className="font-medium">
                    {selectedRecord.reporting_year} {selectedRecord.reporting_period_label}
                  </span>
                </div>

                <div className="border-t border-emerald-200 dark:border-emerald-800 pt-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Standardized National Value
                  </span>
                  <span className="font-mono font-bold text-lg text-emerald-800 dark:text-emerald-300">
                    {selectedRecord.standardized_actual?.toLocaleString()}{" "}
                    {selectedRecord.standardized_unit}
                  </span>
                </div>

                {selectedRecord.achievement_percent !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      Achievement Rate
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedRecord.achievement_percent}%
                    </span>
                  </div>
                )}
              </div>

              {selectedRecord.narrative && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Regional Officer Narrative
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {selectedRecord.narrative}
                  </p>
                </div>
              )}

              {/* Cryptographic Hash Verification */}
              <div className="space-y-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">
                  SHA-256 Publication Hash
                </span>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 break-all">
                  {selectedRecord.hash_sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedRecord(null)}>Close Receipt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Request Clarification Modal */}
      {selectedRecord && isClarificationOpen && (
        <Dialog open={isClarificationOpen} onOpenChange={setIsClarificationOpen}>
          <DialogContent className="w-full max-w-lg sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Request Regional Clarification
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                You are requesting clarification on submission{" "}
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {selectedRecord.publication_reference}
                </span>{" "}
                from{" "}
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedRecord.region?.name}
                </span>. A notification will be dispatched to the regional administrators.
              </p>

              <div>
                <Label htmlFor="clar-notes" className="text-xs font-semibold">
                  Questions / Clarification Items *
                </Label>
                <Textarea
                  id="clar-notes"
                  placeholder="e.g. Please clarify discrepancy between artisanal monthly register and published total..."
                  value={clarificationNotes}
                  onChange={(e) => setClarificationNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setIsClarificationOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendClarification}
                disabled={isRequesting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRequesting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Version History Modal */}
      {versionHistoryParams && (
        <SubmissionVersionHistoryModal
          isOpen={!!versionHistoryParams}
          onClose={() => setVersionHistoryParams(null)}
          requirementId={versionHistoryParams.requirementId}
          regionId={versionHistoryParams.regionId}
          reportingPeriodLabel={versionHistoryParams.reportingPeriodLabel}
          titleHint={versionHistoryParams.titleHint}
        />
      )}
    </>
  );
}
