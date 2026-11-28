"use client";

import React, { useRef, useState } from "react";
import { getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LabeledAttachmentItem {
  attachment_id?: string | null;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  size?: number | null;
  label: string;
  description: string;
}

interface LabeledAttachmentInputProps {
  attachments: LabeledAttachmentItem[];
  onChange: (next: LabeledAttachmentItem[]) => void;
  title?: string;
  required?: boolean;
}

export function LabeledAttachmentInput({
  attachments,
  onChange,
  title,
  required = false,
}: LabeledAttachmentInputProps) {
  const displayTitle = title || (required ? "Supporting Evidence (Required) *" : "Supporting Attachments (Optional)");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const session = await getSession();
      const token = (session as unknown as { accessToken?: string })?.accessToken;
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data?.attachments) {
        throw new Error(data?.message || "Failed to upload attachment(s)");
      }

      const added: LabeledAttachmentItem[] = (data.attachments as Array<{
        attachment_id: string;
        file_name: string;
        file_path: string;
      }>).map((uploaded, i) => ({
        attachment_id: uploaded.attachment_id,
        file_name: uploaded.file_name || files[i]?.name || "Attachment",
        file_path: uploaded.file_path,
        mime_type: files[i]?.type || null,
        size: files[i]?.size ?? null,
        label: files[i]?.name?.replace(/\.[^/.]+$/, "") || uploaded.file_name || "",
        description: "",
      }));

      onChange([...attachments, ...added]);
      toast.success(`${added.length} file(s) uploaded. Add a label and KPI relation description.`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "File upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateItem = (idx: number, patch: Partial<LabeledAttachmentItem>) => {
    const next = attachments.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
          <span className={cn("text-xs font-semibold text-slate-800 dark:text-slate-200", required && "text-amber-700 dark:text-amber-400 font-bold")}>
            {displayTitle}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-7 px-2.5 text-xs gap-1"
        >
          <Upload className="h-3 w-3" />
          {isUploading ? "Uploading..." : "Attach File"}
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          Optional: attach supporting documents. Every attached file requires a display label and a description of its relation to the KPI.
        </p>
      ) : (
        <div className="space-y-2.5">
          {attachments.map((att, idx) => (
            <div
              key={`${att.attachment_id || att.file_name}-${idx}`}
              className="rounded-md border bg-white dark:bg-slate-950 p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-xs font-mono truncate text-slate-700 dark:text-slate-300">
                    {att.file_name}
                  </span>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-red-600 hover:text-red-700"
                  onClick={() => removeItem(idx)}
                  title="Remove attachment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Display Label *</Label>
                  <Input
                    value={att.label}
                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                    placeholder="e.g. Q1 Signed Production Sheet"
                    className="h-7 text-xs mt-0.5"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Relation to KPI (Description) *</Label>
                  <Textarea
                    rows={1}
                    value={att.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Describe how this file supports the KPI..."
                    className="min-h-[28px] text-xs mt-0.5 py-1"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
