"use client";

import React, { useState } from "react";
import { usePublishRegionalValidatedReportMutation } from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  NationalPublishedRecord,
} from "@/redux/types/nationalReporting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Send,
  FileCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Copy,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
  viewReceipt?: any;
}

export function RegionalPublicationModal({
  isOpen,
  onClose,
  assignment,
  regionId,
  viewReceipt,
}: Props) {
  const req = assignment.requirement;
  const mapping = assignment.activeMapping;
  const node = mapping?.planNode;
  const [narrativeOverride, setNarrativeOverride] = useState("");
  const [publishedReceipt, setPublishedReceipt] = useState<any | null>(null);

  React.useEffect(() => {
    if (viewReceipt) {
      setPublishedReceipt(viewReceipt);
    } else if (!isOpen) {
      setPublishedReceipt(null);
    }
  }, [viewReceipt, isOpen]);

  const [publishReport, { isLoading: isPublishing }] =
    usePublishRegionalValidatedReportMutation();

  const handlePublish = async () => {
    if (!mapping) {
      toast.error("No active mapping found for this requirement");
      return;
    }

    try {
      const res = await publishReport({
        regionId,
        mappingId: mapping.mapping_id,
        narrativeOverride: narrativeOverride.trim() ? narrativeOverride.trim() : null,
      }).unwrap();

      toast.success("Validated regional report published to National Framework!");
      setPublishedReceipt(res.receipt);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to publish report");
    }
  };

  const handleCopyReference = () => {
    if (publishedReceipt?.publicationReference) {
      navigator.clipboard.writeText(publishedReceipt.publicationReference);
      toast.success("Publication reference code copied to clipboard");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        setPublishedReceipt(null);
        onClose();
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Send className="h-5 w-5 text-emerald-600" />
            National Reporting Publication Gateway
          </DialogTitle>
        </DialogHeader>

        {publishedReceipt ? (
          /* Receipt Screen */
          <div className="space-y-5 py-2">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-5 rounded-xl shadow-inner relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                    National Reporting Framework Receipt
                  </span>
                  <h3 className="text-xl font-bold font-mono tracking-tight mt-1">
                    {publishedReceipt.publicationReference}
                  </h3>
                </div>
                <Badge className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs">
                  Official Verification
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs text-emerald-100/90 border-t border-emerald-800/80 pt-3">
                <div>
                  <span className="text-emerald-300">Indicator:</span>{" "}
                  <span className="font-semibold text-white">
                    {publishedReceipt.requirementCode}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-300">Reporting Period:</span>{" "}
                  <span className="font-semibold text-white">
                    {publishedReceipt.reportingPeriod}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-300">Standardized Value:</span>{" "}
                  <span className="font-mono font-bold text-white">
                    {publishedReceipt.standardizedValue}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-300">Achievement:</span>{" "}
                  <span className="font-mono text-emerald-300 font-bold">
                    {publishedReceipt.achievementPercent}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-300">Timestamp:</span>{" "}
                  <span className="font-mono text-white">
                    {new Date(publishedReceipt.publishedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-300">Revision:</span>{" "}
                  <span className="font-semibold text-white">
                    Rev #{publishedReceipt.revisionNumber}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              This validated submission has been permanently recorded in the National Reporting Gateway. Federal administrators and national oversight committees now have read-only access to this audited figure.
            </p>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyReference}
                className="flex items-center gap-1.5"
              >
                <Copy className="h-4 w-4" />
                Copy Reference Code
              </Button>

              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setPublishedReceipt(null);
                  onClose();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Pre-Publication Verification Screen */
          <div className="space-y-4 py-2">
            {/* National Requirement Info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <div className="text-xs font-mono font-semibold text-emerald-600">
                {req?.code}
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                {req?.title}
              </div>
              <div className="text-xs text-slate-500">
                National Standard Unit: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{req?.expected_unit}</strong>
              </div>
            </div>

            {/* Validation Verification Badge */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Validated Regional Achievement
                </span>
                <Badge className="bg-emerald-600 text-white text-xs">
                  status: validated
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-slate-400">Reported Local Actual</span>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {node?.period_actual !== null ? node?.period_actual?.toLocaleString() : "—"}{" "}
                    <span className="text-xs font-sans text-slate-500 font-normal">
                      {node?.target_unit || mapping?.local_unit}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg border border-emerald-300 dark:border-emerald-700">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Standardized National Value
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-200">
                    {node?.period_actual !== null
                      ? (
                          Number(node?.period_actual) *
                          (mapping?.unit_conversion_factor || 1.0)
                        ).toLocaleString()
                      : "—"}{" "}
                    <span className="text-xs font-sans text-emerald-600 font-normal">
                      {req?.expected_unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Source Node: <strong className="text-slate-700 dark:text-slate-300">{node?.title}</strong>
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="narr-override">
                Supplementary Narrative for National Gateway (Optional)
              </Label>
              <Textarea
                id="narr-override"
                placeholder="Include operational context, regional commentary, or notes for Federal authorities..."
                value={narrativeOverride}
                onChange={(e) => setNarrativeOverride(e.target.value)}
                rows={3}
                defaultValue={node?.narration || ""}
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Immutable Gateway:</strong> Upon publication, a digitally signed snapshot will be created. Regional plan adjustments after this point will generate a formal audit revision.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Send className="h-4 w-4" />
                {isPublishing ? "Transmitting..." : "Publish to National Framework"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

