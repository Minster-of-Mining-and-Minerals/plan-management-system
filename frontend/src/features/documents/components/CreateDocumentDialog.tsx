"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actionFeedback } from "@/components/action-feedback";
import { cn } from "@/lib/utils";
import { DIALOG_SCROLLABLE_BODY, DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
import { useCreateDocumentMutation } from "@/redux/api/collaborationApi";
import type { DocumentFileType, DocumentOwnerType } from "@/redux/types/document";

const ACCEPTED_FILE_TYPES = ".docx,.xlsx,.pptx,.pdf";

type CreateMode = "docx" | "xlsx" | "upload";

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType?: DocumentOwnerType;
  ownerId?: string;
  editorBasePath?: string;
  initialMode?: CreateMode;
}

const TYPE_OPTIONS: Array<{
  mode: CreateMode;
  label: string;
  description: string;
  icon: typeof FileText;
  accent: string;
}> = [
  {
    mode: "docx",
    label: "Word document",
    description: "Create a blank document",
    icon: FileText,
    accent: "border-blue-500 bg-blue-50/50",
  },
  {
    mode: "xlsx",
    label: "Spreadsheet",
    description: "Create a blank Excel file",
    icon: FileSpreadsheet,
    accent: "border-green-500 bg-green-50/50",
  },
];

export function CreateDocumentDialog({
  open,
  onOpenChange,
  ownerType = "standalone",
  ownerId,
  editorBasePath = "/documents",
  initialMode = "docx",
}: CreateDocumentDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [selectedMode, setSelectedMode] = useState<CreateMode>(initialMode);
  const [isDragging, setIsDragging] = useState(false);
  const [createDocument, { isLoading }] = useCreateDocumentMutation();

  const resetForm = useCallback(() => {
    setTitle("");
    setSelectedMode(initialMode);
    setIsDragging(false);
  }, [initialMode]);

  useEffect(() => {
    if (open) setSelectedMode(initialMode);
  }, [open, initialMode]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const navigateToDocument = (documentId: string) => {
    handleOpenChange(false);
    router.push(`${editorBasePath}/${documentId}`);
  };

  const handleCreate = async (fileType: DocumentFileType) => {
    if (!title.trim()) {
      actionFeedback.error("Title is required");
      return;
    }

    try {
      const document = await createDocument({
        title: title.trim(),
        fileType,
        ownerApp: "plan-management",
        ownerType,
        ownerId,
      }).unwrap();
      navigateToDocument(document.document_id);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to create document");
    }
  };

  const handleUpload = async (file: File) => {
    const uploadTitle = title.trim() || file.name.replace(/\.[^.]+$/, "") || "Uploaded document";

    try {
      const document = await createDocument({
        title: uploadTitle,
        ownerApp: "plan-management",
        ownerType,
        ownerId,
        file,
      }).unwrap();
      navigateToDocument(document.document_id);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to upload document");
    }
  };

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleUpload(file);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedMode("upload");
      await handleUpload(file);
    }
  };

  const handleSubmit = () => {
    if (selectedMode === "upload") {
      fileInputRef.current?.click();
      return;
    }
    handleCreate(selectedMode);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-lg")}>
        <DialogHeader className="px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Create document</DialogTitle>
          <DialogDescription>
            Choose a type, enter a title, or upload an existing file.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(DIALOG_SCROLLABLE_BODY, "px-6 pb-4")}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-title">Title</Label>
            <Input
              id="document-title"
              placeholder="Document title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && selectedMode !== "upload") {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Choose type</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedMode === option.mode;

                return (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => setSelectedMode(option.mode)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors",
                      isSelected ? option.accent : "border-muted hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mb-2 h-6 w-6",
                        option.mode === "docx" ? "text-blue-600" : "text-green-600"
                      )}
                    />
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Or upload existing</Label>
            <div
              role="button"
              tabIndex={0}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                setSelectedMode("upload");
                fileInputRef.current?.click();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedMode("upload");
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                isDragging || selectedMode === "upload"
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop file here or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                .docx, .xlsx, .pptx, .pdf
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (selectedMode !== "upload" && !title.trim())}
          >
            {selectedMode === "upload" ? "Choose file" : "Create & open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
