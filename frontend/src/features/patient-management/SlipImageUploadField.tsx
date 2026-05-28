"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadField } from "@/features/template/component/FileUploadField";

function resolveImageSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/") || url.startsWith("blob:")) {
    return url;
  }
  return url;
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
  const displayUrl = value || defaultUrl;
  const src = resolveImageSrc(displayUrl);
  const isDefault = !value || value === defaultUrl;

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
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[220px]">
          <FileUploadField
            id={`slip-upload-${label.replace(/\s+/g, "-").toLowerCase()}`}
            label="Upload image"
            value={value || ""}
            onChange={(next) => onChange(String(next || ""))}
            accept={accept}
            multiple={false}
            showPreview={false}
            valueFormat="fileUrls"
            labelClass="text-xs text-muted-foreground"
          />
        </div>
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
