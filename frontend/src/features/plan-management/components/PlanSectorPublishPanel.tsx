"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { actionFeedback } from "@/components/action-feedback";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { PLAN_PUBLISH_SECTOR_AGGREGATION_PERMISSIONS } from "@/utils/planPermissionUtils";
import { usePlanAchievementScope } from "@/hooks/usePlanAchievementScope";
import {
  useGetSectorAggregationPublishesQuery,
  usePublishSectorAggregationMutation,
  useRejectSectorAggregationPublishMutation,
} from "@/redux/api/planApi";

interface PlanSectorPublishPanelProps {
  versionId: string;
}

export function PlanSectorPublishPanel({ versionId }: PlanSectorPublishPanelProps) {
  const { hasSectorPublishGate, canPublishSectorBranch, isReady } = usePlanAchievementScope();
  const { data, isLoading } = useGetSectorAggregationPublishesQuery(versionId, {
    skip: !isReady || !hasSectorPublishGate,
  });
  const [publishSector, { isLoading: isPublishing }] = usePublishSectorAggregationMutation();
  const [rejectPublish, { isLoading: isRejecting }] = useRejectSectorAggregationPublishMutation();

  if (!isReady || !hasSectorPublishGate) {
    return null;
  }

  const gatedBranches = (data?.branches ?? []).filter((branch) => branch.has_gate);
  if (!isLoading && gatedBranches.length === 0) {
    return null;
  }

  const handlePublish = async (externalAssignmentId: string) => {
    try {
      await publishSector({
        versionId,
        external_assignment_id: externalAssignmentId,
      }).unwrap();
      actionFeedback.success("Sector package published for parent aggregation");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to publish sector aggregation");
    }
  };

  const handleReject = async (externalAssignmentId: string) => {
    if (
      !(await actionFeedback.confirm(
        "Clear this sector publish so it no longer counts toward parent structures?",
        { destructive: true }
      ))
    ) {
      return;
    }

    try {
      await rejectPublish({
        versionId,
        external_assignment_id: externalAssignmentId,
      }).unwrap();
      actionFeedback.success("Sector publish cleared");
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err.data?.message || "Failed to clear sector publish");
    }
  };

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3 space-y-3">
      <div>
        <p className="text-sm font-medium text-indigo-950">
          Sector aggregation — structure to structure
        </p>
        <p className="text-xs text-indigo-900/90 mt-1">
          Validation stays inside the sector. Finalize publishes the sector package so parent
          structures can aggregate it.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-indigo-800">Loading sector branches…</p>
      ) : (
        <ul className="space-y-2">
          {gatedBranches.map((branch) => {
            const canAct = canPublishSectorBranch(branch.external_assignment_id);
            const statusLabel =
              branch.status === "published"
                ? "Published"
                : branch.status === "rejected"
                  ? "Not published"
                  : "Pending finalize";

            return (
              <li
                key={branch.external_assignment_id}
                className="flex flex-col gap-2 rounded-md border border-indigo-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {branch.government_structure_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        branch.status === "published"
                          ? "border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px]"
                          : "border-amber-200 text-amber-800 bg-amber-50 text-[10px]"
                      }
                    >
                      {statusLabel}
                    </Badge>
                    {branch.status !== "published" && (
                      <span className="text-[10px] text-amber-800">
                        Parent structure rollup waiting
                      </span>
                    )}
                    {branch.status === "published" && (
                      <span className="text-[10px] text-emerald-800">
                        Included in parent aggregation
                      </span>
                    )}
                    {branch.published_at && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(branch.published_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {canAct && (
                  <PermissionGuard requireAll={PLAN_PUBLISH_SECTOR_AGGREGATION_PERMISSIONS}>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {branch.status !== "published" ? (
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={isPublishing || isRejecting}
                          onClick={() => void handlePublish(branch.external_assignment_id)}
                        >
                          Finalize for parent
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={isPublishing || isRejecting}
                          onClick={() => void handleReject(branch.external_assignment_id)}
                        >
                          Clear publish
                        </Button>
                      )}
                    </div>
                  </PermissionGuard>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
