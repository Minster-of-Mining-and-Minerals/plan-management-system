"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NationalRequirementsTab } from "./NationalRequirementsTab";
import { RegionalAssignmentsTab } from "./RegionalAssignmentsTab";
import { PublishedSubmissionsTab } from "./PublishedSubmissionsTab";
import { NationalDashboardTab } from "./NationalDashboardTab";
import {
  Layers,
  Share2,
  FileCheck,
  BarChart3,
  Globe2,
} from "lucide-react";

export function NationalReportingView() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <Globe2 className="h-4 w-4" />
            Federal Gateway & National Aggregation Framework
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            National Reporting Framework
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Define national indicators, assign reporting mandates to regional states, and monitor validated provincial achievements.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl">
          <TabsTrigger
            value="dashboard"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <BarChart3 className="h-4 w-4" />
            National Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <Layers className="h-4 w-4" />
            Requirements Catalog
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <Share2 className="h-4 w-4" />
            Regional Assignments
          </TabsTrigger>
          <TabsTrigger
            value="submissions"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <FileCheck className="h-4 w-4" />
            Published Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 outline-none">
          <NationalDashboardTab />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6 outline-none">
          <NationalRequirementsTab />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6 outline-none">
          <RegionalAssignmentsTab />
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6 outline-none">
          <PublishedSubmissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

