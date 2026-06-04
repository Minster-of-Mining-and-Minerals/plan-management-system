"use client";

import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { TreeNodeRow } from "../components/TreeNodeRow";

interface ProgressTabProps {
  state: PlanDashboardFiltersState;
}

export function ProgressTab({ state }: ProgressTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Plan Progress</h2>
        <p className="text-sm text-muted-foreground">
          Hierarchical plan tree — Plan → Structure → Department → User (expandable UI).
        </p>
      </div>

      <div className="rounded-xl border bg-gray-50/30 p-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-1 mb-3">
          Plan Hierarchy (Mock)
        </p>
        {state.data.planTree.map((node) => (
          <TreeNodeRow key={node.id} node={node} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Structure Level", desc: "Sector assignments (MIDI, GIE)" },
          { label: "Department Level", desc: "Internal structure drill-down" },
          { label: "User Level", desc: "Individual execution scope" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-white p-4 text-sm">
            <p className="font-semibold text-golden-dark">{item.label}</p>
            <p className="text-muted-foreground text-xs mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
