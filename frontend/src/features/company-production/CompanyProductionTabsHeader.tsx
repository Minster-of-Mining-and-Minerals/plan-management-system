"use client";

import { usePathname, useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Factory,
  FilePlus2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function CompanyProductionTabsHeader({ companyId: propCompanyId }: { companyId?: string }) {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  
  const companyId = propCompanyId || params?.id || session?.user?.company_id;

  if (!companyId) return null;

  const basePath = `/companies/${companyId}/production`;

  const tabs = [
    {
      name: "Production Overview",
      href: basePath,
      icon: Factory,
      exact: true,
    },
    {
      name: "Submit Daily Report",
      href: `${basePath}/submit`,
      icon: FilePlus2,
    },
    {
      name: "Report History & Compliance",
      href: `${basePath}/reports`,
      icon: ClipboardList,
    },
  ];

  const normalizedPath = pathname?.replace(/^\/(?:en|am|or|ti|so)/, "") || "";

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs mb-6"
      role="tablist"
      aria-label="Company Production Management Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.exact
          ? normalizedPath === tab.href || normalizedPath === `${tab.href}/`
          : normalizedPath.startsWith(tab.href);

        return (
          <Link
            key={tab.name}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
