"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Factory,
  AlertCircle,
  Calendar,
  Check,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Sparkles,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSubmitTargetAmendmentMutation } from "@/redux/api/productionApi";
import type {
  ProductionDetailBundle,
  TargetPeriodNode,
  CompanyProductionTarget,
} from "@/redux/types/production";

interface CompanyTargetAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  detailBundle: ProductionDetailBundle;
  onSuccess?: () => void;
}

export function CompanyTargetAmendmentModal({
  isOpen,
  onClose,
  assignmentId,
  detailBundle,
  onSuccess,
}: CompanyTargetAmendmentModalProps) {
  const assignment = detailBundle?.assignment;
  const approvedTarget = detailBundle?.approvedTarget;
  const approvedTree = detailBundle?.approvedTargetsTree;
  const targetDepth = (assignment?.target_allocation_depth || "quarter").toLowerCase();
  const unitSymbol = assignment?.defaultReportingUnit?.symbol || "KG";
  const unitName = assignment?.defaultReportingUnit?.name || "Kilograms";

  const currentApprovedAnnual = approvedTarget ? Number(approvedTarget.target_quantity) : 0;

  const [proposedAnnualInput, setProposedAnnualInput] = useState<string>("");
  const [amendmentReason, setAmendmentReason] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [submissionNotes, setSubmissionNotes] = useState<string>("");
  const [periodAllocations, setPeriodAllocations] = useState<TargetPeriodNode[]>([]);

  const [submitAmendment, { isLoading: isSubmitting }] = useSubmitTargetAmendmentMutation();

  // Helper to divide a date range [startDateStr, endDateStr] into N contiguous non-overlapping intervals
  function generateIntervalsFromDates(
    startDateStr: string,
    endDateStr: string,
    count: number,
    prefix: string,
    periodType: "year" | "month" | "half_year" | "quarter" | "day",
    totalAnnual: number
  ): TargetPeriodNode[] {
    const [sY, sM, sD] = startDateStr.split("-").map(Number);
    const [eY, eM, eD] = endDateStr.split("-").map(Number);
    const startUtc = Date.UTC(sY, sM - 1, sD);
    const endUtc = Date.UTC(eY, eM - 1, eD);
    const oneDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((endUtc - startUtc) / oneDay) + 1);
    const daysPerSlice = totalDays / count;
    const perPeriodQty = totalAnnual > 0 ? Number((totalAnnual / count).toFixed(4)) : 0;

    const periods: TargetPeriodNode[] = [];
    let currentStartDay = 0;
    for (let i = 0; i < count; i++) {
      const nextStartDay = i === count - 1 ? totalDays : Math.round((i + 1) * daysPerSlice);
      const pStart = new Date(startUtc + currentStartDay * oneDay);
      const pEnd = new Date(startUtc + (nextStartDay - 1) * oneDay);
      currentStartDay = nextStartDay;

      const pStartStr = pStart.toISOString().slice(0, 10);
      const pEndStr = pEnd.toISOString().slice(0, 10);
      const label =
        count === 1
          ? `Full Period (${pStartStr} ~ ${pEndStr})`
          : `${prefix}${i + 1} (${pStartStr} ~ ${pEndStr})`;

      periods.push({
        target_period_type: periodType,
        period_label: label,
        period_start_date: pStartStr,
        period_end_date: pEndStr,
        target_quantity: perPeriodQty,
        department_allocations: [],
      });
    }
    return periods;
  }

  // Populate proposed periods strictly adhering to configured assignment schedule
  useEffect(() => {
    if (isOpen) {
      setProposedAnnualInput(String(currentApprovedAnnual || ""));
      setAmendmentReason("");
      setSubmissionNotes("");

      const effStart = assignment?.effective_from || `${new Date().getFullYear()}-01-01`;
      let effEnd = assignment?.effective_to;
      if (!effEnd) {
        if (assignment?.effective_from) {
          const [sY, sM, sD] = assignment.effective_from.split("-").map(Number);
          const nextYear = new Date(Date.UTC(sY + 1, sM - 1, sD - 1));
          effEnd = nextYear.toISOString().slice(0, 10);
        } else {
          effEnd = `${new Date().getFullYear()}-12-31`;
        }
      }

      let count = 4;
      let prefix = "Q";
      let periodType: "year" | "month" | "half_year" | "quarter" | "day" = "quarter";
      if (targetDepth === "semi_annual") {
        count = 2;
        prefix = "H";
        periodType = "half_year";
      } else if (targetDepth === "monthly") {
        count = 12;
        prefix = "M";
        periodType = "month";
      } else if (targetDepth === "annual") {
        count = 1;
        prefix = "";
        periodType = "year";
      }

      const configuredIntervals = generateIntervalsFromDates(
        effStart,
        effEnd,
        count,
        prefix,
        periodType,
        currentApprovedAnnual
      );

      if (approvedTree && approvedTree.periods && approvedTree.periods.length > 0) {
        const approvedPeriods = approvedTree.periods;
        const matchesConfig = approvedPeriods[0]?.period_start_date === effStart;

        if (matchesConfig && approvedPeriods.length === count) {
          setPeriodAllocations(
            approvedPeriods.map((p: any) => ({
              target_period_type: p.target_period_type as any,
              period_label: p.period_label,
              period_start_date: p.period_start_date,
              period_end_date: p.period_end_date,
              target_quantity: Number(p.target_quantity) || 0,
              department_allocations: (p.department_allocations || []).map((d: any) => ({
                company_structure_id: d.company_structure_id || "",
                target_quantity: Number(d.target_quantity) || 0,
                name: d.department?.name,
                level: d.department?.level,
              })),
            }))
          );
        } else {
          // Re-align periods to configured schedule, preserving existing approved target quantities
          setPeriodAllocations(
            configuredIntervals.map((inv, idx) => {
              const matching = approvedPeriods[idx] || approvedPeriods.find((ap: any) => ap.period_label?.startsWith(prefix + (idx + 1)));
              return {
                ...inv,
                target_quantity: matching ? Number(matching.target_quantity) || 0 : inv.target_quantity,
                department_allocations: (matching?.department_allocations || []).map((d: any) => ({
                  company_structure_id: d.company_structure_id || "",
                  target_quantity: Number(d.target_quantity) || 0,
                  name: d.department?.name,
                  level: d.department?.level,
                })),
              };
            })
          );
        }
      } else {
        setPeriodAllocations(configuredIntervals);
      }
    }
  }, [isOpen, approvedTree, currentApprovedAnnual, assignment?.effective_from, assignment?.effective_to, targetDepth]);

  const proposedAnnualNum = parseFloat(proposedAnnualInput) || 0;

  // Auto distribute proposed annual target equally across existing periods
  const handleAutoDistribute = () => {
    if (!proposedAnnualNum || periodAllocations.length === 0) return;
    const count = periodAllocations.length;
    const perPeriod = Number((proposedAnnualNum / count).toFixed(4));
    let distributedSum = 0;

    const updated = periodAllocations.map((p, idx) => {
      let qty = perPeriod;
      if (idx === count - 1) {
        qty = Number((proposedAnnualNum - distributedSum).toFixed(4));
      } else {
        distributedSum += qty;
      }
      return {
        ...p,
        target_quantity: qty,
      };
    });
    setPeriodAllocations(updated);
  };

  // Handle individual period target edit
  const handlePeriodChange = (idx: number, val: string) => {
    const num = val === "" ? 0 : parseFloat(val) || 0;
    setPeriodAllocations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], target_quantity: num };
      return copy;
    });
  };

  // Reconciliations
  const totalAllocated = useMemo(() => {
    return periodAllocations.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0);
  }, [periodAllocations]);

  const difference = Number((proposedAnnualNum - totalAllocated).toFixed(4));
  const isPeriodSumValid = proposedAnnualNum > 0 && Math.abs(difference) < 0.0001;

  const annualDelta = Number((proposedAnnualNum - currentApprovedAnnual).toFixed(4));
  const annualPctChange =
    currentApprovedAnnual > 0
      ? Number(((annualDelta / currentApprovedAnnual) * 100).toFixed(2))
      : 0;

  const isFormValid =
    isPeriodSumValid &&
    amendmentReason.trim().length >= 10 &&
    proposedAnnualNum > 0 &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error("Please fill all required fields and ensure period targets reconcile.");
      return;
    }

    try {
      await submitAmendment({
        id: assignmentId,
        proposed_annual_target: proposedAnnualNum,
        period_allocations: periodAllocations,
        amendment_reason: amendmentReason.trim(),
        effective_date: effectiveDate,
        submission_notes: submissionNotes.trim() || undefined,
      }).unwrap();

      toast.success(
        "Target amendment request submitted successfully for Federal Ministry review!"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to submit target amendment request."
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-600" />
              <DialogTitle className="text-base font-bold">
                Request Production Target Amendment
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs font-mono">
                Schedule: {assignment?.effective_from || "N/A"} ~ {assignment?.effective_to || "Indefinite"}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono uppercase">
                {targetDepth}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs">
            Approved targets are legally bound and locked against direct edits. Submit a formal amendment request for Federal Ministry review and authorization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Top Comparison Card: Current Approved vs Proposed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Current Approved Target
              </span>
              <div className="text-xl font-bold font-mono text-foreground">
                {currentApprovedAnnual.toLocaleString()} {unitSymbol}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Version {approvedTarget?.version_number || 1} &bull; Legally Approved
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Proposed Amended Target
              </span>
              <div className="text-xl font-bold font-mono text-primary">
                {proposedAnnualNum.toLocaleString()} {unitSymbol}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Distributed over {periodAllocations.length} periods
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Net Variance
              </span>
              <div className="flex items-center gap-1.5 text-xl font-bold font-mono">
                {annualDelta > 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" /> +{annualDelta.toLocaleString()} {unitSymbol}
                  </span>
                ) : annualDelta < 0 ? (
                  <span className="text-destructive flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" /> {annualDelta.toLocaleString()} {unitSymbol}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0.00 {unitSymbol}</span>
                )}
              </div>
              <div className="text-[11px] font-semibold">
                {annualPctChange > 0
                  ? `+${annualPctChange}% Increase`
                  : annualPctChange < 0
                  ? `${annualPctChange}% Decrease`
                  : "No change"}
              </div>
            </div>
          </div>

          {/* Form Fields: Proposed Target & Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Proposed New Annual Target ({unitSymbol})</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoDistribute}
                  disabled={!proposedAnnualNum}
                  className="h-6 text-[10px] gap-1 text-primary hover:text-primary/90 px-1.5"
                >
                  <Sparkles className="h-3 w-3" />
                  Auto-Distribute Equally
                </Button>
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={proposedAnnualInput}
                onChange={(e) => setProposedAnnualInput(e.target.value)}
                placeholder="e.g. 1500"
                className="h-9 text-sm font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Proposed Effective Date</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Period Distribution Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Periodic Distribution ({targetDepth.toUpperCase()})
              </Label>
              {isPeriodSumValid ? (
                <Badge className="bg-emerald-600 text-white text-[10px] h-5 gap-1">
                  <Check className="h-2.5 w-2.5" /> 100% Balanced ({totalAllocated.toLocaleString()} {unitSymbol})
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                  Variance: {difference > 0 ? `+${difference}` : difference} {unitSymbol}
                </Badge>
              )}
            </div>

            <div className="border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Period</th>
                    <th className="p-2.5 text-right">Current Approved</th>
                    <th className="p-2.5 text-right">Proposed Target</th>
                    <th className="p-2.5 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {periodAllocations.map((p, idx) => {
                    const approvedVal = approvedTree?.periods?.[idx]
                      ? Number(approvedTree.periods[idx].target_quantity)
                      : 0;
                    const propVal = Number(p.target_quantity) || 0;
                    const diff = Number((propVal - approvedVal).toFixed(4));

                    return (
                      <tr key={p.period_label} className="hover:bg-muted/10">
                        <td className="p-2.5 font-medium">{p.period_label}</td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">
                          {approvedVal.toLocaleString()} {unitSymbol}
                        </td>
                        <td className="p-2.5 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={p.target_quantity === 0 ? "" : p.target_quantity}
                            onChange={(e) => handlePeriodChange(idx, e.target.value)}
                            className="h-7 text-xs font-mono text-right w-36 ml-auto"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {diff > 0 ? (
                            <span className="text-emerald-600">+{diff.toLocaleString()}</span>
                          ) : diff < 0 ? (
                            <span className="text-destructive">{diff.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mandatory Reason for Amendment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Mandatory Justification / Reason for Target Amendment *</span>
              <span className="text-[10px] text-muted-foreground">
                Required for Federal Ministry compliance review
              </span>
            </Label>
            <Textarea
              rows={3}
              placeholder="Explain the technical, operational, geological, or economic reason necessitating this amendment (e.g. enhanced plant throughput, geological seam discovery, machinery overhaul)..."
              value={amendmentReason}
              onChange={(e) => setAmendmentReason(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Optional Submission Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Additional Operational Notes (Optional)</Label>
            <Input
              placeholder="Reference documents, engineering reports, or concessions notes..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Scale className="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting Request..." : "Submit Amendment Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
