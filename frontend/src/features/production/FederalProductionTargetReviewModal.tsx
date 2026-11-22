"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  Factory,
  FileBadge,
  Clock,
  History,
  ShieldCheck,
  RotateCcw,
  Layers,
  Scale,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetProductionDetailQuery,
  useReviewTargetProposalMutation,
  useReviewTargetAmendmentMutation,
} from "@/redux/api/productionApi";
import { toast } from "sonner";

interface FederalProductionTargetReviewModalProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: "submission" | "amendment";
}

export function FederalProductionTargetReviewModal({
  assignmentId,
  isOpen,
  onClose,
  onSuccess,
  defaultMode,
}: FederalProductionTargetReviewModalProps) {
  const [comments, setComments] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const {
    data: detail,
    isLoading,
    refetch,
  } = useGetProductionDetailQuery(assignmentId, {
    skip: !isOpen || !assignmentId,
  });

  const [reviewTargetProposal, { isLoading: isSubmittingProposalReview }] =
    useReviewTargetProposalMutation();
  const [reviewTargetAmendment, { isLoading: isSubmittingAmendmentReview }] =
    useReviewTargetAmendmentMutation();

  const isSubmittingReview = isSubmittingProposalReview || isSubmittingAmendmentReview;

  const assignment = detail?.assignment;
  const license = assignment?.license;
  const proposal = detail?.targetProposal;
  const history = detail?.approvalHistory || [];
  const pendingAmendment = detail?.pendingAmendment;
  const amendmentComparison = detail?.amendmentComparison;

  // Determine active review mode (submission vs amendment)
  const availableModes = useMemo(() => {
    const modes: Array<"submission" | "amendment"> = [];
    if (proposal && ["submitted", "revision_requested", "under_review", "rejected"].includes(proposal.status)) {
      modes.push("submission");
    }
    if (pendingAmendment) {
      modes.push("amendment");
    }
    return modes;
  }, [proposal, pendingAmendment]);

  const [activeMode, setActiveMode] = useState<"submission" | "amendment">(
    defaultMode || (pendingAmendment ? "amendment" : "submission")
  );

  // Auto-switch mode if activeMode not available but another is
  const effectiveMode = availableModes.includes(activeMode)
    ? activeMode
    : availableModes[0] || (pendingAmendment ? "amendment" : "submission");

  if (!isOpen) return null;

  const unitSymbol = assignment?.defaultReportingUnit?.symbol || "KG";
  const unitName = assignment?.defaultReportingUnit?.name || "Kilograms";
  const targetDepth = assignment?.target_allocation_depth || "quarter";

  // Initial Target Review handler
  const handleProposalReviewAction = async (
    decision: "approved" | "revision_requested" | "rejected"
  ) => {
    setReviewError("");

    if ((decision === "rejected" || decision === "revision_requested") && !comments.trim()) {
      setReviewError(
        `A detailed feedback comment is required when issuing a ${
          decision === "rejected" ? "Rejection" : "Revision Request"
        }.`
      );
      return;
    }

    try {
      await reviewTargetProposal({
        id: assignmentId,
        version_number: proposal?.version_number || 1,
        decision,
        review_comments: comments.trim() || undefined,
      }).unwrap();

      toast.success(
        `Target proposal successfully marked as ${decision.replace("_", " ").toUpperCase()}.`
      );
      setComments("");
      refetch();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to record review decision.";
      setReviewError(msg);
      toast.error(msg);
    }
  };

  // Amendment Review handler
  const handleAmendmentReviewAction = async (
    decision: "amendment_approved" | "amendment_rejected" | "amendment_revision_requested"
  ) => {
    setReviewError("");

    if (
      (decision === "amendment_rejected" || decision === "amendment_revision_requested") &&
      !comments.trim()
    ) {
      setReviewError(
        `A detailed feedback comment is required when rejecting or requesting revisions on an amendment.`
      );
      return;
    }

    if (!pendingAmendment) {
      setReviewError("No pending amendment found to review.");
      return;
    }

    try {
      await reviewTargetAmendment({
        amendmentId: pendingAmendment.amendment_id,
        assignmentId,
        decision,
        review_comments: comments.trim() || undefined,
        effective_date: effectiveDate,
      }).unwrap();

      const label =
        decision === "amendment_approved"
          ? "APPROVED and activated"
          : decision === "amendment_rejected"
          ? "REJECTED (original approved target remains active)"
          : "REVISION REQUESTED";

      toast.success(`Target amendment successfully ${label}.`);
      setComments("");
      refetch();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "Failed to record amendment review decision.";
      setReviewError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-card border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">
                Federal Ministry Production Review
              </h3>
              {pendingAmendment && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-mono">
                  Pending Amendment
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and authorize company production targets, periodic distributions, and legal amendments.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl font-bold p-1 rounded-lg hover:bg-muted"
          >
            &times;
          </button>
        </div>

        {/* Mode Selector Tabs if both exist */}
        {availableModes.length > 1 && (
          <div className="px-6 pt-3 border-b bg-muted/10 shrink-0">
            <Tabs
              value={effectiveMode}
              onValueChange={(v) => setActiveMode(v as any)}
              className="w-full"
            >
              <TabsList className="h-8">
                <TabsTrigger value="submission" className="text-xs px-3">
                  Initial Target Submission
                </TabsTrigger>
                <TabsTrigger value="amendment" className="text-xs px-3 gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-amber-600" />
                  Amendment Request ({pendingAmendment?.amendment_reference || "Pending"})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loading01 />
            <p className="text-xs text-muted-foreground">Loading target specifications...</p>
          </div>
        ) : !assignment ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Assignment details could not be loaded.
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Context Card: Company & License */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Company</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {assignment.company?.name || "Company"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">License</span>
                <span className="font-mono font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <FileBadge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {license?.license_number || "Direct"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Production Item</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Factory className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {assignment.productionItem?.name || "Item"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Target Depth</span>
                <span className="font-mono font-bold text-primary uppercase mt-0.5 block">
                  {targetDepth}
                </span>
              </div>
            </div>

            {/* =========================================================================
                MODE A: AMENDMENT REVIEW
            ========================================================================= */}
            {effectiveMode === "amendment" && pendingAmendment && (
              <div className="space-y-5">
                {/* Amendment Header Banner */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-amber-600" />
                      Formal Target Amendment Request: {pendingAmendment.amendment_reference}
                    </span>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono text-[10px]">
                      {pendingAmendment.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-foreground italic bg-card/60 p-2.5 rounded-lg border">
                    &ldquo;{pendingAmendment.amendment_reason}&rdquo;
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                    <span>
                      Submitted by: <strong>{pendingAmendment.submitter?.full_name || "Company Officer"}</strong> (
                      {pendingAmendment.submitter?.email})
                    </span>
                    <span>
                      Date: {pendingAmendment.submitted_at ? new Date(pendingAmendment.submitted_at).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                </div>

                {/* Top Delta Cards */}
                {amendmentComparison && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border bg-muted/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Current Approved Target</span>
                      <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                        {amendmentComparison.annualComparison.approved_annual.toLocaleString()} {unitSymbol}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Version {pendingAmendment.current_approved_version}</div>
                    </div>

                    <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
                      <span className="text-[10px] font-semibold text-primary uppercase">Proposed Amended Target</span>
                      <div className="text-lg font-bold font-mono text-primary mt-0.5">
                        {amendmentComparison.annualComparison.proposed_annual.toLocaleString()} {unitSymbol}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Version {pendingAmendment.proposed_version_number} (Proposed)</div>
                    </div>

                    <div className="p-3 rounded-xl border bg-muted/30">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Variance & % Change</span>
                      <div className="text-lg font-bold font-mono mt-0.5 flex items-center gap-1">
                        {amendmentComparison.annualComparison.difference > 0 ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" /> +{amendmentComparison.annualComparison.difference.toLocaleString()} {unitSymbol}
                          </span>
                        ) : amendmentComparison.annualComparison.difference < 0 ? (
                          <span className="text-destructive flex items-center gap-1">
                            <TrendingDown className="h-4 w-4" /> {amendmentComparison.annualComparison.difference.toLocaleString()} {unitSymbol}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0 {unitSymbol}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold">
                        {amendmentComparison.annualComparison.percentage_change > 0
                          ? `+${amendmentComparison.annualComparison.percentage_change}% Increase`
                          : amendmentComparison.annualComparison.percentage_change < 0
                          ? `${amendmentComparison.annualComparison.percentage_change}% Decrease`
                          : "No change"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Period-by-Period Comparison Table */}
                {amendmentComparison && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      Period Target Distribution & Delta Analysis
                    </Label>
                    <div className="border rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Period</th>
                            <th className="p-2.5 text-right">Approved</th>
                            <th className="p-2.5 text-right">Proposed</th>
                            <th className="p-2.5 text-right">Variance</th>
                            <th className="p-2.5 text-right">% Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {amendmentComparison.periodComparisons.map((p) => (
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
                                  <span className="text-emerald-600 font-semibold">+{p.percentage_change}%</span>
                                ) : p.percentage_change < 0 ? (
                                  <span className="text-destructive font-semibold">{p.percentage_change}%</span>
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
                )}

                {/* Effective Date Configuration */}
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-xs font-semibold">Authorized Activation Effective Date</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Reports submitted on or after this date evaluate against the amended target. Earlier periods retain their historical baseline.
                  </p>
                </div>
              </div>
            )}

            {/* =========================================================================
                MODE B: INITIAL TARGET PROPOSAL REVIEW
            ========================================================================= */}
            {effectiveMode === "submission" && proposal && (
              <div className="space-y-5">
                {/* Annual Target Banner */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Proposed Annual Production Target
                    </span>
                    <div className="text-2xl font-black font-mono text-foreground mt-0.5">
                      {Number(proposal.annual_target || 0).toLocaleString()} {unitSymbol}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Fixed unit: <span className="font-semibold text-foreground">{unitName}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={`capitalize text-xs font-semibold px-2.5 py-0.5 ${
                        proposal.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                          : proposal.status === "submitted"
                          ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
                          : "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      }`}
                    >
                      {proposal.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Version {proposal.version_number} &bull; {proposal.periods?.length || 0} periods
                    </div>
                  </div>
                </div>

                {/* Submitter Notes */}
                {proposal.submission_notes && (
                  <div className="p-3 rounded-xl border bg-muted/20 text-xs space-y-1">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase">
                      Company Submitter Justification
                    </span>
                    <p className="italic text-foreground">&ldquo;{proposal.submission_notes}&rdquo;</p>
                  </div>
                )}

                {/* Period Allocations Table */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Periodic Allocation Breakdown ({targetDepth.toUpperCase()})
                  </Label>
                  <div className="border rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
                        <tr>
                          <th className="p-2.5">Period Label</th>
                          <th className="p-2.5">Date Range</th>
                          <th className="p-2.5 text-right">Target Quantity</th>
                          <th className="p-2.5 text-right">% of Annual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(proposal.periods || []).map((p: any) => {
                          const qty = Number(p.target_quantity || 0);
                          const pct = proposal.annual_target
                            ? Math.round((qty / Number(proposal.annual_target)) * 100)
                            : 0;

                          return (
                            <tr key={p.period_label} className="hover:bg-muted/10">
                              <td className="p-2.5 font-medium">{p.period_label}</td>
                              <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                                {p.period_start_date} &rarr; {p.period_end_date}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold">
                                {qty.toLocaleString()} {unitSymbol}
                              </td>
                              <td className="p-2.5 text-right font-mono text-muted-foreground">
                                {pct}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Approval History Audit Trail */}
            {history.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Audit Trail & Decision History
                </h4>
                <div className="rounded-xl border p-3 bg-muted/20 space-y-2 text-xs max-h-40 overflow-y-auto">
                  {history.map((h: any, idx: number) => (
                    <div
                      key={h.history_id || idx}
                      className="flex items-start gap-2 text-[11px] pb-2 border-b last:border-b-0 last:pb-0"
                    >
                      <div className="mt-0.5">
                        {h.action?.includes("approved") ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : h.action?.includes("revision") ? (
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-foreground">
                            {h.action?.replace("_", " ")}
                            {h.version_number ? ` (V${h.version_number})` : ""}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                        {h.comments && (
                          <p className="text-muted-foreground mt-0.5 italic">&ldquo;{h.comments}&rdquo;</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Comments & Action Buttons */}
            <div className="border-t pt-4 space-y-3">
              <label className="block text-xs font-bold text-foreground">
                Federal Reviewer Feedback / Justification Comments
                {(reviewError.includes("feedback") || reviewError.includes("mandatory")) && (
                  <span className="text-destructive text-[11px] ml-1 font-normal">* Required for Rejection/Revision</span>
                )}
              </label>
              <Textarea
                rows={3}
                placeholder="Enter regulatory feedback, adjustment requirements, or official approval notes..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="text-xs resize-none"
              />

              {reviewError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmittingReview}>
                  Cancel
                </Button>

                {effectiveMode === "amendment" ? (
                  /* Amendment Action Buttons */
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAmendmentReviewAction("amendment_rejected")}
                      disabled={isSubmittingReview}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject Amendment
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAmendmentReviewAction("amendment_revision_requested")}
                      disabled={isSubmittingReview}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Request Revision
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleAmendmentReviewAction("amendment_approved")}
                      disabled={isSubmittingReview}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {isSubmittingReview ? "Activating..." : "Approve & Activate Amendment"}
                    </Button>
                  </div>
                ) : (
                  /* Initial Proposal Action Buttons */
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProposalReviewAction("rejected")}
                      disabled={isSubmittingReview}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject Proposal
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProposalReviewAction("revision_requested")}
                      disabled={isSubmittingReview}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Request Revision
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleProposalReviewAction("approved")}
                      disabled={isSubmittingReview}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {isSubmittingReview ? "Processing..." : "Approve Target"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
