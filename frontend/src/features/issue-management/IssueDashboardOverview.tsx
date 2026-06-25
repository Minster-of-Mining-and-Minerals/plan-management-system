"use client";

import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { IssueDashboardStatsCards } from "./components/IssueDashboardStatsCards";
import { IssueIssuesTablePanel } from "./components/IssueIssuesTablePanel";
import { IssueRecentListPanel } from "./components/IssueRecentListPanel";
import { useIssuesTable } from "./hooks/useIssuesTable";
import { DashboardSectionHeader } from "@/features/plan-management/dashboard/components/AnalyticsPanel";
import {
  canViewAnyIssues,
  issueDashboardAnalyticsBadge,
  issueDashboardAnalyticsLabel,
  resolveDashboardIssueListScope,
} from "./utils/issueListScopeUtils";
import type { IssueStatus } from "@/redux/types/issue";

export default function IssueDashboardOverview() {
  const { can, canAny } = usePermissions();

  const listScope = useMemo(() => resolveDashboardIssueListScope(can), [can]);
  const tableState = useIssuesTable({ listScope });

  if (!canViewAnyIssues(can, canAny)) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        You do not have permission to view the issue dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="Issue Overview"
        description={issueDashboardAnalyticsLabel(can)}
        badge={issueDashboardAnalyticsBadge(can)}
      />

      <IssueDashboardStatsCards
        stats={tableState.stats}
        isLoading={tableState.statsLoading}
        activeStatus={(tableState.statusFilter as IssueStatus) || "all"}
        onStatusClick={tableState.handleStatusClick}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 lg:col-span-2">
          <IssueIssuesTablePanel
            title="Issues"
            description="Summary of issue activity in your accessible scope."
            filterColumnsPerRow={2}
            listScope={listScope}
            tableState={tableState}
          />
        </div>
        <div className="min-w-0 lg:col-span-1">
          <IssueRecentListPanel listScope={listScope} />
        </div>
      </div>
    </div>
  );
}
