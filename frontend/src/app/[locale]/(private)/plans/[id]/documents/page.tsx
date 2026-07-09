"use client";

import { useParams } from "next/navigation";
import DocumentList from "@/features/documents/components/DocumentList";
import { PlanVersionSubNav } from "@/features/plan-management/components/PlanVersionSubNav";
import { useBreadcrumbTitleEffect } from "@/hooks/useBreadcrumbTitleEffect";
import { useGetPlanVersionByIdQuery } from "@/redux/api/planApi";
import { getPlanDraftDisplayName } from "@/utils/planDraftUtils";

export default function PlanDocumentsPage() {
  const params = useParams();
  const planVersionId = params.id as string;
  const { data: planVersion } = useGetPlanVersionByIdQuery(planVersionId);

  const planName = planVersion ? getPlanDraftDisplayName(planVersion) : undefined;
  useBreadcrumbTitleEffect(planName, planVersionId);

  return (
    <div className="space-y-6">
      <PlanVersionSubNav versionId={planVersionId} mode="draft" />
      <DocumentList
        ownerType="plan_version"
        ownerId={planVersionId}
        editorBasePath={`/plans/${planVersionId}/documents`}
        title="Plan Documents"
        description={
          planName
            ? `Documents linked to ${planName}.`
            : "Documents linked to this plan draft."
        }
      />
    </div>
  );
}
