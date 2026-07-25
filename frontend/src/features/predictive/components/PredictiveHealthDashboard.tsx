"use client";

import { Cpu, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPredictiveDashboardQuery } from "@/redux/api/predictiveOperationsApi";
import { RiskForecastCard } from "./RiskForecastCard";
import { DepartmentPredictionPanel } from "./DepartmentPredictionPanel";
import { RecommendationDecisionPanel } from "./RecommendationDecisionPanel";
import { PredictionHistoryPanel } from "./PredictionHistoryPanel";
import { PredictionAnalyticsDashboard } from "./PredictionAnalyticsDashboard";

export function PredictiveHealthDashboard() {
  const { data: dashboard, isLoading } = useGetPredictiveDashboardQuery();

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Executive Predictive Intelligence Header */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-semibold">Predictive Clinical Operations & AI Decision Engine</CardTitle>
            </div>
            {dashboard && (
              <Badge className={`text-xs ${dashboard.hospital_future_risk_score <= 30 ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
                Future Risk Score: {dashboard.hospital_future_risk_score}/100
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 text-xs">
          {isLoading || !dashboard ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse">Loading predictive intelligence...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Predicted Workload Trend</div>
                <div className="text-xs font-bold text-indigo-600 mt-0.5">{dashboard.predicted_workload_trend}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Expected SLA Breaches (24h)</div>
                <div className="text-base font-bold text-amber-600 mt-0.5">{dashboard.expected_sla_breaches_count}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Prediction Accuracy</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">{dashboard.prediction_accuracy_pct}%</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Prevented Incidents</div>
                <div className="text-base font-bold text-teal-600 mt-0.5">{dashboard.prevented_incidents_count}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Predictive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PredictionAnalyticsDashboard />
          <DepartmentPredictionPanel />
          <RecommendationDecisionPanel />
        </div>

        <div className="space-y-4">
          <RiskForecastCard />
          <PredictionHistoryPanel />
        </div>
      </div>
    </div>
  );
}
