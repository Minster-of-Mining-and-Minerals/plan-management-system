"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetDepartmentCapacityQuery } from "@/redux/api/capacityApi";

const DEPARTMENTS = ["LABORATORY", "RADIOLOGY", "PHARMACY", "CONSULTATION"];

export function DepartmentCapacityPanel() {
  const [selectedDept, setSelectedDept] = useState("LABORATORY");
  const { data: deptCap, isLoading } = useGetDepartmentCapacityQuery(selectedDept);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-semibold">Department Capacity & Utilization</CardTitle>
          </div>
          {deptCap && (
            <Badge className={`text-[9px] ${deptCap.status === "OVERLOADED" ? "bg-red-600 text-white" : deptCap.status === "BUSY" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
              {deptCap.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto">
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
        {isLoading || !deptCap ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading department capacity...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 border rounded">
              <div className="text-muted-foreground text-[10px]">Utilization</div>
              <div className="text-base font-bold mt-0.5">{deptCap.utilization_percentage}%</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-muted-foreground text-[10px]">Active Workload</div>
              <div className="text-base font-bold text-indigo-600 mt-0.5">{deptCap.current_capacity} / {deptCap.max_capacity}</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-muted-foreground text-[10px]">Available Slots</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">{deptCap.available_capacity}</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-muted-foreground text-[10px]">Avg Turnaround</div>
              <div className="text-base font-bold mt-0.5">{deptCap.average_waiting_time_minutes}m</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
