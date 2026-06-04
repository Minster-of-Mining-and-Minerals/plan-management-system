"use client";

import { Building2 } from "lucide-react";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";

interface DepartmentTabProps {
  state: PlanDashboardFiltersState;
}

export function DepartmentTab({ state }: DepartmentTabProps) {
  const grouped = state.data.structures
    .filter(
      (s) =>
        state.filters.structureId === "all" || s.id === state.filters.structureId
    )
    .map((structure) => ({
      structure,
      departments: state.filteredDepartments.filter(
        (d) => d.structureId === structure.id
      ),
    }))
    .filter((g) => g.departments.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Department Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Departments grouped by structure — filtered by global mock filters.
        </p>
      </div>

      {grouped.map(({ structure, departments }) => (
        <section key={structure.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-golden-dark" />
            <h3 className="font-semibold text-golden-dark">{structure.name}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="rounded-xl border bg-white p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-golden-dark">{dept.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dept.planCount} plans (mock)
                    </p>
                  </div>
                  <StatusBadge status={dept.status} />
                </div>
                <ProgressBar value={dept.progress} label="Progress" />
              </div>
            ))}
          </div>
        </section>
      ))}

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No departments match the current filters.
        </div>
      )}
    </div>
  );
}
