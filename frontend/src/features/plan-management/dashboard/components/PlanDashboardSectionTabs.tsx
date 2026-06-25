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
}

export function PlanDashboardSectionTabs({
  activeSection,
  onSectionChange,
}: PlanDashboardSectionTabsProps) {
  return (
    <div
      className="px-5 pt-5 pb-4 border-b border-border bg-gradient-to-b from-primary/5 to-transparent"
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
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
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
