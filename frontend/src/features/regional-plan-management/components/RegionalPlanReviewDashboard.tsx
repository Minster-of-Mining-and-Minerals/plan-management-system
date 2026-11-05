"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetRegionalPlanReviewDashboardQuery } from "@/redux/api/regionalPlanApi";

interface RegionalPlanReviewDashboardProps {
  versionId: string;
  regionId: string;
}

export function RegionalPlanReviewDashboard({
  versionId,
  regionId,
}: RegionalPlanReviewDashboardProps) {
  const router = useRouter();

  const { data, isLoading, refetch } = useGetRegionalPlanReviewDashboardQuery(
    { id: versionId, region_id: regionId },
    { skip: !versionId || !regionId }
  );

  const stats = data?.stats ?? {
    total: 0,
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    resolved: 0,
  };

  const version = data?.version;
  const reviewStatus = version?.review_status;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading01 />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and status banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            Regional Plan Review Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track reviewer findings, issue resolution, and review workflow status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {reviewStatus && (
            <Badge
              variant="outline"
              className={
                reviewStatus === "in_review"
                  ? "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 capitalize text-sm px-3 py-1"
                  : reviewStatus === "review_completed" || reviewStatus === "approved"
                  ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize text-sm px-3 py-1"
                  : reviewStatus === "revision_requested"
                  ? "border-orange-500/30 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 capitalize text-sm px-3 py-1"
                  : "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 capitalize text-sm px-3 py-1"
              }
            >
              {reviewStatus.replace(/_/g, " ")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shadow-xs"
            onClick={() => router.push(`/regions/${regionId}/plans/review`)}
          >
            <span>Review Table</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Review Status Guidance Box */}
      {reviewStatus === "in_review" ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Plan is actively undergoing review
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Regional reviewers are inspecting plan nodes and raising findings. Once all findings are addressed, complete and approve the review from the Annual Execution tab to proceed to Start Process.
          </p>
        </div>
      ) : reviewStatus === "revision_requested" ? (
        <div className="rounded-xl border border-orange-300 dark:border-orange-700/50 bg-orange-50/70 dark:bg-orange-950/20 p-4 text-sm text-orange-900 dark:text-orange-200 space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            Review corrections unlocked
          </p>
          <p className="text-xs text-orange-800 dark:text-orange-300">
            Apply the necessary revisions or corrections to the plan draft, then republish for review.
          </p>
        </div>
      ) : reviewStatus === "review_completed" || reviewStatus === "approved" ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 text-sm text-emerald-900 dark:text-emerald-200 space-y-1">
          <p className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Plan review completed
          </p>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            All review findings have been resolved or closed. You can now start the operational execution process from the Annual Execution tab.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This plan draft has not been published for review yet. Finalize annual and period target allocation, then use &quot;Publish for Review&quot; in the Annual Execution tab.
        </div>
      )}

      {/* Review Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Issues</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400">Submitted</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.submitted}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-400">Under Review</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.under_review}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-400">Accepted</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{stats.accepted}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-rose-700 dark:text-rose-400">Rejected</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Review Information Note */}
      <Card className="border shadow-2xs">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Review Lifecycle Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>
            1. <strong>Annual & Period Targets Finalization:</strong> Master plan target distribution across years and periods must be finalized before review publication.
          </p>
          <p>
            2. <strong>Publish for Review:</strong> Initiates review mode, locking planning edits and notifying assigned regional reviewers.
          </p>
          <p>
            3. <strong>Issue Resolution:</strong> Reviewers submit findings; the planning team addresses or rejects them.
          </p>
          <p>
            4. <strong>Complete Review:</strong> Approves the plan review and enables operational process initiation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
