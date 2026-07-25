"use client";

import { PieChart, ShieldCheck, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPredictiveAnalyticsQuery } from "@/redux/api/predictiveOperationsApi";

export function PredictionAnalyticsDashboard() {
  const { data: analytics, isLoading } = useGetPredictiveAnalyticsQuery();

  if (isLoading || !analytics) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading predictive analytics...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">Predictive Analytics & Model Efficacy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Prediction Accuracy</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{analytics.prediction_accuracy_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">False Positives</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">{analytics.false_positive_rate_pct}%</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Prevented Incidents</div>
            <div className="text-base font-bold text-indigo-600 mt-0.5">{analytics.prevented_incidents_count}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Risk Reduction</div>
            <div className="text-base font-bold text-teal-600 mt-0.5">{analytics.risk_reduction_rate_pct}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
