"use client";

import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { useRegionalPlanDashboardFilters } from "./dashboard/hooks/useRegionalPlanDashboardFilters";
import { RegionalPlanDashboardFiltersBar } from "./dashboard/components/RegionalPlanDashboardFiltersBar";
import { RegionalOverviewTab } from "./dashboard/tabs/RegionalOverviewTab";
import { RegionalHierarchyTab } from "./dashboard/tabs/RegionalHierarchyTab";
import { RegionalDirectoratesTab } from "./dashboard/tabs/RegionalDirectoratesTab";
import { RegionalAssigneesTab } from "./dashboard/tabs/RegionalAssigneesTab";
import { RegionalExecutionTreeTab } from "./dashboard/tabs/RegionalExecutionTreeTab";
import { RegionalSharingAnalysisTab } from "./dashboard/tabs/RegionalSharingAnalysisTab";
import { RegionalReportsExportTab } from "./dashboard/tabs/RegionalReportsExportTab";
import { REGIONAL_PALETTE, hexToRgba } from "./dashboard/RegionalDashboardAppearance";

interface RegionalPlanDashboardViewProps {
  embedded?: boolean;
  overrideRegionId?: string;
}

export function RegionalPlanDashboardView({
  embedded = false,
  overrideRegionId,
}: RegionalPlanDashboardViewProps) {
  const params = useParams<{ id: string }>();
  const regionId = overrideRegionId || params?.id || "";

  const dashboardState = useRegionalPlanDashboardFilters(regionId);
  const { activeSection, isLoading, error, refetch } = dashboardState;

  if (!regionId) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs text-muted-foreground">
        No regional context identified.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div
          className="relative overflow-hidden rounded-2xl border px-6 py-5 shadow-2xs"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.12)} 0%, #ffffff 50%, ${hexToRgba(REGIONAL_PALETTE.amber.DEFAULT, 0.08)} 100%)`,
            borderColor: hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.2),
          }}
        >
          <div
            className="absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.15) }}
          />
          <div className="relative">
            <h1 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
              Regional Strategic Plan Execution Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl mt-1 leading-relaxed">
              Real-time regional performance analytics — dynamic hierarchy depth decomposition, directorate scorecards, and confirmed assignee achievements.
            </p>
          </div>
        </div>
      )}

      {/* Main Filter Bar and Section Tabs */}
      <RegionalPlanDashboardFiltersBar state={dashboardState} />

      {/* Main Content Area */}
      <main
        className="rounded-2xl border p-5 sm:p-6 min-h-[420px] shadow-sm bg-white dark:bg-card"
        style={{
          borderColor: hexToRgba(REGIONAL_PALETTE.emerald.DEFAULT, 0.15),
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-xs text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span>Loading regional execution analytics…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-xs text-destructive">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 underline hover:text-destructive/80 font-medium"
              onClick={refetch}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Query</span>
            </button>
          </div>
        ) : (
          <>
            {activeSection === "overview" && <RegionalOverviewTab state={dashboardState} />}
            {activeSection === "hierarchy" && <RegionalHierarchyTab state={dashboardState} />}
            {activeSection === "directorates" && <RegionalDirectoratesTab state={dashboardState} />}
            {activeSection === "assignees" && <RegionalAssigneesTab state={dashboardState} />}
            {activeSection === "tree" && <RegionalExecutionTreeTab state={dashboardState} />}
            {activeSection === "sharing" && <RegionalSharingAnalysisTab state={dashboardState} />}
            {activeSection === "reports" && <RegionalReportsExportTab state={dashboardState} />}
          </>
        )}
      </main>
    </div>
  );
}

export default RegionalPlanDashboardView;
