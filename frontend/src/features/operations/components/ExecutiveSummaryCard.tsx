"use client";

import { Activity, ShieldAlert, Award, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetExecutiveSummaryQuery } from "@/redux/api/operationsApi";

export function ExecutiveSummaryCard() {
  const { data: summary, isLoading } = useGetExecutiveSummaryQuery();

  if (isLoading || !summary) {
    return <div className="p-4 border rounded animate-pulse text-xs text-muted-foreground text-center">Loading Executive Summary...</div>;
  }

  const scoreColor = summary.operational_score >= 90 ? "bg-emerald-600 text-white" : summary.operational_score >= 75 ? "bg-yellow-500 text-black" : "bg-red-600 text-white";

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Executive Operations Summary</CardTitle>
          </div>
          <Badge className={`text-xs px-2.5 py-0.5 font-bold ${scoreColor}`}>
            Score: {summary.operational_score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Active Encounters</div>
            <div className="text-base font-bold mt-0.5">{summary.hospital_overview.active_encounters}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Orders / Day</div>
            <div className="text-base font-bold mt-0.5">{summary.todays_workload.total_orders}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">SLA Compliance</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{summary.sla_health.sla_compliance_percentage}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 dark:bg-slate-800/40">
            <div className="text-muted-foreground text-[10px]">Critical Alerts</div>
            <div className="text-base font-bold text-red-600 mt-0.5">{summary.critical_alerts.sla_breaches}</div>
          </div>
        </div>

        <div className="border-t pt-2 space-y-1">
          <div className="font-semibold text-[11px] text-muted-foreground">Department Workload Ranking</div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            {summary.department_ranking.map((dept) => (
              <div key={dept.department} className="p-1.5 border rounded">
                <span className="font-medium text-slate-700 dark:text-slate-200">{dept.department}</span>
                <div className="text-[10px] text-muted-foreground">{dept.workload} active ({dept.sla_breaches} breaches)</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
