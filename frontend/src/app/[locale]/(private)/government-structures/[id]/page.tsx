"use client";

import React from "react";
import { useParams } from "next/navigation";
import GovernmentStructureDetail from "@/features/structure-management/GovernmentStructureDetail";

export default function GovernmentStructureDetailPage() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="space-y-6">
            <GovernmentStructureDetail id={id} />
        </div>
    );
}
