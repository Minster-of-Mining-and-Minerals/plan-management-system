import {
  FileSpreadsheet,
  FileText,
  FileType,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import type { DocumentFileType } from "@/redux/types/document";

export function documentTypeIcon(fileType: DocumentFileType): LucideIcon {
  const icons: Record<DocumentFileType, LucideIcon> = {
    docx: FileText,
    xlsx: FileSpreadsheet,
    pptx: Presentation,
    pdf: FileType,
  };
  return icons[fileType] || FileText;
}

export function documentTypeLabel(fileType: DocumentFileType): string {
  const labels: Record<DocumentFileType, string> = {
    docx: "Word",
    xlsx: "Excel",
    pptx: "PowerPoint",
    pdf: "PDF",
  };
  return labels[fileType] || fileType.toUpperCase();
}

export function documentTypeBadgeClass(fileType: DocumentFileType): string {
  const classes: Record<DocumentFileType, string> = {
    docx: "bg-blue-50 text-blue-700 border-blue-200",
    xlsx: "bg-green-50 text-green-700 border-green-200",
    pptx: "bg-orange-50 text-orange-700 border-orange-200",
    pdf: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return classes[fileType] || "bg-gray-50 text-gray-700 border-gray-200";
}

export function documentTypeAccentClass(fileType: DocumentFileType): string {
  const classes: Record<DocumentFileType, string> = {
    docx: "border-l-blue-500",
    xlsx: "border-l-green-500",
    pptx: "border-l-orange-500",
    pdf: "border-l-gray-400",
  };
  return classes[fileType] || "border-l-gray-400";
}
