"use client";

import { ExecutiveSummaryCard } from "./ExecutiveSummaryCard";
import { HospitalQueueDashboard } from "./HospitalQueueDashboard";
import { DepartmentOperationsPanel } from "./DepartmentOperationsPanel";
import { ProviderWorkloadPanel } from "./ProviderWorkloadPanel";
import { OperationsFeedPanel } from "./OperationsFeedPanel";
import { HospitalOperationsTimeline } from "./HospitalOperationsTimeline";

export function OperationsDashboard() {
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Top Banner / Executive Summary */}
      <ExecutiveSummaryCard />

      {/* Main Grid: Queues & Department Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <HospitalQueueDashboard />
          <DepartmentOperationsPanel />
          <ProviderWorkloadPanel />
        </div>

        {/* Right Sidebar: Real-time Feeds & Timeline */}
        <div className="space-y-4">
          <OperationsFeedPanel />
          <HospitalOperationsTimeline />
        </div>
      </div>
    </div>
  );
}
