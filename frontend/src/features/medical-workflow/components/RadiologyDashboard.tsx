"use client";

import { Activity, Clock, FileCheck, Film, Layers, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetOverviewAnalyticsQuery,
  useGetModalityAnalyticsQuery,
  useGetPerformanceAnalyticsQuery,
} from "@/redux/api/radiologyApi";

export function RadiologyDashboard() {
  const { data: overview } = useGetOverviewAnalyticsQuery();
  const { data: modalities } = useGetModalityAnalyticsQuery();
  const { data: performance = [] } = useGetPerformanceAnalyticsQuery();

  return (
    <div className="space-y-4 my-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-purple-900 dark:text-purple-300">
            <Activity className="h-5 w-5 text-purple-600" /> Radiology Department Performance Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Operational study metrics, modality distributions, and radiologist reporting turnaround times.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 border border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Total Studies</span>
            <Film className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold mt-1">{overview?.total_studies || 0}</div>
          <div className="text-[10px] text-muted-foreground">All imaging procedures</div>
        </Card>

        <Card className="p-3 border border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Completed</span>
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold mt-1 text-emerald-600">{overview?.completed_studies || 0}</div>
          <div className="text-[10px] text-muted-foreground">Signed & verified reports</div>
        </Card>

        <Card className="p-3 border border-amber-200 dark:border-amber-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Pending Reports</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold mt-1 text-amber-600">{overview?.pending_reports || 0}</div>
          <div className="text-[10px] text-muted-foreground">Awaiting radiologist signoff</div>
        </Card>

        <Card className="p-3 border border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Avg. Turnaround</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold mt-1 text-blue-600">{overview?.avg_turnaround_hours || 0} hrs</div>
          <div className="text-[10px] text-muted-foreground">Order to report sign-off</div>
        </Card>
      </div>

      {/* Modality & Performance Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Modality Distribution */}
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" /> Imaging Modality Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {modalities ? (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(modalities).map(([mod, count]) => (
                  <div key={mod} className="p-2 border rounded flex items-center justify-between bg-background">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{mod}</span>
                    <Badge variant="secondary" className="font-mono text-[11px]">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Loading modality stats...</div>
            )}
          </CardContent>
        </Card>

        {/* Radiologist Performance */}
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-600" /> Radiologist Workload & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {performance.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">No radiologist performance data yet.</div>
            ) : (
              <div className="space-y-2">
                {performance.map((rad) => (
                  <div key={rad.user_id} className="p-2 border rounded flex items-center justify-between bg-background">
                    <div>
                      <div className="font-semibold">{rad.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {rad.verified_count} verified | {rad.pending_count} pending
                      </div>
                    </div>
                    <Badge className="bg-purple-600 text-white text-[11px]">
                      {rad.reports_completed} Reports
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
