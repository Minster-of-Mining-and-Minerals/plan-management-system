"use client";

import React from "react";
import { useParams } from "next/navigation";
import StructureDetail from "@/features/structure-management/StructureDetail";

export default function StructureDetailPage() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="space-y-6">
            <StructureDetail id={id} />
        </div>
    );
}
