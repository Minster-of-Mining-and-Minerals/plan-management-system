"use client";

import { Badge } from "@/components/ui/badge";
import { useGetDocumentsQuery } from "@/redux/api/collaborationApi";
import { cn } from "@/lib/utils";

interface PlanDocumentCountBadgeProps {
  planVersionId: string;
  className?: string;
  hideWhenZero?: boolean;
}

export function PlanDocumentCountBadge({
  planVersionId,
  className,
  hideWhenZero = false,
}: PlanDocumentCountBadgeProps) {
  const { data: documents } = useGetDocumentsQuery({
    ownerApp: "plan-management",
    ownerType: "plan_version",
    ownerId: planVersionId,
  });

  const count = documents?.length ?? 0;
  if (hideWhenZero && count === 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className={cn("min-w-5 justify-center px-1.5", className)}>
      {count}
    </Badge>
  );
}
