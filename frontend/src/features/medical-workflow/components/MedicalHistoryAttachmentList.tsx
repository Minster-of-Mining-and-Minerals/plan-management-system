"use client";

import { useMemo, useState } from "react";
import { Eye, FileIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetAttachmentsQuery } from "@/redux/api/attachementApi";
import { getFileType } from "@/utils/fileUrl";
import type { UserFormConfigGrouped } from "@/redux/types/formField";
import {
  collectWorkflowFileRefs,
  isAttachmentUuid,
  resolveWorkflowFiles,
} from "../workflowAttachmentUtils";

type PreviewFile = {
  file_name: string;
  previewUrl?: string | null;
};

type Props = {
  attachmentIds: string[];
  formSchema?: UserFormConfigGrouped | null;
  formData?: Record<string, unknown>;
};

export function MedicalHistoryAttachmentList({
  attachmentIds,
  formSchema,
  formData,
}: Props) {
  const { data: attachmentsResponse, isLoading } = useGetAttachmentsQuery();
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const refs = useMemo(
    () => collectWorkflowFileRefs(attachmentIds, formSchema, formData),
    [attachmentIds, formSchema, formData]
  );

  const files = useMemo(() => {
    const catalog = attachmentsResponse?.attachments || [];
    return resolveWorkflowFiles(refs, catalog);
  }, [attachmentsResponse, refs]);

  const missingUuidCount = useMemo(() => {
    if (!attachmentsResponse) return 0;
    const resolvedKeys = new Set(files.map((f) => f.key));
    return refs.filter((r) => isAttachmentUuid(r) && !resolvedKeys.has(r)).length;
  }, [attachmentsResponse, refs, files]);

  if (!refs.length) return null;

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="border-b border-primary/10 bg-primary/5 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments ({refs.length})
          </p>
        </div>

        <div className="p-3">
          {isLoading && files.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading files…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Files could not be loaded.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {file.previewUrl && getFileType(file.file_name) === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.previewUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-muted">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="truncate text-sm font-medium text-foreground">
                      {file.file_name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setPreviewFile(file)}
                    title="Preview"
                    disabled={!file.previewUrl}
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {missingUuidCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {missingUuidCount} file{missingUuidCount !== 1 ? "s" : ""} unavailable
              (removed or not found).
            </p>
          )}
        </div>
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-background p-4 shadow-xl">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full p-2 hover:bg-muted"
              onClick={() => setPreviewFile(null)}
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-4 pr-10 text-lg font-semibold">{previewFile.file_name}</h3>

            {getFileType(previewFile.file_name) === "image" &&
              previewFile.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.file_name}
                  className="mx-auto max-h-[70vh] w-full object-contain"
                />
              )}

            {getFileType(previewFile.file_name) === "pdf" &&
              previewFile.previewUrl && (
                <iframe
                  src={previewFile.previewUrl}
                  className="h-[70vh] w-full rounded border"
                  title={previewFile.file_name}
                />
              )}

            {previewFile.previewUrl &&
              getFileType(previewFile.file_name) !== "image" &&
              getFileType(previewFile.file_name) !== "pdf" && (
                <div className="space-y-3 py-6 text-center">
                  <p className="text-muted-foreground">
                    Preview is not available for this file type.
                  </p>
                  <Button asChild variant="outline">
                    <a
                      href={previewFile.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open file
                    </a>
                  </Button>
                </div>
              )}

            {!previewFile.previewUrl && (
              <p className="text-muted-foreground">Cannot preview this file.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
