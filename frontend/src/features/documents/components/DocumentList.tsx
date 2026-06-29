"use client";

import { useRef, useState } from "react";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { actionFeedback } from "@/components/action-feedback";
import Loading01 from "@/features/template/component/Loading/Loading01";
import {
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentsQuery,
} from "@/redux/api/collaborationApi";
import type { DocumentOwnerType } from "@/redux/types/document";

const ACCEPTED_FILE_TYPES = ".docx,.xlsx,.pptx,.pdf";

interface DocumentListProps {
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  editorBasePath?: string;
  title?: string;
}

export default function DocumentList({
  ownerType = "standalone",
  ownerId,
  editorBasePath = "/documents",
  title = "Documents",
}: DocumentListProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const { data: documents, isLoading } = useGetDocumentsQuery({
    ownerApp: "plan-management",
    ownerType,
    ownerId,
  });
  const [createDocument, { isLoading: isCreating }] = useCreateDocumentMutation();
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      actionFeedback.error("Title is required");
      return;
    }

    try {
      const document = await createDocument({
        title: newTitle.trim(),
        ownerApp: "plan-management",
        ownerType,
        ownerId,
      }).unwrap();
      setNewTitle("");
      router.push(`${editorBasePath}/${document.document_id}`);
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to create document");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const title = file.name.replace(/\.[^.]+$/, "") || "Uploaded document";

    try {
      const document = await createDocument({
        title,
        ownerApp: "plan-management",
        ownerType,
        ownerId,
        file,
      }).unwrap();
      router.push(`${editorBasePath}/${document.document_id}`);
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to upload document");
    } finally {
      event.target.value = "";
    }
  };

  const handleDelete = async (documentId: string, documentTitle: string) => {
    if (
      !(await actionFeedback.confirm(`Delete "${documentTitle}"? This cannot be undone.`, {
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      await deleteDocument(documentId).unwrap();
      actionFeedback.success("Document deleted");
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to delete document");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Create and collaborate on office documents in real time.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New document</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Document title"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Create blank
            </Button>
            <Button
              variant="outline"
              disabled={isCreating}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(documents || []).map((document) => (
          <Card key={document.document_id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{document.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    v{document.version_number} · {document.file_type}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={document.status === "finalized" ? "secondary" : "outline"}>
                      {document.status}
                    </Badge>
                    {document.access?.mode === "view" ? (
                      <Badge variant="outline">read-only</Badge>
                    ) : null}
                  </div>
                </div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="mt-auto flex gap-2">
              <Button
                className="flex-1"
                onClick={() => router.push(`${editorBasePath}/${document.document_id}`)}
              >
                Open
              </Button>
              {document.access?.canDelete ? (
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isDeleting}
                  onClick={() => handleDelete(document.document_id, document.title)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {!documents?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No documents yet. Create one or upload a file to start collaborating.
        </div>
      ) : null}
    </div>
  );
}
