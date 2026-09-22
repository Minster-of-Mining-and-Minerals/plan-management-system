"use client";

import { useState } from "react";
import { useGetWorkflowExecutionStateQuery, useCompleteWorkflowExecutionStepMutation, useForwardWorkflowExecutionStepMutation } from "@/redux/api/clinicalWorkflowApi";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow, CheckCircle2, FastForward, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  appointmentId: string;
}

export function StaffWorkflowPanel({ appointmentId }: Props) {
  const { data: response, isLoading, refetch } = useGetWorkflowExecutionStateQuery(appointmentId);
  const [completeStep, { isLoading: isCompleting }] = useCompleteWorkflowExecutionStepMutation();
  const [forwardStep, { isLoading: isForwarding }] = useForwardWorkflowExecutionStepMutation();
  
  const [notes, setNotes] = useState("");

  const instance = response?.data;

  if (isLoading) {
    return <div className="p-4 flex items-center justify-center animate-pulse"><Workflow className="animate-spin mr-2"/> Loading Workflow State...</div>;
  }

  if (!instance) {
    return null; // No active workflow
  }

  const currentStepDefId = instance.current_step_id;
  const currentStepDef = instance.workflowDefinition?.stepDefinitions?.find((s: any) => s.step_id === currentStepDefId);
  const activeStepInstance = instance.stepInstances?.find((si: any) => si.status === "ACTIVE" || si.status === "PENDING");

  const handleComplete = async () => {
    if (!activeStepInstance) return;
    try {
      await completeStep({
        appointment_id: appointmentId,
        step_instance_id: activeStepInstance.step_instance_id,
        notes,
      }).unwrap();
      toast.success("Step completed");
      setNotes("");
      refetch();
    } catch (error) {
      toast.error("Failed to complete step");
    }
  };

  const handleForward = async () => {
    // In a real app we'd open a modal to select to_staff_id.
    // For demonstration, we'll prompt or use a hardcoded fallback if missing, but it's required.
    const toStaffId = prompt("Enter the User ID of the staff to forward to:");
    if (!toStaffId) return;

    if (!activeStepInstance) return;
    try {
      await forwardStep({
        appointment_id: appointmentId,
        step_instance_id: activeStepInstance.step_instance_id,
        to_staff_id: toStaffId,
        notes,
      }).unwrap();
      toast.success("Step forwarded successfully");
      setNotes("");
      refetch();
    } catch (error) {
      toast.error("Failed to forward step");
    }
  };

  return (
    <Card className="border shadow-sm border-indigo-100 dark:border-indigo-900/50">
      <CardHeader className="py-3 border-b bg-indigo-50/50 dark:bg-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Current Workflow Task</CardTitle>
          </div>
          <Badge variant={instance.status === "COMPLETED" ? "success" : "default"}>{instance.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-sm">
        {instance.status === "COMPLETED" ? (
          <div className="text-center text-emerald-600 py-4 flex flex-col items-center">
            <CheckCircle2 className="h-8 w-8 mb-2" />
            <p className="font-semibold">Workflow Completed</p>
          </div>
        ) : currentStepDef ? (
          <div className="space-y-3">
            <div>
              <div className="font-semibold text-lg">{currentStepDef.name}</div>
              <div className="text-muted-foreground text-xs uppercase tracking-wide">
                Step {currentStepDef.step_number} • {currentStepDef.type}
              </div>
            </div>
            
            <Textarea 
              placeholder="Add clinical notes for this step..." 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-xs min-h-[80px]"
            />
          </div>
        ) : (
          <div className="text-muted-foreground">Waiting for workflow to advance...</div>
        )}
      </CardContent>

      {instance.status !== "COMPLETED" && activeStepInstance && (
        <CardFooter className="bg-slate-50/50 dark:bg-slate-900/20 py-3 flex gap-2 border-t">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleComplete}
            disabled={isCompleting || isForwarding}
          >
            {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Complete Step
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForward}
            disabled={isCompleting || isForwarding}
          >
            <FastForward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
