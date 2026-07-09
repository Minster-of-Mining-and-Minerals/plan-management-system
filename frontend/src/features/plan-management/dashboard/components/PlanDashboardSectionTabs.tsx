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
      <div className="flex flex-wrap items-center gap-3">
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
                "h-10 rounded-xl px-4 py-2.5 shadow-none transition-all duration-200",
                active
                  ? "border-transparent bg-sidebar-nav-active text-sidebar-nav-active-foreground shadow-sm hover:bg-sidebar-nav-active/90"
                  : onPrimary
                    ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:border-golden-dark/35 hover:bg-golden-dark10 hover:text-primary-foreground"
                    : "border-border bg-white text-muted-foreground hover:border-golden-dark/35 hover:bg-golden-dark10 hover:text-golden-dark"
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
