"use client";

import { Activity, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetThroughputQuery } from "@/redux/api/capacityApi";

export function ThroughputDashboard() {
  const { data: throughput, isLoading } = useGetThroughputQuery();

  if (isLoading || !throughput) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading department throughput metrics...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">Department Throughput Engine</CardTitle>
          <Badge variant="outline" className="ml-auto text-[9px]">{throughput.completion_trend}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Patients / Hour</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{throughput.patients_per_hour}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Orders / Hour</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">{throughput.orders_per_hour}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Avg Turnaround</div>
            <div className="text-base font-bold mt-0.5">{throughput.average_turnaround_time_minutes}m</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
