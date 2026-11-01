"use client";

import React, { useState } from "react";
import {
  useGetNationalPublishedRecordsQuery,
  useRequestNationalClarificationMutation,
} from "@/redux/api/nationalReportingApi";
import { useGetRegionsQuery } from "@/redux/api/regionApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Globe,
  Layers,
  Clock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { NationalPublishedRecord } from "@/redux/types/nationalReporting";

export function PublishedSubmissionsTab() {
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<NationalPublishedRecord | null>(null);
  const [clarificationNotes, setClarificationNotes] = useState("");
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);

  const { data: records = [], isLoading } = useGetNationalPublishedRecordsQuery({
    reporting_year: yearFilter !== "all" ? parseInt(yearFilter, 10) : undefined,
    reporting_period_label: periodFilter !== "all" ? periodFilter : undefined,
    region_id: regionFilter !== "all" ? regionFilter : undefined,
  });

  const { data: regions = [] } = useGetRegionsQuery({ is_active: true });
  const [requestClarification, { isLoading: isRequesting }] = useRequestNationalClarificationMutation();

  const handleOpenReceipt = (rec: NationalPublishedRecord) => {
    setSelectedRecord(rec);
  };

  const handleSendClarification = async () => {
    if (!selectedRecord || !clarificationNotes.trim()) {
      toast.error("Please provide questions or notes for the region");
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
              <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
              <SelectItem value={String(currentYear - 2)}>{currentYear - 2}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[150px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
              <SelectItem value="Annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[200px] bg-slate-50 dark:bg-slate-950">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regional States</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.region_id} value={r.region_id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto text-xs text-slate-500 font-medium">
          Received <span className="font-bold text-slate-900 dark:text-slate-100">{records.length}</span> validated national submissions
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Reference Code</th>
                <th className="px-5 py-3.5">Regional State</th>
                <th className="px-5 py-3.5">Requirement</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Reported Actual (Local)</th>
                <th className="px-5 py-3.5">Standardized (National)</th>
                <th className="px-5 py-3.5">Achievement</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    Loading published submissions...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    No published regional reports found for the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
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
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {rec.region?.name || "Region"}
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
                    <td className="px-5 py-4 font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                      {rec.standardized_actual != null ? rec.standardized_actual.toLocaleString() : "—"}{" "}
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans">
                        {rec.standardized_unit}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {rec.achievement_percent !== null && rec.achievement_percent !== undefined ? (
                        <Badge
                          variant="outline"
                          className={
                            rec.achievement_percent >= 100
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                              : rec.achievement_percent >= 70
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-amber-50 text-amber-700 border-amber-300"
                          }
                        >
                          {rec.achievement_percent}%
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {rec.status === "published" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Published
                        </Badge>
                      ) : rec.status === "clarification_requested" ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Clarification Needed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Superseded</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReceipt(rec)}
                        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        Receipt & Proof
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Receipt Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              National Publication Certificate & Audit Proof
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-5 py-2">
              {/* Receipt Header Badge */}
              <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-5 rounded-xl shadow-inner relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                      Ministry of Mines • National Reporting Gateway
                    </span>
                    <h3 className="text-xl font-bold font-mono tracking-tight mt-1">
                      {selectedRecord.publication_reference}
                    </h3>
                  </div>
                  <Badge className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs">
                    Validated Snapshot
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-emerald-100/90 border-t border-emerald-800/80 pt-3">
                  <div>
                    <span className="text-emerald-300">Regional Authority:</span>{" "}
                    <span className="font-semibold text-white">
                      {selectedRecord.region?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-300">Reporting Window:</span>{" "}
                    <span className="font-semibold text-white">
                      {selectedRecord.reporting_year} {selectedRecord.reporting_period_label}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-300">Published Timestamp:</span>{" "}
                    <span className="font-mono text-white">
                      {new Date(selectedRecord.published_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-300">Revision Version:</span>{" "}
                    <span className="font-semibold text-white">
                      Rev #{selectedRecord.revision_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement & Measurement Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    National Indicator
                  </span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedRecord.requirement?.title}
                  </div>
                  <div className="text-xs font-mono text-emerald-600">
                    {selectedRecord.requirement?.code} • {selectedRecord.requirement?.category}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                  <span className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                    Standardized National Value
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-200">
                    {selectedRecord.standardized_actual != null
                      ? selectedRecord.standardized_actual.toLocaleString()
                      : "—"}{" "}
                    <span className="text-sm font-sans font-medium text-emerald-600">
                      {selectedRecord.standardized_unit}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Reported locally as {selectedRecord.reported_actual} {selectedRecord.local_unit}
                  </div>
                </div>
              </div>

              {/* Regional Validation Provenance */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Regional Validation Provenance
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500">Regional Validator:</span>{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedRecord.validatedByUser?.full_name || "Regional System Validator"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Validation Timestamp:</span>{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedRecord.regional_validated_at
                        ? new Date(selectedRecord.regional_validated_at).toLocaleString()
                        : "Verified during publication"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Publisher:</span>{" "}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {selectedRecord.publishedByUser?.full_name || "Regional Officer"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Source Plan Node:</span>{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedRecord.snapshot_data?.nodeProvenance?.title || "Regional Target"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Narrative & Explanations */}
              {selectedRecord.narrative && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Qualitative Regional Narrative
                  </span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 pt-1 whitespace-pre-wrap">
                    {selectedRecord.narrative}
                  </p>
                </div>
              )}

              {/* Clarification Notes if any */}
              {selectedRecord.clarification_notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <AlertTriangle className="h-4 w-4" />
                    Federal Clarification Request
                  </div>
                  <p className="text-sm text-amber-900 dark:text-amber-200 pt-1">
                    {selectedRecord.clarification_notes}
                  </p>
                </div>
              )}

              <DialogFooter className="pt-2 flex justify-between items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsClarificationOpen(true)}
                  className="text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50"
                >
                  <HelpCircle className="h-4 w-4 mr-1.5" />
                  Request Clarification
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close Receipt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clarification Input Modal */}
      <Dialog open={isClarificationOpen} onOpenChange={setIsClarificationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Regional Clarification</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              Submit formal inquiries or request supplementary documentation regarding this published figure from the regional authority.
            </p>

            <div>
              <Label htmlFor="clar-notes">Clarification Questions / Inquiries *</Label>
              <Textarea
                id="clar-notes"
                placeholder="Detail specific discrepancies or questions for the regional state administration..."
                value={clarificationNotes}
                onChange={(e) => setClarificationNotes(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClarificationOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isRequesting || !clarificationNotes.trim()}
                onClick={handleSendClarification}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRequesting ? "Submitting..." : "Send Request"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

