"use client";

import PlanNodeDetailView from "@/features/plan-management/PlanNodeDetailView";
import { useParams } from "next/navigation";

export default function PlanReviewNodeDetailPage() {
    const params = useParams();
    const versionId = params.id as string;
    const nodeId = params.nodeId as string;

    return <PlanNodeDetailView versionId={versionId} nodeId={nodeId} mode="review" />;
}
