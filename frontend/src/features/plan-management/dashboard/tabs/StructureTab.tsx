"use client";

import { useState } from "react";
import { Building2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { PerformanceBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { CircularProgress } from "../../components/CircularProgress";

interface StructureTabProps {
  state: PlanDashboardFiltersState;
}

export function StructureTab({ state }: StructureTabProps) {
  const structures =
    state.filters.structureId === "all"
      ? state.data.structures
      : state.data.structures.filter((s) => s.id === state.filters.structureId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Structure Performance</h2>
        <p className="text-sm text-muted-foreground">
          Sector-level plan metrics from live execution rollups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {structures.map((structure) => (
          <StructureCard key={structure.id} structure={structure} state={state} />
        ))}
      </div>
    </div>
  );
}

function StructureCard({
  structure,
  state,
}: {
  structure: (typeof state.data.structures)[0];
  state: PlanDashboardFiltersState;
}) {
  const [expanded, setExpanded] = useState(false);
  const depts = state.data.departments.filter((d) => d.structureId === structure.id);

  const progressColor =
    structure.completionPercent >= 80
      ? "#059669"
      : structure.completionPercent >= 60
        ? "#2563eb"
        : "#d97706";

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/5 p-2.5">
              <Building2 className="h-5 w-5 text-golden-dark" />
            </div>
            <div>
              <h3 className="font-semibold text-golden-dark">{structure.name}</h3>
              <p className="text-xs text-muted-foreground">{structure.code}</p>
            </div>
          </div>
          <PerformanceBadge level={structure.performance} />
        </div>

        <div className="flex items-center gap-4">
          <CircularProgress
            value={structure.completionPercent}
            color={progressColor}
            size={72}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm flex-1">
            <div>
              <p className="text-muted-foreground text-xs">Total Plans</p>
              <p className="font-bold text-golden-dark">{structure.totalPlans}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Departments</p>
              <p className="font-bold text-golden-dark">{structure.activeDepartments}</p>
            </div>
          </div>
        </div>

        <ProgressBar value={structure.completionPercent} label="Completion" />

        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1.5 text-golden-dark"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Hide departments
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View departments
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t bg-gray-50/50 px-5 py-4 space-y-2">
          {depts.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <span>{dept.name}</span>
              <span className="text-muted-foreground tabular-nums">{dept.planCount} plans</span>
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Users className="h-3.5 w-3.5" />
            {state.data.users.filter((user) => user.structureId === structure.id).length}{" "}
            assignees tracked
          </p>
        </div>
      )}
    </div>
  );
}
