"use client";

import { useState } from "react";
import { ArrowLeft, History, Lock, Unlock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { actionFeedback } from "@/components/action-feedback";
import {
  useGetEditorSessionQuery,
  useUpdateDocumentStatusMutation,
} from "@/redux/api/collaborationApi";
import { DocumentEditor } from "./DocumentEditor";
import { DocumentVersionHistory } from "./DocumentVersionHistory";

interface DocumentEditorPageProps {
  documentId: string;
  backHref?: string;
}

export default function DocumentEditorPage({
  documentId,
  backHref = "/documents",
}: DocumentEditorPageProps) {
  const router = useRouter();
  const [versionsOpen, setVersionsOpen] = useState(false);
  const { data: session, isLoading, isError, error, refetch } = useGetEditorSessionQuery(documentId);
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateDocumentStatusMutation();

  const handleStatusChange = async (status: "draft" | "finalized") => {
    const message =
      status === "finalized"
        ? "Finalize this document? It will become read-only for editors."
        : "Reopen this document for editing?";

    if (!(await actionFeedback.confirm(message, { destructive: status === "finalized" }))) {
      return;
    }

    try {
      await updateStatus({ id: documentId, status }).unwrap();
      actionFeedback.success(status === "finalized" ? "Document finalized" : "Document reopened");
      refetch();
    } catch (statusError: any) {
      actionFeedback.error(statusError?.data?.message || "Failed to update document status");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  if (isError || !session) {
    const errorMessage =
      (error as { data?: { message?: string }; error?: string })?.data?.message ||
      (error as { error?: string })?.error ||
      "Unable to open this document. Check that the backend (port 4000) and ONLYOFFICE are running.";

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push(backHref)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" className="px-0" onClick={() => router.push(backHref)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{session.document.title}</h1>
            <Badge variant="secondary">{session.access.mode}</Badge>
            <Badge variant={session.document.status === "finalized" ? "default" : "outline"}>
              {session.document.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {session.document.version_number} · {session.document.file_type.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setVersionsOpen(true)}>
            <History className="mr-2 h-4 w-4" />
            Versions
          </Button>
          {session.access.canFinalize ? (
            <Button
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange("finalized")}
            >
              <Lock className="mr-2 h-4 w-4" />
              Finalize
            </Button>
          ) : null}
          {session.access.canUnfinalize ? (
            <Button
              variant="outline"
              disabled={isUpdatingStatus}
              onClick={() => handleStatusChange("draft")}
            >
              <Unlock className="mr-2 h-4 w-4" />
              Reopen
            </Button>
          ) : null}
        </div>
      </div>

      <DocumentEditor session={session} />

      <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Version history</SheetTitle>
            <SheetDescription>
              {session.document.title} · current v{session.document.version_number}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <DocumentVersionHistory
              documentId={documentId}
              documentTitle={session.document.title}
              fileName={session.document.file_name}
              fileType={session.document.file_type}
              currentVersion={session.document.version_number}
              access={session.access}
              onRestored={() => {
                refetch();
                setVersionsOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
