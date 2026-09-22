"use client";

import { useReorderBuilderStepsMutation, useDeleteBuilderStepMutation } from "@/redux/api/clinicalWorkflowApi";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Step {
  step_id: string;
  name: string;
  type: string;
  step_number: number;
}

interface Props {
  workflowId: string;
  steps: Step[];
}

export function WorkflowStepList({ workflowId, steps }: Props) {
  const [reorderSteps, { isLoading: isReordering }] = useReorderBuilderStepsMutation();
  const [deleteStep, { isLoading: isDeleting }] = useDeleteBuilderStepMutation();

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index - 1];
    newSteps[index - 1] = temp;
    await performReorder(newSteps);
  };

  const handleMoveDown = async (index: number) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[index + 1];
    newSteps[index + 1] = temp;
    await performReorder(newSteps);
  };

  const performReorder = async (newSteps: Step[]) => {
    try {
      await reorderSteps({
        workflow_id: workflowId,
        stepIds: newSteps.map((s) => s.step_id),
      }).unwrap();
    } catch (err) {
      toast.error("Failed to reorder steps");
    }
  };

  const handleDelete = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this step?")) return;
    try {
      await deleteStep({ workflow_id: workflowId, step_id: stepId }).unwrap();
      toast.success("Step deleted");
    } catch (err) {
      toast.error("Failed to delete step");
    }
  };

  if (!steps?.length) {
    return <div className="text-center p-8 text-muted-foreground border rounded-lg border-dashed">No steps defined yet. Click 'Add Step' to begin.</div>;
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={step.step_id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={index === 0 || isReordering}
                onClick={() => handleMoveUp(index)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={index === steps.length - 1 || isReordering}
                onClick={() => handleMoveDown(index)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <div className="font-semibold">{step.step_number}. {step.name}</div>
              <div className="text-sm text-muted-foreground">{step.type}</div>
            </div>
          </div>
          <div>
            <Button
              variant="destructive"
              size="icon"
              disabled={isDeleting}
              onClick={() => handleDelete(step.step_id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
