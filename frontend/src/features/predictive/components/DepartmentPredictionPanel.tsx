"use client";

import { useState } from "react";
import { Building2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetDepartmentPredictionsQuery } from "@/redux/api/predictiveOperationsApi";

const DEPARTMENTS = ["RADIOLOGY", "LABORATORY", "PHARMACY", "EMERGENCY", "CONSULTATION"];

export function DepartmentPredictionPanel() {
  const [selectedDept, setSelectedDept] = useState("RADIOLOGY");
  const { data: deptData, isLoading } = useGetDepartmentPredictionsQuery(selectedDept);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Department Intelligence Panel</CardTitle>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {DEPARTMENTS.map((d) => (
              <Button key={d} size="sm" variant={selectedDept === d ? "default" : "ghost"} className="h-6 text-[9px] px-2" onClick={() => setSelectedDept(d)}>
                {d}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2">
        {isLoading || !deptData ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading department predictions...</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">{deptData.department} Operational Status</span>
              <Badge variant="outline" className="text-[9px]">{deptData.current_status}</Badge>
            </div>
            {deptData.predictions.map((p, idx) => (
              <div key={idx} className="p-2 border rounded space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold">{p.prediction_type} ({p.expected_time})</span>
                  <span className="text-indigo-600 font-bold">{p.probability}% Probability</span>
                </div>
                <div className="text-[9px] text-muted-foreground">{p.reason.join(" • ")}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
