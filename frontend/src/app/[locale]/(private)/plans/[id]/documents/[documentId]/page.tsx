"use client";

import { useParams } from "next/navigation";
import DocumentEditorPage from "@/features/documents/components/DocumentEditorPage";

export default function PlanDocumentEditorPage() {
  const params = useParams();
  const planVersionId = params.id as string;
  const documentId = params.documentId as string;

  return (
    <DocumentEditorPage
      documentId={documentId}
      backHref={`/plans/${planVersionId}/documents`}
    />
  );
}
