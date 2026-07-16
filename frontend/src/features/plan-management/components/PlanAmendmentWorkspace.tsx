"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, Plus, Target } from "lucide-react";
import type { ActionButton } from "@/types/tableLayout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PLAN_ANNUAL_TARGET_REVISION_TAB_PERMISSIONS,
  PLAN_REQUEST_AMENDMENT_PERMISSIONS,
  PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS,
  PLAN_TARGET_REALLOCATION_TAB_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { TargetReallocationRequestTable } from "./TargetReallocationRequestTable";
import { AnnualTargetRevisionRequestTable } from "./AnnualTargetRevisionRequestTable";
import { TargetReallocationRequestModal } from "./TargetReallocationRequestModal";
import { AnnualTargetRevisionRequestModal } from "./AnnualTargetRevisionRequestModal";
import { TargetReallocationRequestDetail } from "./TargetReallocationRequestDetail";
import { AnnualTargetRevisionRequestDetail } from "./AnnualTargetRevisionRequestDetail";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";

export type PlanAmendmentSubTab =
  | "target_reallocation"
  | "annual_target_revision";

type DetailView =
  | { kind: "target_reallocation"; id: string }
  | { kind: "annual_target_revision"; id: string }
  | null;

type PlanAmendmentWorkspaceProps = {
  draftId: string;
  annualVersionId: string;
  className?: string;
};

export function PlanAmendmentWorkspace({
  draftId,
  annualVersionId,
  className,
}: PlanAmendmentWorkspaceProps) {
  const searchParams = useSearchParams();
  const { canAny } = usePermissions();

  const canSeeReallocation = canAny(PLAN_TARGET_REALLOCATION_TAB_PERMISSIONS);
  const canSeeAnnualRevision = canAny(
    PLAN_ANNUAL_TARGET_REVISION_TAB_PERMISSIONS
  );
  const canRequestReallocation = canAny(
    PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS
  );
  const canRequestAnnualRevision = canAny(PLAN_REQUEST_AMENDMENT_PERMISSIONS);

  const resolveInitialSubTab = (): PlanAmendmentSubTab => {
    const focus = searchParams.get("focus");
    const amendmentType = searchParams.get("amendmentType");
    if (
      (focus === "annual-target-revision" ||
        amendmentType === "annual_target_revision") &&
      canSeeAnnualRevision
    ) {
      return "annual_target_revision";
    }
    if (
      (focus === "reallocation" || amendmentType === "target_reallocation") &&
      canSeeReallocation
    ) {
      return "target_reallocation";
    }
    if (canSeeReallocation) return "target_reallocation";
    return "annual_target_revision";
  };

  const [subTab, setSubTab] = useState<PlanAmendmentSubTab>(resolveInitialSubTab);
  const [detail, setDetail] = useState<DetailView>(null);
  const [reallocationModalOpen, setReallocationModalOpen] = useState(false);
  const [annualRevisionModalOpen, setAnnualRevisionModalOpen] = useState(false);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "reallocation" && canSeeReallocation) {
      setSubTab("target_reallocation");
    } else if (focus === "annual-target-revision" && canSeeAnnualRevision) {
      setSubTab("annual_target_revision");
    }
  }, [searchParams, canSeeReallocation, canSeeAnnualRevision]);

  useEffect(() => {
    setDetail(null);
  }, [subTab]);

  useEffect(() => {
    if (!canSeeReallocation && canSeeAnnualRevision) {
      setSubTab("annual_target_revision");
    } else if (canSeeReallocation && !canSeeAnnualRevision) {
      setSubTab("target_reallocation");
    }
  }, [canSeeReallocation, canSeeAnnualRevision]);

  const { data: draftVersion } = useGetPlanVersionByIdQuery(draftId, {
    skip: !draftId,
  });
  const liveDraftId =
    draftVersion?.live_master_version_id ||
    draftVersion?.execution_snapshot_of_version_id ||
    draftId;

  const sideActions = useMemo(() => {
    const tabs: ActionButton[] = [];
    if (canSeeReallocation) {
      tabs.push({
        label: "Target Reallocation",
        icon: <ArrowLeftRight className="h-4 w-4" />,
        variant: subTab === "target_reallocation" ? "default" : "outline",
        size: "default",
        onClick: () => setSubTab("target_reallocation"),
      });
    }
    if (canSeeAnnualRevision) {
      tabs.push({
        label: "Annual Target Revision",
        icon: <Target className="h-4 w-4" />,
        variant: subTab === "annual_target_revision" ? "default" : "outline",
        size: "default",
        onClick: () => setSubTab("annual_target_revision"),
      });
    }
    return tabs;
  }, [canSeeReallocation, canSeeAnnualRevision, subTab]);

  const actions = useMemo(() => {
    const list: ActionButton[] = [];
    if (subTab === "target_reallocation" && canRequestReallocation) {
      list.push({
        label: "Add Target Reallocation",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => setReallocationModalOpen(true),
        permissions: PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS,
      });
    }
    if (subTab === "annual_target_revision" && canRequestAnnualRevision) {
      list.push({
        label: "Add Annual Target Revision",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => setAnnualRevisionModalOpen(true),
        permissions: PLAN_REQUEST_AMENDMENT_PERMISSIONS,
      });
    }
    return list;
  }, [
    subTab,
    canRequestReallocation,
    canRequestAnnualRevision,
  ]);

  if (!canSeeReallocation && !canSeeAnnualRevision) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view plan amendments.
      </p>
    );
  }

  if (detail?.kind === "target_reallocation") {
    return (
      <div className={className}>
        <TargetReallocationRequestDetail
          draftId={liveDraftId}
          requestId={detail.id}
          onBack={() => setDetail(null)}
        />
      </div>
    );
  }

  if (detail?.kind === "annual_target_revision") {
    return (
      <div className={className}>
        <AnnualTargetRevisionRequestDetail
          amendmentId={detail.id}
          onBack={() => setDetail(null)}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-primary">Plan Amendment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Request and review target reallocations and annual target revisions
          after execution has started.
        </p>
      </div>

      {subTab === "target_reallocation" ? (
        <TargetReallocationRequestTable
          draftId={liveDraftId}
          sideActions={sideActions}
          actions={actions}
          onViewRequest={(id) =>
            setDetail({ kind: "target_reallocation", id })
          }
        />
      ) : (
        <AnnualTargetRevisionRequestTable
          draftId={liveDraftId}
          sideActions={sideActions}
          actions={actions}
          onViewRequest={(id) =>
            setDetail({ kind: "annual_target_revision", id })
          }
        />
      )}

      <TargetReallocationRequestModal
        open={reallocationModalOpen}
        onOpenChange={setReallocationModalOpen}
        draftId={liveDraftId}
        annualVersionId={annualVersionId}
      />
      <AnnualTargetRevisionRequestModal
        open={annualRevisionModalOpen}
        onOpenChange={setAnnualRevisionModalOpen}
        draftId={liveDraftId}
        annualVersionId={annualVersionId}
      />
    </div>
  );
}
