"use client";

import { Info, ListTree } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegionalPlanVersionSubNavProps {
  regionId?: string;
  versionId?: string;
  className?: string;
}

export function RegionalPlanVersionSubNav({
  regionId: propRegionId,
  versionId: propVersionId,
  className,
}: RegionalPlanVersionSubNavProps) {
  const params = useParams();
  const pathname = usePathname() || "";

  const regionId = propRegionId || (params?.id as string);
  const versionId = propVersionId || (params?.versionId as string);

  if (!regionId || !versionId) return null;

  const isDetails = pathname.includes(`/plans/${versionId}/details`);
  const planHref = `/regions/${regionId}/plans/${versionId}`;
  const detailsHref = `/regions/${regionId}/plans/${versionId}/details`;

  const items = [
    {
      id: "plan" as const,
      label: "Plan",
      href: planHref,
      icon: ListTree,
      isActive: !isDetails,
    },
    {
      id: "details" as const,
      label: "Details",
      href: detailsHref,
      icon: Info,
      isActive: isDetails,
    },
  ];

  return (
    <nav
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Regional plan sections"
    >
      {items.map(({ id, label, href, icon: Icon, isActive }) => (
        <Button
          key={id}
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn("gap-2 shadow-xs", isActive ? "font-semibold" : "")}
          asChild
        >
          <Link href={href} aria-current={isActive ? "page" : undefined}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
