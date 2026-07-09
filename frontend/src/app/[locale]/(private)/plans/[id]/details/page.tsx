"use client";

import { useParams } from "next/navigation";
import { PlanVersionDetailsView } from "@/features/plan-management/PlanVersionDetailsView";
import { PlanVersionSubNav } from "@/features/plan-management/components/PlanVersionSubNav";
import { useBreadcrumbTitleEffect } from "@/hooks/useBreadcrumbTitleEffect";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import { getPlanDraftDisplayName } from "@/utils/planDraftUtils";

export default function PlanDetailsPage() {
  const params = useParams();
  const planVersionId = params.id as string;
  const { data: planVersion } = useGetPlanVersionByIdQuery(planVersionId);

  const planName = planVersion ? getPlanDraftDisplayName(planVersion) : undefined;
  useBreadcrumbTitleEffect(planName, planVersionId);

  return (
    <div className="space-y-6">
      <PlanVersionSubNav versionId={planVersionId} mode="draft" />
      <PlanVersionDetailsView versionId={planVersionId} mode="draft" />
    </div>
  );
}
