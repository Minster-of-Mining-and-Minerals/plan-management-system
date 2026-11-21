"use client";

import { useState } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useGetProductionDetailQuery,
  useReviewTargetProposalMutation,
} from "@/redux/api/productionApi";
import { toast } from "sonner";

interface FederalProductionTargetReviewModalProps {
  assignmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FederalProductionTargetReviewModal({
  assignmentId,
  isOpen,
  onClose,
  onSuccess,
}: FederalProductionTargetReviewModalProps) {
  const [comments, setComments] = useState("");
  const [reviewError, setReviewError] = useState("");

  const {
    data: detail,
    isLoading,
    refetch,
  } = useGetProductionDetailQuery(assignmentId, {
    skip: !isOpen || !assignmentId,
  });

  const [reviewTargetProposal, { isLoading: isSubmittingReview }] =
    useReviewTargetProposalMutation();

  if (!isOpen) return null;

  const assignment = detail?.assignment;
  const license = assignment?.license;
  const proposal = detail?.targetProposal;
  const history = detail?.approvalHistory || [];
  const unitSymbol =
    assignment?.defaultReportingUnit?.symbol ||
    assignment?.productionItem?.baseUnit?.symbol ||
    "";

  const periods = proposal?.periods || [];
  const allDeptAllocations = periods.flatMap((p) => p.department_allocations || []);

  const handleReviewAction = async (
    action: "approved" | "revision_requested" | "rejected"
  ) => {
    setReviewError("");

    if (action !== "approved" && !comments.trim()) {
      setReviewError("Please provide review comments explaining the requested changes or reason.");
      return;
    }

    try {
      const res = await reviewTargetProposal({
        id: assignmentId,
        decision: action,
        review_comments: comments.trim() || undefined,
      }).unwrap();

      if (res.success) {
        toast.success(
          action === "approved"
            ? "Target proposal has been approved! Company reporting is now unlocked."
            : action === "revision_requested"
            ? "Revision requested from company."
            : "Target proposal rejected."
        );
        refetch();
        onSuccess?.();
        onClose();
      } else {
        setReviewError(res.message || "Failed to process review action.");
      }
    } catch (err: any) {
      setReviewError(err?.data?.message || err?.message || "Failed to process target review.");
    }
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-amber-600 text-white">Pending Review</Badge>;
      case "revision_requested":
        return <Badge className="bg-orange-600 text-white">Revision Requested</Badge>;
      case "rejected":
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return <Badge variant="outline">Draft / Not Submitted</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Federal Target Proposal Review</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Review and validate annual and periodic production targets submitted by the company.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            ✕
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loading01 />
          </div>
        ) : !proposal ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p>No target proposal has been submitted by the company for this production assignment yet.</p>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
            {/* Context Info Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3.5 rounded-xl border text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Company</span>
                <span className="font-semibold">{assignment?.company?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">License No.</span>
                <span className="font-mono font-semibold">{license?.license_number || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Production Item</span>
                <span className="font-semibold">{assignment?.productionItem?.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Target Depth</span>
                <Badge variant="outline" className="capitalize text-[11px]">
                  {assignment?.target_allocation_depth?.replace("_", " ") || "N/A"}
                </Badge>
              </div>
            </div>

            {/* Proposal Summary Card */}
            <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">
                    Proposed Annual Target ({proposal.root?.period_label || "Annual"})
                  </span>
                  <div className="text-2xl font-black text-foreground flex items-baseline gap-2 mt-0.5">
                    <span>{Number(proposal.annual_target || 0).toLocaleString()}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{unitSymbol}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block mb-1">Proposal Status</span>
                  {statusBadge(proposal.status)}
                </div>
              </div>

              {proposal.submission_notes && (
                <div className="text-xs bg-card/80 p-2.5 rounded-lg border">
                  <span className="font-semibold text-muted-foreground block mb-0.5">Company Notes:</span>
                  <p className="italic text-foreground">{proposal.submission_notes}</p>
                </div>
              )}

              {proposal.submitted_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Submitted on {new Date(proposal.submitted_at).toLocaleDateString()} at{" "}
                    {new Date(proposal.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>

            {/* Periodic Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Period Target Allocation Breakdown
                </h4>
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  Total Allocated:{" "}
                  <strong className="text-foreground">
                    {periods
                      .reduce((acc: number, p: any) => acc + Number(p.target_quantity || 0), 0)
                      .toLocaleString()}{" "}
                    {unitSymbol}
                  </strong>
                </span>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Period</th>
                      <th className="py-2 px-3 text-left font-medium">Dates</th>
                      <th className="py-2 px-3 text-right font-medium">Allocated Target ({unitSymbol})</th>
                      <th className="py-2 px-3 text-right font-medium">% of Annual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {periods.map((p: any, idx: number) => {
                      const qty = Number(p.target_quantity || 0);
                      const annual = Number(proposal.annual_target || 1);
                      const pct = annual > 0 ? ((qty / annual) * 100).toFixed(1) : "0";

                      return (
                        <tr key={p.target_id || idx} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-semibold">{p.period_identifier || p.period_label}</td>
                          <td className="py-2 px-3 text-muted-foreground text-[11px]">
                            {p.start_date} to {p.end_date}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                            {qty.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Department Allocations if any */}
            {allDeptAllocations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Department / Organizational Distribution
                </h4>
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium">Department</th>
                        <th className="py-2 px-3 text-left font-medium">Period</th>
                        <th className="py-2 px-3 text-right font-medium">Target ({unitSymbol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {allDeptAllocations.map((d: any, idx: number) => (
                        <tr key={d.target_id || idx} className="hover:bg-muted/20">
                          <td className="py-2 px-3 font-semibold">{d.companyStructure?.name || "Department"}</td>
                          <td className="py-2 px-3 text-muted-foreground">{d.period_identifier || d.period_label}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {Number(d.target_quantity || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Approval History Audit Trail */}
            {history.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Approval & Review History
                </h4>
                <div className="rounded-xl border p-3 bg-muted/20 space-y-2 text-xs">
                  {history.map((h: any, idx: number) => (
                    <div key={h.history_id || idx} className="flex items-start gap-2 text-[11px] pb-2 border-b last:border-b-0 last:pb-0">
                      <div className="mt-0.5">
                        {h.decision === "approved" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : h.decision === "revision_requested" ? (
                          <RotateCcw className="w-3.5 h-3.5 text-orange-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-foreground">
                            {h.action?.replace("_", " ") || h.decision}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(h.created_at).toLocaleString()}
                          </span>
                        </div>
                        {h.comments && <p className="text-muted-foreground mt-0.5 italic">"{h.comments}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Decision Form */}
            <div className="border-t pt-4 space-y-3">
              <label className="block text-xs font-bold text-foreground">
                Review Comments & Feedback
              </label>
              <Textarea
                rows={3}
                placeholder="Enter feedback, revision instructions, or approval notes for the company..."
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewAction("rejected")}
                    disabled={isSubmittingReview}
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:hover:bg-red-950/30"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewAction("revision_requested")}
                    disabled={isSubmittingReview}
                    className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:hover:bg-orange-950/30"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Request Revision
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleReviewAction("approved")}
                    disabled={isSubmittingReview}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {isSubmittingReview ? "Processing..." : "Approve Target"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
