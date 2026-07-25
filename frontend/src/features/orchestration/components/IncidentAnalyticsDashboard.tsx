"use client";

import { Activity, Clock, ShieldCheck, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetIncidentAnalyticsQuery } from "@/redux/api/incidentApi";

export function IncidentAnalyticsDashboard() {
  const { data: analytics, isLoading } = useGetIncidentAnalyticsQuery();

  if (isLoading || !analytics) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading incident analytics...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Incident & Resolution Analytics</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Total Incidents</div>
            <div className="text-base font-bold mt-0.5">{analytics.total_incidents}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Mean Resolution Time</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">{analytics.mean_resolution_time_minutes}m</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Automation Success</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{analytics.automation_effectiveness_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">SLA Recovery Rate</div>
            <div className="text-base font-bold text-teal-600 mt-0.5">{analytics.sla_recovery_rate_pct}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
