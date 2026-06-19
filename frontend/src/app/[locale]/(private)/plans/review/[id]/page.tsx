"use client";

import PlanHierarchyView from "@/features/plan-management/PlanHierarchyView";
import { useParams } from "next/navigation";

export default function PlanReviewDetailsPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="space-y-6">
            <PlanHierarchyView versionId={id} mode="review" />
        </div>
    );
}
