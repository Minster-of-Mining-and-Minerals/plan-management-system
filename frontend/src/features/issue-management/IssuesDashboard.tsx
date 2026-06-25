"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { IssueDashboardStatsCards } from "./components/IssueDashboardStatsCards";
import { IssueIssuesTablePanel } from "./components/IssueIssuesTablePanel";
import { CreateIssueModal } from "./modals/CreateIssueModal";
import { ISSUE_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { useIssuesTable } from "./hooks/useIssuesTable";
import type { IssueStatus } from "@/redux/types/issue";

export default function IssuesDashboard() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  const tableState = useIssuesTable();

  const actions = [
    {
      label: "Raise Issue",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => setCreateOpen(true),
      permissions: [ISSUE_PERMISSIONS.CREATE],
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <IssueDashboardStatsCards
          stats={tableState.stats}
          isLoading={tableState.statsLoading}
          activeStatus={(tableState.statusFilter as IssueStatus) || "all"}
          onStatusClick={tableState.handleStatusClick}
        />

        <IssueIssuesTablePanel
          title="Issues"
          description="Track, review, and resolve issues across the system."
          actions={actions}
          filterColumnsPerRow={2}
          tableState={tableState}
        />
      </div>

      <CreateIssueModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
