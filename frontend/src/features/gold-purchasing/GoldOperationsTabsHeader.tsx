"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  FileText,
  Coins,
  ClipboardCheck,
  HardHat,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  anyPermissions?: (`${string}:${string}`)[];
  exact?: boolean;
}

const TABS: TabItem[] = [
  {
    name: "Oversight Dashboard",
    href: "/admin/gold-operations",
    icon: LayoutDashboard,
    anyPermissions: ["GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE", "PURCHASING_CENTERS:READ"],
    exact: true,
  },
  {
    name: "Purchases Register",
    href: "/admin/gold-operations/purchases",
    icon: FileText,
    anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    name: "Price Configuration",
    href: "/admin/gold-operations/pricing",
    icon: Coins,
    anyPermissions: ["GOLD_PRICES:READ", "GOLD_PRICES:MANAGE", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    name: "Daily Reports",
    href: "/admin/gold-operations/reports",
    icon: ClipboardCheck,
    anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    name: "ASM Registry",
    href: "/admin/gold-operations/asm",
    icon: HardHat,
    anyPermissions: ["ASM:READ", "ASM:MANAGE", "GOLD_OVERSIGHT:READ", "GOLD_OVERSIGHT:MANAGE"],
  },
  {
    name: "Measurement Units",
    href: "/admin/gold-operations/units",
    icon: Scale,
    anyPermissions: ["GOLD_UNITS:READ", "GOLD_UNITS:MANAGE"],
  },
];

export function GoldOperationsTabsHeader() {
  const pathname = usePathname();
  const { canAny } = usePermissions();

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs mb-6"
      role="tablist"
      aria-label="Gold Operations Modules"
    >
      {TABS.map((tab) => {
        if (tab.anyPermissions && !canAny(tab.anyPermissions)) {
          return null;
        }

        const Icon = tab.icon;
        // Strip locale prefix from pathname for comparison
        const normalizedPath = pathname?.replace(/^\/(?:en|am|or|ti|so)/, "") || "";
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
