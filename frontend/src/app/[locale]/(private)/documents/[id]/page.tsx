"use client";

import { useParams } from "next/navigation";
import DocumentEditorPage from "@/features/documents/components/DocumentEditorPage";

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id as string;

  return <DocumentEditorPage documentId={documentId} backHref="/documents" />;
}
