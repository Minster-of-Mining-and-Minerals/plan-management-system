"use client";

import { useState } from "react";
import { Lightbulb, CheckCircle2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPredictiveRecommendationsQuery, useExecutePreventiveActionMutation } from "@/redux/api/predictiveOperationsApi";

export function RecommendationDecisionPanel() {
  const { data: recommendations = [], isLoading } = useGetPredictiveRecommendationsQuery();
  const [executePreventive, { isLoading: isExecuting }] = useExecutePreventiveActionMutation();
  const [message, setMessage] = useState<string | null>(null);

  const handlePreventiveAction = async (rec: any) => {
    try {
      await executePreventive({ action_type: rec.action_type, department: rec.affected_department }).unwrap();
      setMessage(`Preventive Action '${rec.title}' executed successfully!`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`Execution failed: ${err?.message || "Error"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">AI Preventive Decision Support</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2 max-h-[300px] overflow-y-auto">
        {message && <div className="p-2 border rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">{message}</div>}

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Generating AI decision recommendations...</div>
        ) : (
          recommendations.map((rec: any) => (
            <div key={rec.id} className="p-2.5 border rounded space-y-1.5 hover:bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">{rec.affected_department}</Badge>
                    <span className="font-semibold text-[11px]">{rec.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                  <div className="text-[9px] text-emerald-600 font-medium">Expected Impact: {rec.expected_benefit} (Confidence: {rec.confidence_score}%)</div>
                </div>
                <Button size="sm" variant="default" className="h-6 text-[9px] shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={isExecuting} onClick={() => handlePreventiveAction(rec)}>
                  <Zap className="h-3 w-3 mr-1" /> Intervene
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
