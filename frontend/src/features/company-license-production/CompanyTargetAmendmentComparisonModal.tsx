"use client";

import {
  Scale,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  ShieldCheck,
  AlertCircle,
  XCircle,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TargetAmendmentComparison } from "@/redux/types/production";

interface CompanyTargetAmendmentComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: TargetAmendmentComparison | null;
}

export function CompanyTargetAmendmentComparisonModal({
  isOpen,
  onClose,
  comparison,
}: CompanyTargetAmendmentComparisonModalProps) {
  if (!isOpen || !comparison) return null;

  const amendment = comparison.amendment;
  const assignment = comparison.assignment;
  const unitSymbol = assignment?.defaultReportingUnit?.symbol || "KG";
  const unitName = assignment?.defaultReportingUnit?.name || "Kilograms";

  const { approved_annual, proposed_annual, difference, percentage_change } =
    comparison.annualComparison || {
      approved_annual: 0,
      proposed_annual: 0,
      difference: 0,
      percentage_change: 0,
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base font-bold">
                Target Amendment Comparison & Review Details
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={`capitalize text-xs font-semibold px-2.5 py-0.5 ${
                amendment.status === "amendment_approved"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : amendment.status === "amendment_rejected"
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  : amendment.status === "amendment_revision_requested"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
              }`}
            >
              {amendment.status.replace("amendment_", "").replace("_", " ").toUpperCase()}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Reference: <strong className="font-mono text-foreground">{amendment.amendment_reference}</strong> &bull;
            Submitted by <strong>{amendment.submitter?.full_name || "Company Officer"}</strong> on{" "}
            {amendment.submitted_at ? new Date(amendment.submitted_at).toLocaleDateString() : "Recent"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status Banners */}
          {amendment.status === "amendment_rejected" && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Amendment Request Rejected by Federal Ministry
              </div>
              <div className="p-2.5 rounded bg-card/80 border text-foreground font-mono text-xs">
                {amendment.review_comments || "The requested targets do not align with central resource yield benchmarks."}
              </div>
              <div className="text-[11px] opacity-90">
                Note: The currently approved target (Version {amendment.current_approved_version}) remains fully active without disruption.
              </div>
            </div>
          )}

          {amendment.status === "amendment_revision_requested" && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Revision Requested by Federal Reviewer
              </div>
              <div className="p-2.5 rounded bg-card/80 border text-foreground font-mono text-xs">
                {amendment.review_comments || "Please adjust quarterly distribution."}
              </div>
            </div>
          )}

          {amendment.status === "amendment_approved" && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Amendment Officially Approved & Activated by Federal Ministry
              </div>
              <div className="text-[11px] opacity-90">
                Activated on: {amendment.activated_at ? new Date(amendment.activated_at).toLocaleDateString() : "Recent"} &bull;
                Target Version {amendment.proposed_version_number} is now the legal reporting benchmark.
              </div>
            </div>
          )}

          {/* 3 Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Approved Target (V{amendment.current_approved_version})
                </span>
                <div className="text-xl font-bold font-mono text-foreground">
                  {approved_annual.toLocaleString()} {unitSymbol}
                </div>
                <div className="text-[11px] text-muted-foreground">Original legal baseline</div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  Proposed Target (V{amendment.proposed_version_number})
                </span>
                <div className="text-xl font-bold font-mono text-primary">
                  {proposed_annual.toLocaleString()} {unitSymbol}
                </div>
                <div className="text-[11px] text-muted-foreground">Proposed by company</div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Annual Variance
                </span>
                <div className="flex items-center gap-1.5 text-xl font-bold font-mono">
                  {difference > 0 ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" /> +{difference.toLocaleString()} {unitSymbol}
                    </span>
                  ) : difference < 0 ? (
                    <span className="text-destructive flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" /> {difference.toLocaleString()} {unitSymbol}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0.00 {unitSymbol}</span>
                  )}
                </div>
                <div className="text-[11px] font-semibold">
                  {percentage_change > 0
                    ? `+${percentage_change}% Change`
                    : percentage_change < 0
                    ? `${percentage_change}% Change`
                    : "No difference"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Amendment Reason Box */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Company Justification / Amendment Reason
            </span>
            <p className="text-xs leading-relaxed text-foreground italic">
              &ldquo;{amendment.amendment_reason}&rdquo;
            </p>
            {amendment.submission_notes && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t mt-1">
                <strong>Notes:</strong> {amendment.submission_notes}
              </div>
            )}
          </div>

          {/* Period-by-Period Comparison Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground">Period Distribution Comparison</div>
            <div className="border rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Period Label</th>
                    <th className="p-2.5 text-right">Approved Target</th>
                    <th className="p-2.5 text-right">Proposed Target</th>
                    <th className="p-2.5 text-right">Variance</th>
                    <th className="p-2.5 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(comparison.periodComparisons || []).map((p) => (
                    <tr key={p.period_label} className="hover:bg-muted/10">
                      <td className="p-2.5 font-medium">{p.period_label}</td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {p.approved_quantity.toLocaleString()} {unitSymbol}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-foreground">
                        {p.proposed_quantity.toLocaleString()} {unitSymbol}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        {p.difference > 0 ? (
                          <span className="text-emerald-600">+{p.difference.toLocaleString()}</span>
                        ) : p.difference < 0 ? (
                          <span className="text-destructive">{p.difference.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        {p.percentage_change > 0 ? (
                          <span className="text-emerald-600 font-semibold">
                            +{p.percentage_change}%
                          </span>
                        ) : p.percentage_change < 0 ? (
                          <span className="text-destructive font-semibold">
                            {p.percentage_change}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
