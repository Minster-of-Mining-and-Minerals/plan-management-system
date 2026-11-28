"use client";

import {
  BarChart3,
  Building2,
  FileText,
  GitBranch,
  LayoutDashboard,
  ListTree,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardSectionId } from "../types";

export const DASHBOARD_SECTIONS: Array<{
  id: DashboardSectionId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "structure", label: "Structure", icon: Building2 },
  { id: "department", label: "Department", icon: BarChart3 },
  { id: "user", label: "User", icon: Users },
  { id: "progress", label: "Plan Progress", icon: ListTree },
  { id: "sharing", label: "Sharing Analysis", icon: GitBranch },
  { id: "reports", label: "Reports", icon: FileText },
];

interface PlanDashboardSectionTabsProps {
  activeSection: DashboardSectionId;
  onSectionChange: (id: DashboardSectionId) => void;
  onPrimary?: boolean;
}

export function PlanDashboardSectionTabs({
  activeSection,
  onSectionChange,
  onPrimary = false,
}: PlanDashboardSectionTabsProps) {
  return (
    <div
      className={cn(
        "px-5 sm:px-6 pt-5 pb-4 border-b",
        onPrimary
          ? "border-primary-foreground/15"
          : "border-border bg-gradient-to-b from-primary/5 to-transparent"
      )}
      role="tablist"
      aria-label="Dashboard sections"
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-xs w-fit max-w-full",
          onPrimary && "border-primary-foreground/20 bg-primary-foreground/10"
        )}
      >
        {DASHBOARD_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              variant={active ? "default" : "outline"}
              size="default"
              onClick={() => onSectionChange(id)}
              className={cn(
                "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all gap-2",
                active
                  ? "bg-primary text-primary-foreground shadow-xs border-primary"
                  : onPrimary
                    ? "border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
