"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, RotateCcw } from "lucide-react";
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

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <PlanDashboardSectionTabs
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-golden-dark">
            <Filter className="h-4 w-4" />
            Global Filters
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 border border-emerald-100">
              Live Data
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1.5">
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
          />
          <FilterDropdown
            label="Department"
            value={filters.departmentId}
            options={departmentOpts}
            onChange={(v) => updateFilter("departmentId", v)}
          />
          <FilterDropdown
            label="User"
            value={filters.userId}
            options={userOpts}
            onChange={(v) => updateFilter("userId", v)}
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
          />
          <div className="space-y-1.5 min-w-[130px]">
            <label className="text-xs text-muted-foreground">Date From</label>
            <Input
              type="date"
              className="h-9 bg-white"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 min-w-[130px]">
            <label className="text-xs text-muted-foreground">Date To</label>
            <Input
              type="date"
              className="h-9 bg-white"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
