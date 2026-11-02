"use client";

import React, { use } from "react";
import { RegionalCreateIssueForm } from "@/features/regional-issues/RegionalCreateIssueForm";

export default function NewRegionalIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const regionId = resolvedParams.id;

  return (
    <div className="py-2">
      <RegionalCreateIssueForm regionId={regionId} />
    </div>
  );
}

