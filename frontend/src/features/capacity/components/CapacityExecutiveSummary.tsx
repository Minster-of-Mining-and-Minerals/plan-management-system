"use client";

import { Gauge, ShieldAlert, Cpu, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetExecutiveCapacityQuery } from "@/redux/api/capacityApi";

export function CapacityExecutiveSummary() {
  const { data: exec, isLoading } = useGetExecutiveCapacityQuery();

  if (isLoading || !exec) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading Executive Capacity Dashboard...</div>;
  }

  const scoreColor = exec.operational_health_score >= 85 ? "bg-emerald-600 text-white" : exec.operational_health_score >= 70 ? "bg-amber-500 text-white" : "bg-red-600 text-white";

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Executive Capacity & Utilization Summary</CardTitle>
          </div>
          <Badge className={`text-xs px-2.5 py-0.5 font-bold ${scoreColor}`}>
            Health Score: {exec.operational_health_score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Hospital Utilization</div>
            <div className="text-base font-bold mt-0.5">{exec.hospital_utilization_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Room Occupancy</div>
            <div className="text-base font-bold mt-0.5">{exec.room_utilization_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Equipment Utilization</div>
            <div className="text-base font-bold mt-0.5">{exec.equipment_utilization_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Staff Coverage</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{exec.staff_coverage_pct}%</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
          <div className="p-1.5 border rounded">
            <span className="text-muted-foreground">Queue Pressure: </span>
            <span className="font-bold">{exec.queue_pressure}</span>
          </div>
          <div className="p-1.5 border rounded">
            <span className="text-muted-foreground">SLA Risk: </span>
            <span className="font-bold">{exec.sla_risk}</span>
          </div>
          <div className="p-1.5 border rounded">
            <span className="text-muted-foreground">Forecast Risk: </span>
            <span className="font-bold">{exec.forecast_risk}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
