"use client";

import React from "react";
import {
  LayoutDashboard,
  Layers,
  Building2,
  Users,
  ListTree,
  GitBranch,
  FileSpreadsheet,
  Search,
  X,
  Filter,
  RotateCcw,
  Calendar,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { REGIONAL_PALETTE, hexToRgba } from "../RegionalDashboardAppearance";
import type { RegionalPlanDashboardState, RegionalDashboardSectionId } from "../types";

interface RegionalPlanDashboardFiltersBarProps {
  state: RegionalPlanDashboardState;
}

export function RegionalPlanDashboardFiltersBar({
  state,
}: RegionalPlanDashboardFiltersBarProps) {
  const {
    filters,
    updateFilter,
    resetFilters,
    activeSection,
    setActiveSection,
    plans,
    departments,
    users,
    availablePeriods,
    hierarchyConfig,
    levelNodeOptions,
  } = state;

  const tabs: Array<{ id: RegionalDashboardSectionId; label: string; icon: React.ElementType }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "hierarchy", label: "Hierarchy & Targets", icon: Layers },
    { id: "directorates", label: "Directorates", icon: Building2 },
    { id: "assignees", label: "Assignees", icon: Users },
    { id: "tree", label: "Execution Tree", icon: ListTree },
    { id: "sharing", label: "Sharing Analysis", icon: GitBranch },
    { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
  ];

  const hasActiveFilters =
    filters.status !== "all" ||
    filters.sharingMode !== "all" ||
    filters.planSearch.trim() !== "" ||
    filters.departmentId !== "all" ||
    filters.userId !== "all" ||
    filters.selectedHierarchyLevel !== "all" ||
    Object.values(filters.selectedPathByLevel).some((v) => v && v !== "all");

  const activeDeptName =
    filters.departmentId !== "all"
      ? departments.find((d) => d.id === filters.departmentId)?.name || "Selected Directorate"
      : null;

  const activeUserName =
    filters.userId !== "all"
      ? users.find((u) => u.id === filters.userId)?.name || "Selected Staff"
      : null;

  return (
    <div className="space-y-4">
      {/* Top Bar: Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/70 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border/70 bg-card shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Master Plan Selector */}
          <div className="w-52">
            <Select
              value={filters.masterPlanVersionId}
              onValueChange={(val) => updateFilter("masterPlanVersionId", val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                <SelectValue placeholder="Select Plan Version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" className="text-xs">
                  Auto (Latest Active Plan)
                </SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.plan_version_id} value={p.plan_version_id} className="text-xs">
                    {p.draft_name} ({p.start_year}-{p.end_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Period Switcher */}
          {availablePeriods.length > 0 && (
            <div className="w-48">
              <Select
                value={filters.periodVersionId}
                onValueChange={(val) => updateFilter("periodVersionId", val)}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                  <SelectValue placeholder="Period Phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs">
                    Auto (Active Period)
                  </SelectItem>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period.plan_version_id} value={period.plan_version_id} className="text-xs">
                      {period.period_label} ({period.phase})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Directorate Filter */}
          <div className="w-44">
            <Select
              value={filters.departmentId}
              onValueChange={(val) => updateFilter("departmentId", val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                <SelectValue placeholder="Directorate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Directorates</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee / Staff Filter */}
          <div className="w-44">
            <Select
              value={filters.userId}
              onValueChange={(val) => updateFilter("userId", val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                <SelectValue placeholder="Staff Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Staff Members</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-32">
            <Select
              value={filters.status}
              onValueChange={(val) => updateFilter("status", val)}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="delayed" className="text-xs">Delayed</SelectItem>
                <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search targets, KPIs…"
              value={filters.planSearch}
              onChange={(e) => updateFilter("planSearch", e.target.value)}
              className="h-9 pl-9 pr-8 text-xs rounded-xl border-border/80"
            />
            {filters.planSearch && (
              <button
                type="button"
                onClick={() => updateFilter("planSearch", "")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-rose-600 gap-1.5 rounded-xl shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>

      {/* Active Filter Indicators */}
      {(activeDeptName || activeUserName) && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span className="text-muted-foreground font-medium">Active filters:</span>
          {activeDeptName && (
            <Badge
              variant="outline"
              className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-300"
            >
              <Building2 className="h-3 w-3" />
              <span>Directorate: {activeDeptName}</span>
              <button
                type="button"
                onClick={() => updateFilter("departmentId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {activeUserName && (
            <Badge
              variant="outline"
              className="gap-1 bg-blue-50 text-blue-800 border-blue-300"
            >
              <Users className="h-3 w-3" />
              <span>Staff: {activeUserName}</span>
              <button
                type="button"
                onClick={() => updateFilter("userId", "all")}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Dynamic Hierarchy Depth Selector Pills */}
      {hierarchyConfig.length > 0 && (
        <div className="flex flex-col gap-2 p-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-emerald-700" />
              <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                Hierarchy Depth Scope
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({hierarchyConfig.length} configured levels in regional planning rule)
              </span>
            </div>
            {filters.selectedHierarchyLevel !== "all" && (
              <button
                type="button"
                onClick={() => updateFilter("selectedHierarchyLevel", "all")}
                className="text-[11px] text-emerald-700 hover:underline"
              >
                Show All Levels
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => updateFilter("selectedHierarchyLevel", "all")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
                filters.selectedHierarchyLevel === "all"
                  ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs"
                  : "bg-white dark:bg-card border-border/80 text-muted-foreground hover:text-foreground"
              )}
            >
              All Levels
            </button>

            {hierarchyConfig.map((step) => {
              const isSelected = filters.selectedHierarchyLevel === step.level;
              return (
                <button
                  key={step.level}
                  type="button"
                  onClick={() => updateFilter("selectedHierarchyLevel", step.level)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border",
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs"
                      : "bg-white dark:bg-card border-border/80 text-muted-foreground hover:text-foreground hover:border-emerald-500/30"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: step.color_hex || REGIONAL_PALETTE.emerald.DEFAULT }}
                  />
                  <span>L{step.level}: {step.name}</span>
                </button>
              );
            })}
          </div>

          {/* Cascading Selection Dropdowns across levels */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/10">
            {hierarchyConfig.map((step, idx) => {
              const lvl = step.level;
              const options = levelNodeOptions[lvl] || [];
              const isUnlocked = lvl === 1 || Boolean(filters.selectedPathByLevel[lvl - 1]);
              const currentValue = filters.selectedPathByLevel[lvl] || "all";

              if (!isUnlocked && options.length === 0) return null;

              return (
                <div key={lvl} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                  <Select
                    value={currentValue}
                    onValueChange={(val) => {
                      const nextPath = { ...filters.selectedPathByLevel, [lvl]: val };
                      // Clear deeper selections
                      for (let deeper = lvl + 1; deeper <= 10; deeper++) {
                        delete nextPath[deeper];
                      }
                      updateFilter("selectedPathByLevel", nextPath);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl border-border/80 bg-white dark:bg-card min-w-[150px] max-w-[220px]">
                      <SelectValue placeholder={`All ${step.name}s`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All {step.name}s
                      </SelectItem>
                      {options.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {opt.title} ({opt.progress}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
