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

interface ProfileImageUploadProps {
  label?: string;
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  previewClassName?: string;
}

export function ProfileImageUpload({
  label = "Profile photo",
  value,
  onChange,
  disabled = false,
  className,
  previewClassName,
}: ProfileImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadAttachments, { isLoading }] = useUploadAttachmentsMutation();
  const previewUrl = value ? getFileUrl(value) : null;

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadAttachments({ files: [file] }).unwrap();
      const path = result.attachments?.[0]?.file_path;
      if (!path) throw new Error("Upload failed");
      onChange(path);
      actionFeedback.success("Profile photo uploaded");
    } catch {
      actionFeedback.error("Failed to upload profile photo");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label ? <Label>{label}</Label> : null}
      <div
        className={cn(
          "relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border bg-muted/30",
          previewClassName
        )}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Profile"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-sm text-muted-foreground">No photo</span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
