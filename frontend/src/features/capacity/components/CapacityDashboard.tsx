"use client";

import { CapacityExecutiveSummary } from "./CapacityExecutiveSummary";
import { DepartmentCapacityPanel } from "./DepartmentCapacityPanel";
import { ProviderAvailabilityBoard } from "./ProviderAvailabilityBoard";
import { ForecastDashboard } from "./ForecastDashboard";
import { ResourceAllocationBoard } from "./ResourceAllocationBoard";
import { OperationalRecommendationsPanel } from "./OperationalRecommendationsPanel";
import { ThroughputDashboard } from "./ThroughputDashboard";

export function CapacityDashboard() {
  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header Executive Capacity Summary */}
      <CapacityExecutiveSummary />

      {/* Main Grid: Capacity, Resources, Recommendations & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <DepartmentCapacityPanel />
          <ThroughputDashboard />
          <ProviderAvailabilityBoard />
          <ResourceAllocationBoard />
        </div>

        {/* Right Sidebar: Recommendations & Demand Forecast */}
        <div className="space-y-4">
          <OperationalRecommendationsPanel />
          <ForecastDashboard />
        </div>
      </div>
    </div>
  );
}
