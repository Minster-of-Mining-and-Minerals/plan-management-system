"use client";

import { usePathname, useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ListTree,
  ClipboardCheck,
  Settings,
  Scale,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function RegionalPlanTabsHeader() {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const regionId = params?.id;

  if (!regionId) return null;

  const isRegionsPrefixed = pathname?.includes("/regions/");
  const basePath = isRegionsPrefixed ? `/regions/${regionId}/plans` : `/${regionId}/plans`;

  const tabs = [
    {
      name: "Plan Drafts",
      href: basePath,
      icon: ListTree,
      exact: true,
    },
    {
      name: "Plan Review",
      href: `${basePath}/review`,
      icon: ClipboardCheck,
    },
    {
      name: "Planning Configuration",
      href: `${basePath}/configuration`,
      icon: Settings,
    },
    {
      name: "Plan Rules",
      href: `${basePath}/rules`,
      icon: Scale,
    },
    {
      name: "Performance Colors",
      href: `${basePath}/performance-colors`,
      icon: Palette,
    },
  ];

  const normalizedPath = pathname?.replace(/^\/(?:en|am|or|ti|so)/, "") || "";

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs mb-6"
      role="tablist"
      aria-label="Regional Plan Management Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? normalizedPath === tab.href || normalizedPath === `${tab.href}/`
          : normalizedPath.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-2 h-10 rounded-xl px-4 text-xs font-semibold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "border border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
