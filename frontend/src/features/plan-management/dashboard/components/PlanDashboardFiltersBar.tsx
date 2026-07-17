"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, RotateCcw } from "lucide-react";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
import { cn } from "@/lib/utils";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { FilterDropdown } from "./FilterDropdown";
import { PlanDashboardSectionTabs } from "./PlanDashboardSectionTabs";

interface PlanDashboardFiltersProps {
  state: PlanDashboardFiltersState;
}

export function PlanDashboardFiltersBar({ state }: PlanDashboardFiltersProps) {
  const {
    filters,
    updateFilter,
    resetFilters,
    data,
    departmentOptions,
    userOptions,
    activeSection,
    setActiveSection,
  } = state;

  const structureOptions = [
    { value: "all", label: "All Structures" },
    ...data.structures.map((s) => ({ value: s.id, label: s.name })),
  ];

  const departmentOpts = [
    { value: "all", label: "All Departments" },
    ...departmentOptions.map((d) => ({ value: d.id, label: d.name })),
  ];

  const userOpts = [
    { value: "all", label: "All Users" },
    ...userOptions.map((u) => ({ value: u.id, label: u.name })),
  ];

  const filterControlClass = cn(
    "h-9 border-primary-foreground/20 bg-primary-foreground/95 text-foreground"
  );

  const dateLabelClass = "text-xs text-primary-foreground/75";

  return (
    <ProfileHeroBanner className="overflow-hidden rounded-2xl border shadow-sm">
      <PlanDashboardSectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onPrimary
      />

      <div className="space-y-4 px-5 py-5 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-foreground">
            <Filter className="h-4 w-4 shrink-0 opacity-90" />
            Global Filters
            <span className="rounded-full border border-primary-foreground/25 bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
              Live Data
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 gap-1.5 text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterDropdown
            label="Structure"
            value={filters.structureId}
            options={structureOptions}
            onChange={(v) => updateFilter("structureId", v)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <FilterDropdown
            label="Department"
            value={filters.departmentId}
            options={departmentOpts}
            onChange={(v) => updateFilter("departmentId", v)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <FilterDropdown
            label="User"
            value={filters.userId}
            options={userOpts}
            onChange={(v) => updateFilter("userId", v)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <FilterDropdown
            label="Plan Type"
            value={filters.sharingMode}
            options={[
              { value: "all", label: "All Types" },
              { value: "shared", label: "Shared" },
              { value: "exclusive", label: "Exclusive" },
            ]}
            onChange={(v) => updateFilter("sharingMode", v as typeof filters.sharingMode)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "delayed", label: "Delayed" },
            ]}
            onChange={(v) => updateFilter("status", v as typeof filters.status)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <FilterDropdown
            label="Priority"
            value={filters.priority}
            options={[
              { value: "all", label: "All Priorities" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            onChange={(v) => updateFilter("priority", v as typeof filters.priority)}
            onPrimary
            className="w-auto min-w-[140px]"
          />
          <div className="min-w-[130px] space-y-1.5">
            <label className={dateLabelClass}>Date From</label>
            <Input
              type="date"
              className={filterControlClass}
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>
          <div className="min-w-[130px] space-y-1.5">
            <label className={dateLabelClass}>Date To</label>
            <Input
              type="date"
              className={filterControlClass}
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>
        </div>
      </div>
    </ProfileHeroBanner>
  );
}
