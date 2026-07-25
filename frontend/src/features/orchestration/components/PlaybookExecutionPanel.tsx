"use client";

import { BookOpen, CheckCircle2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPlaybooksQuery, useExecutePlaybookStepMutation, type ClinicalPlaybook } from "@/redux/api/incidentApi";

export function PlaybookExecutionPanel() {
  const { data: playbooks = [], isLoading } = useGetPlaybooksQuery();
  const [executeStep] = useExecutePlaybookStepMutation();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Operational Playbook Execution Engine</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading playbooks...</div>
        ) : playbooks.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No active operational playbooks defined.</div>
        ) : (
          playbooks.map((pb: ClinicalPlaybook) => (
            <div key={pb.playbook_id} className="p-2 border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">{pb.title}</span>
                <Badge variant="outline" className="text-[9px]">{pb.incident_type}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{pb.description}</p>
              <div className="space-y-1 pt-1">
                {pb.steps.map((s) => (
                  <div key={s.step_id} className="flex items-center justify-between p-1.5 border rounded bg-slate-50/50">
                    <span className="text-[10px]">{s.step_id}. {s.title} ({s.type})</span>
                    <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1.5" onClick={() => executeStep({ playbook_id: pb.playbook_id, step_id: s.step_id })}>
                      <Play className="h-2.5 w-2.5 mr-1" /> Run Step
                    </Button>
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
