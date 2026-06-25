"use client";

import { usePlanDashboardFilters } from "./hooks/usePlanDashboardFilters";
import { PlanDashboardFiltersBar } from "./components/PlanDashboardFiltersBar";
import { OverviewTab } from "./tabs/OverviewTab";
import { StructureTab } from "./tabs/StructureTab";
import { DepartmentTab } from "./tabs/DepartmentTab";
import { UserTab } from "./tabs/UserTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { SharingAnalysisTab } from "./tabs/SharingAnalysisTab";
import { ReportsTab } from "./tabs/ReportsTab";
import { Loader2 } from "lucide-react";
import { useDashboardAppearance } from "./hooks/useDashboardAppearance";
import { hexToRgba } from "./utils/dashboardAppearanceUtils";

interface PlanDashboardViewProps {
  embedded?: boolean;
}

export default function PlanDashboardView({ embedded = false }: PlanDashboardViewProps) {
  const dashboardState = usePlanDashboardFilters();
  const { activeSection } = dashboardState;
  const { tone, textPrimary } = useDashboardAppearance();
  const primary = tone("primary");
  const accent = tone("accent");

  return (
    <div className="space-y-6">
      {!embedded && (
        <div
          className="relative overflow-hidden rounded-2xl border px-6 py-5"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(primary.color, 0.14)} 0%, #ffffff 50%, ${hexToRgba(accent.color, 0.1)} 100%)`,
            borderColor: hexToRgba(primary.color, 0.15),
          }}
        >
          <div
            className="absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: hexToRgba(primary.color, 0.12) }}
          />
          <div className="relative">
            <h1 className="text-2xl font-bold" style={{ color: textPrimary }}>
              Plan Execution Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl mt-1">
              National plan management overview — structure, department, and user performance
              from live rollup data.
            </p>
          </div>
        </div>
      )}

      <PlanDashboardFiltersBar state={dashboardState} />

      <main
        className="rounded-2xl border p-5 sm:p-6 min-h-[420px] shadow-sm"
        style={{
          borderColor: hexToRgba(primary.color, 0.12),
          background: `linear-gradient(180deg, #ffffff 0%, ${hexToRgba(primary.color, 0.03)} 100%)`,
        }}
      >
        {dashboardState.data.isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-sm text-muted-foreground">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: primary.color }}
            />
            Loading execution dashboard…
          </div>
        ) : dashboardState.data.error ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-sm text-destructive">
            <p>{dashboardState.data.error}</p>
            <button
              type="button"
              className="underline"
              onClick={() => dashboardState.refetch()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeSection === "overview" && <OverviewTab state={dashboardState} />}
            {activeSection === "structure" && <StructureTab state={dashboardState} />}
            {activeSection === "department" && <DepartmentTab state={dashboardState} />}
            {activeSection === "user" && <UserTab state={dashboardState} />}
            {activeSection === "progress" && <ProgressTab state={dashboardState} />}
            {activeSection === "sharing" && <SharingAnalysisTab state={dashboardState} />}
            {activeSection === "reports" && <ReportsTab state={dashboardState} />}
          </>
        )}
      </main>
    </div>
  );
}
