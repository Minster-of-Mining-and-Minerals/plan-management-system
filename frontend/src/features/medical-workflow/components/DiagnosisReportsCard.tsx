"use client";

import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";
import { PermissionGuard } from "@/components/common/PermissionGuard";
import { MedicalHistoryTimeline } from "../MedicalHistoryTimeline";
import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";
import { WORKFLOW_PERMISSIONS } from "../workflowPermissions";

type Props = {
  entries: MedicalHistoryLog[];
  pendingTask?: boolean;
  workflowDone?: boolean;
  canAddWorkflow?: boolean;
  onAddWorkflow?: () => void;
};

export function DiagnosisReportsCard({
  entries,
  pendingTask,
  workflowDone,
  canAddWorkflow,
  onAddWorkflow,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Diagnosis reports</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Review saved reports for this appointment. Adding a new workflow is
            optional.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendingTask && (
            <Badge variant="default" className="gap-1">
              <Inbox className="h-3 w-3" />
              Task pending
            </Badge>
          )}
          {workflowDone && (
            <Badge variant="secondary">Workflow completed</Badge>
          )}
          {canAddWorkflow && onAddWorkflow && (
            <PermissionGuard requireAll={[WORKFLOW_PERMISSIONS.SUBMIT]} fallback={null}>
              <Button type="button" size="sm" onClick={onAddWorkflow}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add new workflow
              </Button>
            </PermissionGuard>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <MedicalHistoryTimeline entries={entries} collapsible />
      </CardContent>
    </Card>
  );
}
