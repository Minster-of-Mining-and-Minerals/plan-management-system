"use client";

import { Workflow, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetWorkflowDefinitionsQuery, useGetWorkflowExecutionStateQuery, type ClinicalWorkflowDefinition } from "@/redux/api/clinicalWorkflowApi";

interface Props {
  appointmentId?: string;
}

export function DynamicClinicalWorkflowRenderer({ appointmentId }: Props = {}) {
  const { data: workflows = [], isLoading: isDefinitionsLoading } = useGetWorkflowDefinitionsQuery(undefined, { skip: !!appointmentId });
  const { data: executionResponse, isLoading: isExecutionLoading } = useGetWorkflowExecutionStateQuery(appointmentId as string, { skip: !appointmentId });

  const isExecutionMode = !!appointmentId;
  const instance = executionResponse?.data;
  const isLoading = isDefinitionsLoading || isExecutionLoading;

  if (isExecutionMode) {
    if (isLoading) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-4 text-center text-muted-foreground animate-pulse">Loading live workflow state...</CardContent>
        </Card>
      );
    }
    if (!instance) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-4 text-center text-muted-foreground">No active workflow.</CardContent>
        </Card>
      );
    }

    const wfDef = instance.workflowDefinition;
    return (
      <Card className="border shadow-sm border-indigo-100">
        <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-semibold">Live Patient Workflow: {wfDef?.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 text-xs space-y-2">
          {wfDef?.stepDefinitions?.map((s: any) => {
            const stepInst = instance.stepInstances?.find((si: any) => si.step_id === s.step_id);
            const isCompleted = stepInst?.status === "COMPLETED";
            const isActive = instance.current_step_id === s.step_id && instance.status !== "COMPLETED";
            
            return (
              <div key={s.step_number} className={`flex items-center gap-2 p-2 border rounded ${isActive ? "bg-indigo-50 border-indigo-200" : isCompleted ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 opacity-60"}`}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />}
                <span>Step {s.step_number}: <strong className="font-semibold">{s.name}</strong></span>
                {isActive && <Badge variant="secondary" className="ml-auto text-[9px]">IN PROGRESS</Badge>}
                {isCompleted && <Badge variant="outline" className="ml-auto text-[9px] text-emerald-700">DONE</Badge>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

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
                {(wf.stepDefinitions || wf.steps || []).map((s: any) => (
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
