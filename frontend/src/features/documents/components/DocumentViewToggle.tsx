"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentViewMode = "table" | "cards";

const STORAGE_KEY = "documents-view-mode";

export function getStoredDocumentViewMode(): DocumentViewMode {
  if (typeof window === "undefined") return "table";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "cards" ? "cards" : "table";
}

export function setStoredDocumentViewMode(mode: DocumentViewMode) {
  localStorage.setItem(STORAGE_KEY, mode);
}

interface DocumentViewToggleProps {
  value: DocumentViewMode;
  onChange: (mode: DocumentViewMode) => void;
  className?: string;
}

export function DocumentViewToggle({ value, onChange, className }: DocumentViewToggleProps) {
  return (
    <div className={cn("inline-flex rounded-md border bg-white p-0.5", className)}>
      <Button
        type="button"
        variant={value === "table" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2.5"
        onClick={() => onChange("table")}
        title="Table view"
      >
        <List className="h-4 w-4" />
        <span className="ml-1.5 hidden sm:inline">Table</span>
      </Button>
      <Button
        type="button"
        variant={value === "cards" ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2.5"
        onClick={() => onChange("cards")}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="ml-1.5 hidden sm:inline">Cards</span>
      </Button>
    </div>
  );
}
