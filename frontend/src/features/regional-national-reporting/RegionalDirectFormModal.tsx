"use client";

import React, { useState } from "react";
import {
  useSubmitDirectFormReportMutation,
  useGetNationalUnitsCatalogQuery,
} from "@/redux/api/nationalReportingApi";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
}

export function RegionalDirectFormModal({
  isOpen,
  onClose,
  assignment,
  regionId,
}: Props) {
  const req = assignment.requirement;
  const latestPub = assignment.latestPublishedRecord;

  const currentYear = new Date().getFullYear();
  const [reportingYear, setReportingYear] = useState<number>(
    latestPub?.reporting_year || currentYear
  );
  const [reportingPeriodLabel, setReportingPeriodLabel] = useState<string>(
    latestPub?.reporting_period_label || "Q1"
  );
  const [plannedTarget, setPlannedTarget] = useState<string>(
    latestPub?.planned_target !== undefined && latestPub?.planned_target !== null
      ? String(latestPub.planned_target)
      : ""
  );
  const [reportedActual, setReportedActual] = useState<string>(
    latestPub?.reported_actual !== undefined && latestPub?.reported_actual !== null
      ? String(latestPub.reported_actual)
      : ""
  );
  const [localUnit, setLocalUnit] = useState<string>(
    latestPub?.local_unit || req?.expected_unit || "count"
  );
  const [narrative, setNarrative] = useState<string>(
    latestPub?.narrative || ""
  );

  const { data: unitsCatalog = {} } = useGetNationalUnitsCatalogQuery();
  const [submitReport, { isLoading: isSubmitting }] =
    useSubmitDirectFormReportMutation();

  const numTarget = parseFloat(plannedTarget);
  const numActual = parseFloat(reportedActual);
  const achievementRate =
    !isNaN(numTarget) && numTarget > 0 && !isNaN(numActual)
      ? Math.round((numActual / numTarget) * 1000) / 10
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportingYear || !reportingPeriodLabel.trim()) {
      toast.error("Please enter a valid reporting year and period");
      return;
    }

    if (isNaN(numActual)) {
      toast.error("Please enter a valid reported actual achievement number");
      return;
    }

    try {
      const res = await submitReport({
        regionId,
        data: {
          assignmentId: assignment.assignment_id,
          requirementId: req?.requirement_id,
          reportingYear: Number(reportingYear),
          reportingPeriodLabel: reportingPeriodLabel.trim(),
          plannedTarget: !isNaN(numTarget) ? numTarget : null,
          reportedActual: numActual,
          localUnit: localUnit.trim(),
          narrative: narrative.trim() || null,
        },
      }).unwrap();

      toast.success(
        res.receipt?.message ||
          "Direct KPI Form Report published successfully to National Framework"
      );
      onClose();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to submit direct form report"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                Form-Based National Reporting (Option B)
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit KPI target and achievement directly via form without requiring regional plan-node linkage.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Requirement Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {req?.code}
              </span>
              <Badge variant="outline" className="text-xs capitalize">
                {req?.category?.replace(/_/g, " ")}
              </Badge>
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {req?.title}
            </h4>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                Standard Unit:{" "}
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {req?.expected_unit}
                </strong>{" "}
                ({req?.unit_category})
              </span>
              <span>•</span>
              <span>
                Reporting Frequency:{" "}
                <strong className="capitalize text-slate-800 dark:text-slate-200">
                  {req?.frequency}
                </strong>
              </span>
              {assignment.is_mandatory && (
                <>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Mandatory National Indicator
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Reporting Period & Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rep-year">Reporting Year *</Label>
              <Input
                id="rep-year"
                type="number"
                min={2000}
                max={2050}
                value={reportingYear}
                onChange={(e) => setReportingYear(parseInt(e.target.value, 10))}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rep-period">Reporting Period Label *</Label>
              <Select
                value={reportingPeriodLabel}
                onValueChange={setReportingPeriodLabel}
              >
                <SelectTrigger id="rep-period" className="mt-1">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Quarter 1 (Q1)</SelectItem>
                  <SelectItem value="Q2">Quarter 2 (Q2)</SelectItem>
                  <SelectItem value="Q3">Quarter 3 (Q3)</SelectItem>
                  <SelectItem value="Q4">Quarter 4 (Q4)</SelectItem>
                  <SelectItem value="Annual">Annual / Full Year</SelectItem>
                  <SelectItem value="Semester 1">Semester 1 (H1)</SelectItem>
                  <SelectItem value="Semester 2">Semester 2 (H2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target & Actual Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="plan-target">Planned Target Value</Label>
              <Input
                id="plan-target"
                type="number"
                step="any"
                placeholder="e.g. 1000"
                value={plannedTarget}
                onChange={(e) => setPlannedTarget(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="rep-actual">Reported Actual Achievement *</Label>
              <Input
                id="rep-actual"
                type="number"
                step="any"
                placeholder="e.g. 950"
                value={reportedActual}
                onChange={(e) => setReportedActual(e.target.value)}
                required
                className="mt-1 font-mono font-bold"
              />
            </div>

            <div>
              <Label htmlFor="unit-input">Reporting Unit *</Label>
              <Input
                id="unit-input"
                type="text"
                placeholder="e.g. metric_ton, kg, datasets"
                value={localUnit}
                onChange={(e) => setLocalUnit(e.target.value)}
                required
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {/* Achievement Rate Preview */}
          {achievementRate !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Calculated Achievement Rate:
              </div>
              <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {achievementRate}%
              </div>
            </div>
          )}

          {/* Narrative / Context */}
          <div>
            <Label htmlFor="narrative-input">
              Narrative & Implementation Context (Optional)
            </Label>
            <Textarea
              id="narrative-input"
              rows={3}
              placeholder="Provide narrative explanation of achievements, challenges, field observations, or execution factors..."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {/* Info callout on duplicate prevention */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              Submitting will publish directly to the National Dashboard. If a report was previously submitted for this requirement and period, it will be automatically superseded to guarantee no duplicate counts.
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Publishing..." : "Submit & Publish KPI Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

