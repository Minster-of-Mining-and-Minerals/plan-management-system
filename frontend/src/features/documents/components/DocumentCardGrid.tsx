"use client";

import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DocumentTypeBadge } from "@/features/documents/components/DocumentTypeBadge";
import {
  formatFileSize,
  formatRelativeUpdated,
} from "@/features/documents/utils/documentFormatUtils";
import { documentTypeAccentClass } from "@/features/documents/utils/documentTypeUtils";
import type { CollaborationDocument } from "@/redux/types/document";

interface DocumentCardGridProps {
  documents: CollaborationDocument[];
  isLoading?: boolean;
  onOpen: (documentId: string) => void;
  onDelete: (documentId: string, title: string) => void;
  isDeleting?: boolean;
}

export function DocumentCardGrid({
  documents,
  isLoading,
  onOpen,
  onDelete,
  isDeleting,
}: DocumentCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="border-l-4 border-l-muted">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => (
        <Card
          key={document.document_id}
          className={cn(
            "flex flex-col border-l-4 transition-shadow hover:shadow-md",
            documentTypeAccentClass(document.file_type)
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <CardTitle className="truncate text-base">{document.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <DocumentTypeBadge fileType={document.file_type} />
                  <span className="text-xs text-muted-foreground">v{document.version_number}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={document.status === "finalized" ? "secondary" : "outline"}>
                    {document.status}
                  </Badge>
                  {document.access?.mode === "view" ? (
                    <Badge variant="outline">View only</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeUpdated(document.updated_at)} · {formatFileSize(document.file_size)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpen(document.document_id)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </DropdownMenuItem>
                  {document.access?.canDelete ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                      onClick={() => onDelete(document.document_id, document.title)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button className="w-full" onClick={() => onOpen(document.document_id)}>
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
