"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, Plus, PlusCircle, Target } from "lucide-react";
import type { ActionButton } from "@/types/tableLayout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PLAN_ANNUAL_TARGET_REVISION_TAB_PERMISSIONS,
  PLAN_KPI_ADDITION_TAB_PERMISSIONS,
  PLAN_REQUEST_AMENDMENT_PERMISSIONS,
  PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS,
  PLAN_TARGET_REALLOCATION_TAB_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { TargetReallocationRequestTable } from "./TargetReallocationRequestTable";
import { AnnualTargetRevisionRequestTable } from "./AnnualTargetRevisionRequestTable";
import { KpiAdditionRequestTable } from "./KpiAdditionRequestTable";
import { TargetReallocationRequestModal } from "./TargetReallocationRequestModal";
import { AnnualTargetRevisionRequestModal } from "./AnnualTargetRevisionRequestModal";
import { KpiAdditionRequestModal } from "./KpiAdditionRequestModal";
import { TargetReallocationRequestDetail } from "./TargetReallocationRequestDetail";
import { AnnualTargetRevisionRequestDetail } from "./AnnualTargetRevisionRequestDetail";
import { KpiAdditionRequestDetail } from "./KpiAdditionRequestDetail";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";

export type PlanAmendmentSubTab =
  | "target_reallocation"
  | "annual_target_revision"
  | "kpi_addition";

type DetailView =
  | { kind: "target_reallocation"; id: string }
  | { kind: "annual_target_revision"; id: string }
  | { kind: "kpi_addition"; id: string }
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
  const canSeeKpiAddition = canAny(PLAN_KPI_ADDITION_TAB_PERMISSIONS);
  const canRequestReallocation = canAny(
    PLAN_REQUEST_TARGET_REALLOCATION_PERMISSIONS
  );
  const canRequestAnnualRevision = canAny(PLAN_REQUEST_AMENDMENT_PERMISSIONS);
  const canRequestKpiAddition = canAny(PLAN_REQUEST_AMENDMENT_PERMISSIONS);

  const visibleSubTabs = useMemo((): PlanAmendmentSubTab[] => {
    const tabs: PlanAmendmentSubTab[] = [];
    if (canSeeReallocation) tabs.push("target_reallocation");
    if (canSeeAnnualRevision) tabs.push("annual_target_revision");
    if (canSeeKpiAddition) tabs.push("kpi_addition");
    return tabs;
  }, [canSeeReallocation, canSeeAnnualRevision, canSeeKpiAddition]);

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
      (focus === "kpi-addition" || amendmentType === "kpi_addition") &&
      canSeeKpiAddition
    ) {
      return "kpi_addition";
    }
    if (
      (focus === "reallocation" || amendmentType === "target_reallocation") &&
      canSeeReallocation
    ) {
      return "target_reallocation";
    }
    return visibleSubTabs[0] ?? "target_reallocation";
  };

  const [subTab, setSubTab] = useState<PlanAmendmentSubTab>(resolveInitialSubTab);
  const [detail, setDetail] = useState<DetailView>(null);
  const [reallocationModalOpen, setReallocationModalOpen] = useState(false);
  const [annualRevisionModalOpen, setAnnualRevisionModalOpen] = useState(false);
  const [kpiAdditionModalOpen, setKpiAdditionModalOpen] = useState(false);

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "reallocation" && canSeeReallocation) {
      setSubTab("target_reallocation");
    } else if (focus === "annual-target-revision" && canSeeAnnualRevision) {
      setSubTab("annual_target_revision");
    } else if (focus === "kpi-addition" && canSeeKpiAddition) {
      setSubTab("kpi_addition");
    }
  }, [
    searchParams,
    canSeeReallocation,
    canSeeAnnualRevision,
    canSeeKpiAddition,
  ]);

  useEffect(() => {
    setDetail(null);
  }, [subTab]);

  useEffect(() => {
    if (visibleSubTabs.length === 0) return;
    if (!visibleSubTabs.includes(subTab)) {
      setSubTab(visibleSubTabs[0]);
    }
  }, [visibleSubTabs, subTab]);

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
    if (canSeeKpiAddition) {
      tabs.push({
        label: "KPI Addition",
        icon: <PlusCircle className="h-4 w-4" />,
        variant: subTab === "kpi_addition" ? "default" : "outline",
        size: "default",
        onClick: () => setSubTab("kpi_addition"),
      });
    }
    return tabs;
  }, [
    canSeeReallocation,
    canSeeAnnualRevision,
    canSeeKpiAddition,
    subTab,
  ]);

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
    if (subTab === "kpi_addition" && canRequestKpiAddition) {
      list.push({
        label: "Add KPI Addition",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: () => setKpiAdditionModalOpen(true),
        permissions: PLAN_REQUEST_AMENDMENT_PERMISSIONS,
      });
    }
    return list;
  }, [
    subTab,
    canRequestReallocation,
    canRequestAnnualRevision,
    canRequestKpiAddition,
  ]);

  if (visibleSubTabs.length === 0) {
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

  if (detail?.kind === "kpi_addition") {
    return (
      <div className={className}>
        <KpiAdditionRequestDetail
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
          Request and review target reallocations, annual target revisions, and
          KPI additions after execution has started.
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
      ) : subTab === "annual_target_revision" ? (
        <AnnualTargetRevisionRequestTable
          draftId={liveDraftId}
          sideActions={sideActions}
          actions={actions}
          onViewRequest={(id) =>
            setDetail({ kind: "annual_target_revision", id })
          }
        />
      ) : (
        <KpiAdditionRequestTable
          draftId={liveDraftId}
          sideActions={sideActions}
          actions={actions}
          onViewRequest={(id) => setDetail({ kind: "kpi_addition", id })}
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
      <KpiAdditionRequestModal
        open={kpiAdditionModalOpen}
        onOpenChange={setKpiAdditionModalOpen}
        draftId={liveDraftId}
        annualVersionId={annualVersionId}
      />
    </div>
  );
}
