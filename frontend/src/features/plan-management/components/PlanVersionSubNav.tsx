"use client";

import { FileText, Info, ListTree } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlanDocumentCountBadge } from "@/features/documents/components/PlanDocumentCountBadge";
import {
  getPlanDetailsPath,
  getPlanDocumentsPath,
  getPlanVersionBasePath,
  resolvePlanVersionNavSection,
  type PlanVersionViewMode,
} from "@/utils/planVersionRouteUtils";

interface PlanVersionSubNavProps {
  versionId: string;
  mode?: PlanVersionViewMode;
  className?: string;
}

export function PlanVersionSubNav({
  versionId,
  mode = "draft",
  className,
}: PlanVersionSubNavProps) {
  const pathname = usePathname();
  const activeSection = resolvePlanVersionNavSection(pathname, versionId, mode);
  const planHref = getPlanVersionBasePath(versionId, mode);
  const documentsHref = getPlanDocumentsPath(versionId);
  const detailsHref = getPlanDetailsPath(versionId, mode);

  const items = [
    {
      id: "plan" as const,
      label: "Plan",
      href: planHref,
      icon: ListTree,
    },
    {
      id: "documents" as const,
      label: "Documents",
      href: documentsHref,
      icon: FileText,
      badge: <PlanDocumentCountBadge planVersionId={versionId} hideWhenZero />,
    },
    {
      id: "details" as const,
      label: "Details",
      href: detailsHref,
      icon: Info,
    },
  ];

  return (
    <nav
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Plan sections"
    >
      {items.map(({ id, label, href, icon: Icon, badge }) => {
        const isActive = activeSection === id;
        return (
          <Button
            key={id}
            variant={isActive ? "default" : "outline"}
            className="gap-2"
            asChild
          >
            <Link href={href} aria-current={isActive ? "page" : undefined}>
              <Icon className="h-4 w-4" />
              {label}
              {badge}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
