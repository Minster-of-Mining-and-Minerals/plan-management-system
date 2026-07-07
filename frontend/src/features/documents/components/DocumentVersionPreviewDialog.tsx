"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { useGetVersionEditorSessionQuery } from "@/redux/api/collaborationApi";
import type { DocumentVersion } from "@/redux/types/document";
import { DocumentEditor } from "./DocumentEditor";

interface DocumentVersionPreviewDialogProps {
  documentId: string;
  version: DocumentVersion | null;
  documentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DocumentVersionPreviewDialog({
  documentId,
  version,
  documentTitle,
  open,
  onOpenChange,
}: DocumentVersionPreviewDialogProps) {
  const versionNumber = version?.version_number ?? 0;
  const { data: session, isLoading, isError, error } = useGetVersionEditorSessionQuery(
    { id: documentId, versionNumber },
    { skip: !open || !version }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[96vh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {documentTitle} · Version {version?.version_number}
          </DialogTitle>
          <DialogDescription>
            Read-only preview of this snapshot
            {version ? ` · saved ${formatSavedAt(version.created_at)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
          {isLoading ? (
            <Loading01 />
          ) : isError || !session ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {(error as { data?: { message?: string } })?.data?.message ||
                "Unable to load this version preview."}
            </div>
          ) : (
            <DocumentEditor
              key={`version-preview-${versionNumber}`}
              session={session}
              editorId={`onlyoffice-editor-v${versionNumber}`}
              heightClassName="h-full min-h-[75vh]"
              showFullscreenToggle
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
