"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegionalNationalDashboardTab } from "./RegionalNationalDashboardTab";
import { RegionalAssignedRequirementsTab } from "./RegionalAssignedRequirementsTab";
import { RegionalPublicationHistoryTab } from "./RegionalPublicationHistoryTab";
import { BarChart3, Globe, Layers, History, ShieldCheck } from "lucide-react";

interface Props {
  regionId: string;
}

export function RegionalNationalReportingView({ regionId }: Props) {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <ShieldCheck className="h-4 w-4" />
            National Reporting Integration
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            National Reporting Mandates
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Prepare potential mappings with regional plan nodes, confirm reporting periods, and transmit validated achievements to the Federal National Gateway.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4" />
            National Reporting Dashboard
          </TabsTrigger>
          <TabsTrigger value="assigned">
            <Layers className="h-4 w-4" />
            Assigned Indicators & Mappings
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4" />
            Publication Receipts & History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 outline-none">
          <RegionalNationalDashboardTab regionId={regionId} />
        </TabsContent>

        <TabsContent value="assigned" className="space-y-6 outline-none">
          <RegionalAssignedRequirementsTab regionId={regionId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-6 outline-none">
          <RegionalPublicationHistoryTab regionId={regionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

