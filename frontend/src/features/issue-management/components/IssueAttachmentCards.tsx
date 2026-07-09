"use client";

import { useState } from "react";
import { Eye, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IssueAttachmentRef } from "@/redux/types/issue";
import { getFileType, getFileUrl } from "@/utils/fileUrl";

interface IssueAttachmentCardsProps {
  attachments: IssueAttachmentRef[];
}

export function IssueAttachmentCards({ attachments }: IssueAttachmentCardsProps) {
  const [previewFile, setPreviewFile] = useState<IssueAttachmentRef | null>(null);

  if (!attachments.length) {
    return <p className="mt-1 whitespace-pre-wrap">—</p>;
  }

  const previewUrl = previewFile ? getFileUrl(previewFile.file_path) : null;
  const previewType = previewFile ? getFileType(previewFile.file_name) : null;

  return (
    <>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {attachments.map((attachment) => {
          const url = getFileUrl(attachment.file_path);
          const fileType = getFileType(attachment.file_name);

          return (
            <div
              key={attachment.attachment_id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {fileType === "image" ? (
                  <img
                    src={url}
                    alt={attachment.file_name}
                    className="h-10 w-10 shrink-0 rounded border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-white">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate text-sm text-gray-700">{attachment.file_name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewFile(attachment)}
                className="h-8 w-8 shrink-0 text-primary hover:bg-muted"
              >
                <Eye className="h-5 w-5" />
              </Button>
            </div>
          );
        })}
      </div>

      {previewFile && previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative max-h-[min(90dvh,calc(100vh-2rem))] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full p-2 hover:bg-gray-200"
              onClick={() => setPreviewFile(null)}
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-4 pr-8 text-lg font-semibold">{previewFile.file_name}</h3>

            {previewType === "image" ? (
              <img
                src={previewUrl}
                alt={previewFile.file_name}
                className="max-h-[70vh] w-full object-contain"
              />
            ) : previewType === "pdf" ? (
              <iframe src={previewUrl} className="h-[70vh] w-full" title={previewFile.file_name} />
            ) : (
              <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
                <p>Preview is not available for this file type.</p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Open file in new tab
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
