"use client";

import { UserCheck, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetWorkloadDistributionQuery } from "@/redux/api/operationsApi";

export function ProviderWorkloadPanel() {
  const { data: workload, isLoading } = useGetWorkloadDistributionQuery();

  if (isLoading || !workload) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading workload distribution...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-teal-600" />
          <CardTitle className="text-sm font-semibold">Hospital Workload Distribution</CardTitle>
          <Badge variant="outline" className="ml-auto text-[9px]">
            Avg Workload: {workload.average_workload_per_provider} / Provider
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Pending Workload</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">{workload.pending_workload}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Completed Workload</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{workload.completed_workload}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">STAT Priority</div>
            <div className="text-base font-bold text-red-600 mt-0.5">{workload.priority_workload?.STAT || 0}</div>
          </div>
        </div>

        {workload.future_prediction && (
          <div className="p-2 border rounded bg-indigo-50/40 dark:bg-indigo-950/20 text-[11px] flex justify-between items-center">
            <span>Next Hour Est. Orders: <span className="font-bold">{workload.future_prediction.estimated_next_hour_orders}</span></span>
            <Badge className="bg-indigo-600 text-white text-[9px]">Staffing Level: {workload.future_prediction.recommended_staffing_level}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
