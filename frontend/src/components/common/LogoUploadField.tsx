"use client";

import { useRef } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import { getFileUrl } from "@/utils/fileUrl";
import { cn } from "@/lib/utils";

interface LogoUploadFieldProps {
  label: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  previewClassName?: string;
  successMessage?: string;
  errorMessage?: string;
}

export function LogoUploadField({
  label,
  value,
  onChange,
  disabled = false,
  className,
  previewClassName,
  successMessage,
  errorMessage,
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadAttachments, { isLoading }] = useUploadAttachmentsMutation();
  const previewUrl = value ? getFileUrl(value) : null;

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadAttachments({ files: [file] }).unwrap();
      const path = result.attachments?.[0]?.file_path;
      if (!path) throw new Error("Upload failed");
      onChange(path);
      actionFeedback.success(successMessage || `${label} uploaded`);
    } catch {
      actionFeedback.error(errorMessage || `Failed to upload ${label.toLowerCase()}`);
    }
  };

  return (
    <div className={cn("space-y-2 rounded-lg border p-4", className)}>
      <Label>{label}</Label>
      {previewUrl ? (
        <div
          className={cn(
            "relative flex h-28 items-center justify-center rounded-md border bg-muted/30 p-2",
            previewClassName
          )}
        >
          <Image
            src={previewUrl}
            alt={label}
            width={160}
            height={80}
            className="max-h-24 w-auto object-contain"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No logo selected
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          disabled={disabled || isLoading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isLoading}
            onClick={() => onChange(null)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
