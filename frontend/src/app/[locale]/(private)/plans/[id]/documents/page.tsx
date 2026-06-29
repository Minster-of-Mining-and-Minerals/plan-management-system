"use client";

import { useParams } from "next/navigation";
import DocumentList from "@/features/documents/components/DocumentList";

export default function PlanDocumentsPage() {
  const params = useParams();
  const planVersionId = params.id as string;

  return (
    <DocumentList
      ownerType="plan_version"
      ownerId={planVersionId}
      editorBasePath={`/plans/${planVersionId}/documents`}
      title="Plan Documents"
    />
  );
}
