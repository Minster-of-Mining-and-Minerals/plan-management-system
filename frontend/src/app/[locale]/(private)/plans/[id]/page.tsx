"use client";

import React from 'react'
import PlanHierarchyView from '@/features/plan-management/PlanHierarchyView'
import { useParams } from 'next/navigation'

function PlanDetailsPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="space-y-6">
            <PlanHierarchyView versionId={id} />
        </div>
    )
}

export default PlanDetailsPage
