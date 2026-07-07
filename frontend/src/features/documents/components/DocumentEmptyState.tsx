"use client";

import { FileSpreadsheet, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentEmptyStateProps {
  canCreate: boolean;
  onCreateWord: () => void;
  onCreateExcel: () => void;
  onUpload: () => void;
}

export function DocumentEmptyState({
  canCreate,
  onCreateWord,
  onCreateExcel,
  onUpload,
}: DocumentEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <div className="mb-4 flex items-center gap-3 text-muted-foreground">
        <FileText className="h-10 w-10 text-blue-500" />
        <FileSpreadsheet className="h-10 w-10 text-green-500" />
      </div>
      <h3 className="text-lg font-medium">No documents yet</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Create a Word document or spreadsheet, or upload an existing file to start collaborating.
      </p>
      {canCreate ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onCreateWord}>
            <FileText className="mr-2 h-4 w-4" />
            New Word document
          </Button>
          <Button variant="outline" onClick={onCreateExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            New spreadsheet
          </Button>
          <Button variant="ghost" onClick={onUpload}>
            <Upload className="mr-2 h-4 w-4" />
            Upload file
          </Button>
        </div>
      ) : null}
    </div>
  );
}
