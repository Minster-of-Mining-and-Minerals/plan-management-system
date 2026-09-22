"use client";

import { useState } from "react";
import { useGetBuilderWorkflowByIdQuery } from "@/redux/api/clinicalWorkflowApi";
import { WorkflowStepList } from "./WorkflowStepList";
import { AddWorkflowStepDialog } from "./AddWorkflowStepDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  workflowId: string;
}

export function WorkflowBuilderPage({ workflowId }: Props) {
  const { data: response, isLoading } = useGetBuilderWorkflowByIdQuery(workflowId);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const workflow = response?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!workflow) {
    return <div>Workflow not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{workflow.name}</h1>
        <p className="text-muted-foreground">{workflow.description || "No description provided"}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workflow Steps</CardTitle>
            <CardDescription>Define the sequence of clinical events</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Step
          </Button>
        </CardHeader>
        <CardContent>
          <WorkflowStepList workflowId={workflowId} steps={workflow.stepDefinitions || []} />
        </CardContent>
      </Card>

      <AddWorkflowStepDialog
        workflowId={workflowId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
