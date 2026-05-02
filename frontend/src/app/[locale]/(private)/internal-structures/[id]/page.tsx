"use client";

import React from "react";
import { useParams } from "next/navigation";
import InternalStructureDetail from "@/features/structure-management/InternalStructureDetail";

export default function InternalStructureDetailPage() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="space-y-6">
            <InternalStructureDetail id={id} />
        </div>
    );
}
