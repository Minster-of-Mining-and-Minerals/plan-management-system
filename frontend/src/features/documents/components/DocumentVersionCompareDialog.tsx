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
import { DocumentEditor } from "./DocumentEditor";

interface DocumentVersionCompareDialogProps {
  documentId: string;
  documentTitle: string;
  leftVersion: number | null;
  rightVersion: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ComparePane({
  documentId,
  documentTitle,
  versionNumber,
  side,
  enabled,
}: {
  documentId: string;
  documentTitle: string;
  versionNumber: number;
  side: "left" | "right";
  enabled: boolean;
}) {
  const { data: session, isLoading, isError, error } = useGetVersionEditorSessionQuery(
    { id: documentId, versionNumber },
    { skip: !enabled }
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="text-sm font-medium">
        {documentTitle} · v{versionNumber}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({side === "left" ? "older" : "newer"} selection)
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {isLoading ? (
          <Loading01 />
        ) : isError || !session ? (
          <div className="p-4 text-sm text-destructive">
            {(error as { data?: { message?: string } })?.data?.message ||
              "Unable to load this version."}
          </div>
        ) : (
          <DocumentEditor
            key={`compare-${side}-v${versionNumber}`}
            session={session}
            editorId={`onlyoffice-compare-${side}-v${versionNumber}`}
            heightClassName="h-[68vh]"
            showFullscreenToggle={false}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}

export function DocumentVersionCompareDialog({
  documentId,
  documentTitle,
  leftVersion,
  rightVersion,
  open,
  onOpenChange,
}: DocumentVersionCompareDialogProps) {
  const canCompare = leftVersion !== null && rightVersion !== null && leftVersion !== rightVersion;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[96vh] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Compare versions</DialogTitle>
          <DialogDescription>
            Side-by-side read-only preview of v{leftVersion} and v{rightVersion}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden px-4 py-4 lg:grid-cols-2">
          {canCompare ? (
            <>
              <ComparePane
                documentId={documentId}
                documentTitle={documentTitle}
                versionNumber={Math.min(leftVersion!, rightVersion!)}
                side="left"
                enabled={open}
              />
              <ComparePane
                documentId={documentId}
                documentTitle={documentTitle}
                versionNumber={Math.max(leftVersion!, rightVersion!)}
                side="right"
                enabled={open}
              />
            </>
          ) : (
            <div className="col-span-full p-6 text-sm text-muted-foreground">
              Select two different versions to compare.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
