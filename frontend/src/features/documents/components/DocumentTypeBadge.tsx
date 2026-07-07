import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentFileType } from "@/redux/types/document";
import {
  documentTypeBadgeClass,
  documentTypeIcon,
  documentTypeLabel,
} from "@/features/documents/utils/documentTypeUtils";

interface DocumentTypeBadgeProps {
  fileType: DocumentFileType;
  showIcon?: boolean;
  className?: string;
}

export function DocumentTypeBadge({
  fileType,
  showIcon = true,
  className,
}: DocumentTypeBadgeProps) {
  const Icon = documentTypeIcon(fileType);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-normal", documentTypeBadgeClass(fileType), className)}
    >
      {showIcon ? <Icon className="h-3.5 w-3.5" /> : null}
      {documentTypeLabel(fileType)}
    </Badge>
  );
}
