"use client";

import { useState } from "react";
import { Download, Eye, GitCompare, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actionFeedback } from "@/components/action-feedback";
import {
  getDocumentVersionDownloadUrl,
  useGetDocumentVersionsQuery,
  useRestoreDocumentVersionMutation,
} from "@/redux/api/collaborationApi";
import type { DocumentAccess, DocumentVersion } from "@/redux/types/document";
import { DocumentVersionCompareDialog } from "./DocumentVersionCompareDialog";
import { DocumentVersionPreviewDialog } from "./DocumentVersionPreviewDialog";

interface DocumentVersionHistoryProps {
  documentId: string;
  documentTitle: string;
  fileName: string;
  fileType: string;
  currentVersion: number;
  access: DocumentAccess;
  onRestored?: () => void;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSavedBy(version: DocumentVersion) {
  if (version.saved_by_name) {
    return version.saved_by_email
      ? `${version.saved_by_name} (${version.saved_by_email})`
      : version.saved_by_name;
  }
  if (version.saved_by_email) return version.saved_by_email;
  if (version.saved_by) return version.saved_by;
  return "System";
}

async function downloadVersionFile(
  documentId: string,
  versionNumber: number,
  downloadName: string
) {
  const token = localStorage.getItem("authToken");
  const response = await fetch(getDocumentVersionDownloadUrl(documentId, versionNumber), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error("Failed to download version");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DocumentVersionHistory({
  documentId,
  documentTitle,
  fileName,
  fileType,
  currentVersion,
  access,
  onRestored,
}: DocumentVersionHistoryProps) {
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [detailVersion, setDetailVersion] = useState<DocumentVersion | null>(null);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const { data: versions, isLoading } = useGetDocumentVersionsQuery(documentId);
  const [restoreVersion, { isLoading: isRestoring }] = useRestoreDocumentVersionMutation();
  const baseName = fileName.replace(/\.[^.]+$/, "");

  const toggleCompareSelection = (versionNumber: number) => {
    setCompareSelection((current) => {
      if (current.includes(versionNumber)) {
        return current.filter((value) => value !== versionNumber);
      }
      if (current.length >= 2) {
        return [current[1], versionNumber];
      }
      return [...current, versionNumber];
    });
  };

  const handleDownload = async (versionNumber: number) => {
    try {
      setDownloadingVersion(versionNumber);
      await downloadVersionFile(
        documentId,
        versionNumber,
        `${baseName}-v${versionNumber}.${fileType}`
      );
    } catch {
      actionFeedback.error("Failed to download version");
    } finally {
      setDownloadingVersion(null);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (
      !(await actionFeedback.confirm(
        `Restore version ${versionNumber}? This creates a new version from the selected snapshot.`,
        { destructive: false }
      ))
    ) {
      return;
    }

    try {
      await restoreVersion({ id: documentId, versionNumber }).unwrap();
      actionFeedback.success(`Restored from version ${versionNumber}`);
      setDetailVersion(null);
      onRestored?.();
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to restore version");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading versions…</p>;
  }

  if (!versions?.length) {
    return <p className="text-sm text-muted-foreground">No versions recorded yet.</p>;
  }

  const canCompare =
    compareSelection.length === 2 && compareSelection[0] !== compareSelection[1];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Click a row for details. Select two versions to compare side by side.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!canCompare}
          onClick={() => setCompareOpen(true)}
        >
          <GitCompare className="mr-2 h-4 w-4" />
          Compare selected
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Version</TableHead>
            <TableHead>Saved at</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Saved by</TableHead>
            <TableHead className="w-[52px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => {
            const isCurrent = version.version_number === currentVersion;
            const isSelected = compareSelection.includes(version.version_number);

            return (
              <TableRow
                key={version.document_version_id}
                className="cursor-pointer"
                onClick={() => setDetailVersion(version)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCompareSelection(version.version_number)}
                    className="h-4 w-4 rounded border border-input"
                    aria-label={`Select version ${version.version_number} for compare`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">v{version.version_number}</span>
                    {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatSavedAt(version.created_at)}
                </TableCell>
                <TableCell>{formatFileSize(version.file_size)}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={formatSavedBy(version)}>
                  {formatSavedBy(version)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View document"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewVersion(version);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View document</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DocumentVersionPreviewDialog
        documentId={documentId}
        documentTitle={documentTitle}
        version={previewVersion}
        open={Boolean(previewVersion)}
        onOpenChange={(open) => {
          if (!open) setPreviewVersion(null);
        }}
      />

      <DocumentVersionCompareDialog
        documentId={documentId}
        documentTitle={documentTitle}
        leftVersion={canCompare ? compareSelection[0] : null}
        rightVersion={canCompare ? compareSelection[1] : null}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />

      <Dialog
        open={Boolean(detailVersion)}
        onOpenChange={(open) => {
          if (!open) setDetailVersion(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Version {detailVersion?.version_number}</DialogTitle>
            <DialogDescription>Details for this document snapshot.</DialogDescription>
          </DialogHeader>
          {detailVersion ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium">v{detailVersion.version_number}</dd>

              <dt className="text-muted-foreground">Status</dt>
              <dd>
                {detailVersion.version_number === currentVersion ? (
                  <Badge variant="secondary">Current</Badge>
                ) : (
                  <Badge variant="outline">Archived</Badge>
                )}
              </dd>

              <dt className="text-muted-foreground">Saved at</dt>
              <dd>{formatSavedAt(detailVersion.created_at)}</dd>

              <dt className="text-muted-foreground">File size</dt>
              <dd>{formatFileSize(detailVersion.file_size)}</dd>

              <dt className="text-muted-foreground">File type</dt>
              <dd className="uppercase">{fileType}</dd>

              <dt className="text-muted-foreground">Saved by</dt>
              <dd className="break-all">{formatSavedBy(detailVersion)}</dd>

              <dt className="text-muted-foreground">Version ID</dt>
              <dd className="break-all font-mono text-xs">{detailVersion.document_version_id}</dd>

              <dt className="text-muted-foreground">Document key</dt>
              <dd className="break-all font-mono text-xs">{detailVersion.document_key}</dd>
            </dl>
          ) : null}
          {detailVersion ? (
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreviewVersion(detailVersion)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
              <Button
                disabled={downloadingVersion === detailVersion.version_number}
                onClick={() => handleDownload(detailVersion.version_number)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              {access.canEdit && detailVersion.version_number !== currentVersion ? (
                <Button
                  variant="outline"
                  disabled={isRestoring}
                  onClick={() => handleRestore(detailVersion.version_number)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
