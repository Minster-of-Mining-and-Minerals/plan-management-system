"use client";

import { GitBranch, Lock } from "lucide-react";
import { MOCK_EXCLUSIVE_PLANS, MOCK_SHARED_PLANS } from "../mockData";
import { ChartPlaceholder } from "../components/ChartPlaceholder";
import { ProgressBar } from "../components/ProgressBar";
import { SharingBadge, StatusBadge } from "../components/StatusBadge";

export function SharingAnalysisTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-golden-dark">Shared vs Exclusive Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Compare assignment modes and branch propagation — visual placeholders only.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-violet-700 font-semibold">
            <GitBranch className="h-4 w-4" />
            Shared Plans
          </div>
          <div className="space-y-3">
            {MOCK_SHARED_PLANS.map((plan) => (
              <div key={plan.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-golden-dark">{plan.title}</span>
                  <SharingBadge mode="shared" />
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {plan.branches} active branches (MIDI + GIE placeholder)
                </p>
                <ProgressBar value={plan.progress} size="sm" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Lock className="h-4 w-4" />
            Exclusive Plans
          </div>
          <div className="space-y-3">
            {MOCK_EXCLUSIVE_PLANS.map((plan) => (
              <div key={plan.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-golden-dark">{plan.title}</span>
                  <SharingBadge mode="exclusive" />
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Single target: {plan.target}
                </p>
                <ProgressBar value={plan.progress} size="sm" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartPlaceholder
          title="Sharing Mode Distribution"
          description="Shared vs exclusive plan counts"
          variant="pie"
        />
        <ChartPlaceholder
          title="Branch Comparison"
          description="Progress across parallel shared branches"
          variant="bar"
        />
      </div>
    </div>
  );
}
