"use client";

import { useRef } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import { getFileUrl } from "@/utils/fileUrl";

function resolveImageSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/") || url.startsWith("blob:")) {
    return url;
  }
  return getFileUrl(url);
}

interface SlipImageUploadFieldProps {
  label: string;
  value: string;
  defaultUrl: string;
  onChange: (url: string) => void;
  accept?: string;
  previewHeight?: number;
}

export function SlipImageUploadField({
  label,
  value,
  defaultUrl,
  onChange,
  accept = "image/*",
  previewHeight = 48,
}: SlipImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { isLoading }] = useUploadAttachmentsMutation();

  const displayUrl = value || defaultUrl;
  const src = resolveImageSrc(displayUrl);
  const isDefault = !value || value === defaultUrl;

  const handleUpload = async (file: File) => {
    try {
      const result = await upload({ files: [file] }).unwrap();
      const path = result.attachments?.[0]?.file_path;
      if (!path) {
        toast.error("Upload failed");
        return;
      }
      onChange(getFileUrl(path));
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {src ? (
        <div
          className="rounded-md border bg-muted/20 overflow-hidden flex items-center justify-center"
          style={{ height: previewHeight }}
        >
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain"
            crossOrigin={src.startsWith("http") ? "anonymous" : undefined}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Upload image
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(defaultUrl)}
          title="Restore default image"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Use default
        </Button>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultUrl}
        className="h-8 text-xs"
      />
      {isDefault && (
        <p className="text-[10px] text-muted-foreground">
          Using default: {defaultUrl}
        </p>
      )}
    </div>
  );
}
