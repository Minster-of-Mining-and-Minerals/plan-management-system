"use client";

import { useState } from "react";
import { Building2, Users, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetDepartmentDashboardQuery } from "@/redux/api/operationsApi";

const DEPARTMENTS = ["LABORATORY", "RADIOLOGY", "PHARMACY", "CONSULTATION", "NURSING"];

export function DepartmentOperationsPanel() {
  const [selectedDept, setSelectedDept] = useState("LABORATORY");
  const { data: deptData, isLoading } = useGetDepartmentDashboardQuery(selectedDept);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-semibold">Department Operations</CardTitle>
          </div>
          {deptData?.analytics && (
            <Badge variant="outline" className="text-[10px]">
              Staff Utilization: {deptData.analytics.current_staff_utilization_pct}%
            </Badge>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {DEPARTMENTS.map((dept) => (
            <Button
              key={dept}
              variant={selectedDept === dept ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedDept(dept)}
            >
              {dept}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3 text-xs">
        {isLoading || !deptData ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading department metrics...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Pending Queue</div>
                <div className="text-base font-bold text-indigo-600 mt-0.5">{deptData.analytics.pending_queue}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Completed Today</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">{deptData.analytics.completed_today}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Avg Turnaround</div>
                <div className="text-base font-bold mt-0.5">{deptData.analytics.average_turnaround_minutes}m</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">SLA Breaches</div>
                <div className="text-base font-bold text-red-600 mt-0.5">{deptData.analytics.sla_breach_count}</div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground">
              Queue details: {deptData.queue?.length || 0} items currently queued in {selectedDept}.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
