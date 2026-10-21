"use client";

import { Badge } from "@/components/ui/badge";
import { useGetDocumentsQuery } from "@/redux/api/collaborationApi";
import { cn } from "@/lib/utils";

interface PlanDocumentCountBadgeProps {
  planVersionId: string;
  count?: number;
  className?: string;
  hideWhenZero?: boolean;
}

export function PlanDocumentCountBadge({
  planVersionId,
  count: countProp,
  className,
  hideWhenZero = false,
}: PlanDocumentCountBadgeProps) {
  const hasProvidedCount = countProp !== undefined;
  const { data: documents } = useGetDocumentsQuery(
    {
      ownerApp: "plan-management",
      ownerType: "plan_version",
      ownerId: planVersionId,
    },
    { skip: hasProvidedCount }
  );

  const count = hasProvidedCount ? countProp : (documents?.length ?? 0);
  if (hideWhenZero && count === 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className={cn("min-w-5 justify-center px-1.5", className)}>
      {count}
    </Badge>
  );
}
