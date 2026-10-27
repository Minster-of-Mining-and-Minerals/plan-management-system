"use client";

import { RegionalPlanNodeDetailView } from "@/features/regional-plan-management/RegionalPlanNodeDetailView";
import { useParams } from "next/navigation";

export default function RegionalPlanNodeDetailPage() {
  const params = useParams();
  const versionId = (params.versionId || params.id) as string;
  const nodeId = params.nodeId as string;

  return <RegionalPlanNodeDetailView versionId={versionId} nodeId={nodeId} />;
}
