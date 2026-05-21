"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Upload, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadAttachmentsMutation,
  useDeleteAttachmentMutation,
  useGetAttachmentsQuery,
} from "@/redux/api/attachementApi";
import { getFileUrl, getFileType } from "../../utils/fileUrl";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface FileUploadFieldProps {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  accept?: string;
  error?: string;
  className?: string;
  labelClass?: string;
  fieldClass?: string;
  multiple?: boolean;
  showPreview?: boolean;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id,
  label,
  value = [],
  onChange,
  required = false,
  accept = "image/*,.pdf",
  error,
  className = "",
  labelClass = "",
  fieldClass = "",
  multiple = true,
  showPreview = true,
}) => {
  const [uploadAttachments, { isLoading: isUploading }] =
    useUploadAttachmentsMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { data: attachmentsResponse } = useGetAttachmentsQuery();

  const [files, setFiles] = useState<
    {
      attachment_id: string;
      file_name: string;
      previewUrl?: string | null;
    }[]
  >([]);
  const [previewFile, setPreviewFile] = useState<
    { file_name: string; previewUrl?: string | null } | null
  >(null);

  // Initialize with existing attachment IDs (value) from backend
  useEffect(() => {
    if (!attachmentsResponse || value.length === 0) return;

    // Only initialize from backend when we don't already have local files
    if (files.length === 0) {
      const all = attachmentsResponse.attachments || [];
      const mapped = value
        .map((id) => all.find((a) => a.attachment_id === id))
        .filter(Boolean)
        .map((a) => ({
          attachment_id: a!.attachment_id,
          file_name: a!.file_name,
          previewUrl: getFileUrl(a!.file_path),
        }));

      if (mapped.length > 0) {
        setFiles(mapped);
      }
    }
  }, [attachmentsResponse, value, files.length]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const uploadPromises = Array.from(selectedFiles).map(async (file) => {
      try {
        const result = await uploadAttachments({ files: [file] }).unwrap();
        if (result.attachments.length > 0) {
          const uploaded = result.attachments[0];
          let previewUrl: string | null = null;
          if (/\.(png|jpe?g|gif|pdf)$/i.test(uploaded.file_name)) {
            previewUrl = URL.createObjectURL(file);
          }
          return { ...uploaded, previewUrl };
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const uploadedFiles = (await Promise.all(uploadPromises)).filter(
      Boolean
    ) as { attachment_id: string; file_name: string; previewUrl?: string }[];

    if (uploadedFiles.length > 0) {
      const updatedFiles = [...files, ...uploadedFiles];
      setFiles(updatedFiles);
      onChange(updatedFiles.map((f) => f.attachment_id));
      uploadedFiles.forEach((f) => toast.success(`${f.file_name} uploaded`));
    }
  };

  const handleDelete = async (attachment_id: string) => {
    try {
      await deleteAttachment(attachment_id).unwrap();
      const updatedFiles = files.filter(
        (f) => f.attachment_id !== attachment_id
      );
      setFiles(updatedFiles);
      onChange(updatedFiles.map((f) => f.attachment_id));
      toast.success("File removed successfully");
    } catch {
      toast.error("Failed to delete file");
    }
  };

  // Cleanup previews
  useEffect(() => {
    return () => {
      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    };
  }, [files]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label
        htmlFor={id}
        className={`${labelClass ?? "text-sm font-medium"}  cursor-pointer`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <div
        className={`${fieldClass} mt-2 relative flex flex-col items-center justify-center border border-[#B1C9E3] rounded-md border-dashed p-3 hover:bg-gray-50 transition cursor-pointer ${error ? "border-red-500" : ""
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
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="w-6 h-6 text-gray-500" />
            <p className="text-sm text-gray-600">Click or drag to upload</p>
          </div>
        )}
      </div>

      {/* Uploaded files */}
      {files.length > 0 && showPreview && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {files.map((file) => (
            <div
              key={file.attachment_id}
              className="flex items-center justify-between border border-gray-200 rounded-md p-2 bg-gray-50"
            >
              <div className="flex items-center gap-2">
                {file.previewUrl &&
                  getFileType(file.file_name) === "image" && (
                    <img
                      src={file.previewUrl}
                      alt="Preview"
                      className="w-10 h-10 object-cover border rounded"
                    />
                  )}
                <span className="text-sm text-gray-700 truncate max-w-[100px]">
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

      {/* Modal */}
      {previewFile && showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] p-4 relative overflow-auto">
            <button
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-200"
              onClick={() => setPreviewFile(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4">{previewFile.file_name}</h3>

            {getFileType(previewFile.file_name) === "image" &&
              previewFile.previewUrl && (
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
