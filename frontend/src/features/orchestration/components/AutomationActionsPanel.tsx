"use client";

import { useState } from "react";
import { Zap, GitMerge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExecuteAutomationActionMutation, useEvaluateCrossDomainImpactMutation } from "@/redux/api/incidentApi";

export function AutomationActionsPanel() {
  const [executeAction] = useExecuteAutomationActionMutation();
  const [evaluateCrossDomain] = useEvaluateCrossDomainImpactMutation();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleAutomation = async (actionType: string) => {
    try {
      await executeAction({ recommendation_id: "rec-cap-01", action_type: actionType }).unwrap();
      setStatusMsg(`Automated Action '${actionType}' Executed!`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Execution Failed: ${err?.message || "Error"}`);
    }
  };

  const handleCrossDomain = async () => {
    try {
      const res = await evaluateCrossDomain({ source_department: "LABORATORY", delay_minutes: 45 }).unwrap();
      setStatusMsg(`Cross-Domain Impact Coordinated (${res.downstream_impact_count} actions)`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(`Evaluation Error: ${err?.message || "Error"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Hospital Automation & Cross-Domain Engine</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">Event-Driven</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        <div className="text-[11px] text-muted-foreground">
          Translate operational recommendations into executed resource allocations and evaluate downstream delays across Lab, Radiology, Pharmacy, Care Plans.
        </div>

        {statusMsg && <div className="p-2 border rounded bg-amber-50 text-amber-800 text-[10px] font-medium">{statusMsg}</div>}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleAutomation("OPEN_ROOM")}>
            <Zap className="h-3 w-3 mr-1 text-amber-500" /> Execute Room Action
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={handleCrossDomain}>
            <GitMerge className="h-3 w-3 mr-1 text-indigo-600" /> Evaluate Downstream
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
