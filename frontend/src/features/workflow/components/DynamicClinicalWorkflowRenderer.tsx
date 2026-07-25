"use client";

import { Workflow, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetWorkflowDefinitionsQuery, type ClinicalWorkflowDefinition } from "@/redux/api/clinicalWorkflowApi";

export function DynamicClinicalWorkflowRenderer() {
  const { data: workflows = [], isLoading } = useGetWorkflowDefinitionsQuery();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Configurable Dynamic Clinical Workflow Engine</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading dynamic workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No active dynamic workflow definitions found.</div>
        ) : (
          workflows.map((wf: ClinicalWorkflowDefinition) => (
            <div key={wf.workflow_id} className="p-2.5 border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">{wf.name}</span>
                <Badge variant="outline" className="text-[9px]">{wf.department_id}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{wf.description}</p>
              <div className="space-y-1 pt-1">
                {wf.steps.map((s) => (
                  <div key={s.step_number} className="flex items-center gap-2 p-1.5 border rounded bg-slate-50/50 text-[10px]">
                    <Circle className="h-3 w-3 text-indigo-600" />
                    <span>Step {s.step_number}: <strong className="font-semibold">{s.name}</strong> ({s.type})</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
