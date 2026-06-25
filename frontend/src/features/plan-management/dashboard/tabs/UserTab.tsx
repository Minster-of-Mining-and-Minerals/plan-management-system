"use client";

import type { PlanDashboardFiltersState } from "../hooks/usePlanDashboardFilters";
import { DashboardSectionHeader } from "../components/AnalyticsPanel";
import { RankedLeaderboard } from "../components/RankedLeaderboard";
import { UserPerformanceTable } from "../components/UserPerformanceTable";
import { AnalyticsPanel } from "../components/AnalyticsPanel";
import { Users, Target, ClipboardCheck } from "lucide-react";
import { useDashboardAppearance } from "../hooks/useDashboardAppearance";

interface UserTabProps {
  state: PlanDashboardFiltersState;
}

export function UserTab({ state }: UserTabProps) {
  const { textPrimary } = useDashboardAppearance();
  const users = state.filteredUsers;
  const reportingUsers = users.filter((u) => u.has_progress);
  const totalAssigned = users.reduce((sum, u) => sum + u.assignedNodeCount, 0);
  const totalReported = users.reduce((sum, u) => sum + u.reportedNodeCount, 0);

  const topPerformers = [...reportingUsers]
    .filter((u) => u.achievementPercent != null)
    .sort((a, b) => (b.achievementPercent ?? 0) - (a.achievementPercent ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader
        title="User Performance"
        description="Individual assignee achievement from internal plan assignments in the focused execution period."
        badge={`${reportingUsers.length} reporting`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnalyticsPanel title="Assignees" icon={Users} variant="gradient" tone="info">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {users.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Users with plan assignments</p>
        </AnalyticsPanel>
        <AnalyticsPanel title="Assigned Nodes" icon={Target} variant="accent" tone="accent">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {totalAssigned}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Across filtered scope</p>
        </AnalyticsPanel>
        <AnalyticsPanel title="Reported" icon={ClipboardCheck} variant="default" tone="success">
          <p className="text-3xl font-bold tabular-nums" style={{ color: textPrimary }}>
            {totalReported}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {totalAssigned > 0
              ? `${Math.round((totalReported / totalAssigned) * 100)}% coverage`
              : "No assignments"}
          </p>
        </AnalyticsPanel>
      </div>

      {topPerformers.length > 0 && (
        <RankedLeaderboard
          title="Top Performers"
          description="Highest achievement among reporting assignees"
          entries={topPerformers.map((user) => ({
            id: user.id,
            title: user.name,
            subtitle: `${user.reportedNodeCount}/${user.assignedNodeCount} nodes · ${user.role}`,
            value: user.achievementPercent ?? 0,
          }))}
        />
      )}

      <UserPerformanceTable state={state} />
    </div>
  );
}
