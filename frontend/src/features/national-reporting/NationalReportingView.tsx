"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NationalRequirementsTab } from "./NationalRequirementsTab";
import { RegionalAssignmentsTab } from "./RegionalAssignmentsTab";
import { PublishedSubmissionsTab } from "./PublishedSubmissionsTab";
import { NationalDashboardTab } from "./NationalDashboardTab";
import { NationalReportingConfigView } from "./NationalReportingConfigView";

interface Props {
  defaultTab?: "dashboard" | "requirements" | "assignments" | "submissions" | "configuration" | string;
}

export function NationalReportingView({ defaultTab = "dashboard" }: Props) {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");

  const activeView = useMemo(() => {
    if (urlTab) return urlTab;
    return defaultTab;
  }, [urlTab, defaultTab]);

  return (
    <div className="space-y-6">
      {activeView === "dashboard" && <NationalDashboardTab />}
      {activeView === "requirements" && <NationalRequirementsTab />}
      {activeView === "assignments" && <RegionalAssignmentsTab />}
      {activeView === "submissions" && <PublishedSubmissionsTab />}
      {activeView === "configuration" && <NationalReportingConfigView />}
    </div>
  );
}
