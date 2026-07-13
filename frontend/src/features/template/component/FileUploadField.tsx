"use client";
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadAttachmentsMutation,
  useDeleteAttachmentMutation,
  useGetAttachmentsQuery,
} from "@/redux/api/attachementApi";
import { getFileUrl, getFileType } from "@/utils/fileUrl";
import { modalOverlayClassName } from "@/lib/modalLayout";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  id: string;
  label: string;
  value: string[] | string;
  onChange: (value: string[] | string) => void;
  required?: boolean;
  accept?: string;
  error?: string;
  className?: string;
  labelClass?: string;
  fieldClass?: string;
  multiple?: boolean;
  showPreview?: boolean;
  hideLabel?: boolean;
  compact?: boolean;
  /**
   * attachmentIds: return uploaded attachment IDs
   * fileUrls: return uploaded file URLs
   */
  valueFormat?: "attachmentIds" | "fileUrls";
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  accept = "image/*,.pdf",
  error,
  className = "",
  labelClass = "",
  fieldClass = "",
  multiple = true,
  showPreview = true,
  hideLabel = false,
  compact = false,
  valueFormat = "attachmentIds",
}) => {
  const [uploadAttachments, { isLoading: isUploading }] =
    useUploadAttachmentsMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { data: attachmentsResponse } = useGetAttachmentsQuery();

  const [files, setFiles] = useState<
    {
      attachment_id: string;
      file_name: string;
      file_path?: string;
      previewUrl?: string | null;
    }[]
  >([]);
  const [previewFile, setPreviewFile] = useState<
    { file_name: string; previewUrl?: string | null } | null
  >(null);

  const normalizedValue = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  useEffect(() => {
    if (normalizedValue.length === 0) {
      setFiles([]);
      return;
    }

    if (valueFormat === "attachmentIds") {
      if (!attachmentsResponse) return;
      const all = attachmentsResponse.attachments || [];
      const mapped = normalizedValue
        .map((id) => all.find((a) => a.attachment_id === id))
        .filter(Boolean)
        .map((a) => ({
          attachment_id: a!.attachment_id,
          file_name: a!.file_name,
          file_path: a!.file_path,
          previewUrl: getFileUrl(a!.file_path),
        }));
      setFiles(mapped);
      return;
    }

    const inferred = normalizedValue.map((url, i) => {
      const fileName = decodeURIComponent(String(url).split("/").pop() || `file-${i + 1}`);
      return {
        attachment_id: `url-${i}-${fileName}`,
        file_name: fileName,
        previewUrl: String(url),
      };
    });
    setFiles(inferred);
  }, [attachmentsResponse, value, valueFormat]);

  const emitChange = (
    uploadedList: { attachment_id: string; file_path?: string }[]
  ) => {
    if (valueFormat === "attachmentIds") {
      const ids = uploadedList.map((f) => f.attachment_id);
      onChange(multiple ? ids : ids[0] || "");
      return;
    }
    const urls = uploadedList
      .map((f) => (f.file_path ? getFileUrl(f.file_path) : ""))
      .filter(Boolean);
    onChange(multiple ? urls : urls[0] || "");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      try {
        const result = await uploadAttachments({ files: [file] }).unwrap();
        if (result.attachments.length > 0) {
          const uploaded = result.attachments[0];
          return {
            attachment_id: uploaded.attachment_id,
            file_name: uploaded.file_name,
            file_path: uploaded.file_path,
            previewUrl: getFileUrl(uploaded.file_path),
          };
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
      return null;
    });

    const uploadedFiles = (await Promise.all(uploadPromises)).filter(Boolean) as {
      attachment_id: string;
      file_name: string;
      file_path?: string;
      previewUrl?: string | null;
    }[];

    if (!uploadedFiles.length) return;

    const updatedFiles = multiple ? [...files, ...uploadedFiles] : [uploadedFiles[0]];
    setFiles(updatedFiles);
    emitChange(updatedFiles);
    uploadedFiles.forEach((f) => toast.success(`${f.file_name} uploaded`));
  };

  const handleDelete = async (attachment_id: string) => {
    const file = files.find((f) => f.attachment_id === attachment_id);
    if (!file) return;

    if (
      valueFormat === "attachmentIds" &&
      !String(attachment_id).startsWith("url-")
    ) {
      try {
        await deleteAttachment(attachment_id).unwrap();
      } catch {
        toast.error("Failed to delete file");
        return;
      }
    }

    const updatedFiles = files.filter((f) => f.attachment_id !== attachment_id);
    setFiles(updatedFiles);
    emitChange(updatedFiles);
    toast.success("File removed successfully");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {!hideLabel && (
        <Label
          htmlFor={id}
          className={`${labelClass || "text-sm font-medium"} cursor-pointer`}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <div
        className={`${fieldClass} ${
          compact ? "h-24 mt-0 p-3" : "mt-2 p-3"
        } relative flex items-center justify-center border border-section-accent border-dashed rounded-md hover:bg-gray-50 transition cursor-pointer ${
          error ? "border-red-500" : ""
        }`}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={isUploading}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />

        {isUploading ? (
          <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <Upload className="w-6 h-6 text-gray-500" />
            <p className={`${compact ? "text-xs" : "text-sm"} text-gray-600`}>
              Click or drag to upload
            </p>
            {compact && files.length > 0 && (
              <span className="truncate text-xs text-muted-foreground max-w-[90%]">
                {files[0].file_name}
              </span>
            )}
          </div>
        )}
      </div>

      {files.length > 0 && showPreview && (
        <div className={`grid grid-cols-1 gap-2 mt-2 ${compact ? "max-h-40 overflow-y-auto" : ""}`}>
          {files.map((file) => (
            <div
              key={file.attachment_id}
              className={`flex items-center justify-between border border-gray-200 rounded-md bg-gray-50 ${
                compact ? "p-1.5" : "p-2"
              }`}
            >
              <div className="flex items-center gap-2">
                {file.previewUrl && getFileType(file.file_name) === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.previewUrl}
                    alt="Preview"
                    className="w-10 h-10 object-cover border rounded"
                  />
                )}
                <span className="text-sm text-gray-700 truncate max-w-[140px]">
                  {file.file_name}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewFile(file)}
                  className="w-8 h-8 text-primary hover:bg-gray-100"
                >
                  <Eye className="w-5 h-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file.attachment_id)}
                  className="w-8 h-8 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {previewFile && showPreview && (
        <div className={cn(modalOverlayClassName, "bg-black/50")}>
          <div className="relative mx-auto max-h-[min(90dvh,calc(100%-2rem))] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4">
            <button
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-200"
              onClick={() => setPreviewFile(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4">{previewFile.file_name}</h3>

            {getFileType(previewFile.file_name) === "image" &&
              previewFile.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.file_name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              )}

            {getFileType(previewFile.file_name) === "pdf" &&
              previewFile.previewUrl && (
                <iframe
                  src={previewFile.previewUrl}
                  className="w-full h-[70vh]"
                  title={previewFile.file_name}
                />
              )}

            {!previewFile.previewUrl && (
              <p className="text-gray-600">Cannot preview this file type.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};