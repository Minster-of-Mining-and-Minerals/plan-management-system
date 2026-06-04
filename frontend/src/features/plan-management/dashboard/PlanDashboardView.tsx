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

export default function PlanDashboardView() {
  const dashboardState = usePlanDashboardFilters();
  const { activeSection } = dashboardState;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-golden-dark">Dashboard</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          National plan management overview — structure, department, and user performance
          with mock data. Ready for backend integration.
        </p>
      </div>

      <PlanDashboardFiltersBar state={dashboardState} />

      <main className="rounded-xl border border-border bg-golden-dark/5 p-5 sm:p-6 min-h-[420px]">
        {activeSection === "overview" && <OverviewTab />}
        {activeSection === "structure" && <StructureTab state={dashboardState} />}
        {activeSection === "department" && <DepartmentTab state={dashboardState} />}
        {activeSection === "user" && <UserTab state={dashboardState} />}
        {activeSection === "progress" && <ProgressTab state={dashboardState} />}
        {activeSection === "sharing" && <SharingAnalysisTab />}
        {activeSection === "reports" && <ReportsTab state={dashboardState} />}
      </main>
    </div>
  );
}
