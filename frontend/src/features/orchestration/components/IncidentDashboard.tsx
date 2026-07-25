"use client";

import { useState } from "react";
import { ShieldAlert, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetExecutiveIncidentSummaryQuery, useEvaluateRulesMutation, type ClinicalIncident } from "@/redux/api/incidentApi";
import { IncidentDetailsDrawer } from "./IncidentDetailsDrawer";
import { PlaybookExecutionPanel } from "./PlaybookExecutionPanel";
import { AutomationActionsPanel } from "./AutomationActionsPanel";
import { OperationalCommunicationPanel } from "./OperationalCommunicationPanel";
import { IncidentAnalyticsDashboard } from "./IncidentAnalyticsDashboard";

export function IncidentDashboard() {
  const { data: execSummary, isLoading } = useGetExecutiveIncidentSummaryQuery();
  const [evaluateRules, { isLoading: isEvaluating }] = useEvaluateRulesMutation();
  const [selectedIncident, setSelectedIncident] = useState<ClinicalIncident | null>(null);

  const handleEvaluateRules = async () => {
    await evaluateRules().unwrap();
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Executive Header Card */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm font-semibold">Enterprise Incident & Orchestration Command Center</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={isEvaluating} onClick={handleEvaluateRules}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isEvaluating ? "animate-spin" : ""}`} /> Evaluate Rules
              </Button>
              {execSummary && (
                <Badge className={`text-xs ${execSummary.operational_health_score >= 80 ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                  Health: {execSummary.operational_health_score}/100
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 text-xs">
          {isLoading || !execSummary ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse">Loading executive summary...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Active Incidents</div>
                <div className="text-base font-bold text-amber-600 mt-0.5">{execSummary.active_incidents_count}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Critical Alerts</div>
                <div className="text-base font-bold text-red-600 mt-0.5">{execSummary.critical_incidents_count}</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Mean Resolution Time</div>
                <div className="text-base font-bold text-indigo-600 mt-0.5">{execSummary.mean_resolution_time_minutes}m</div>
              </div>
              <div className="p-2 border rounded">
                <div className="text-muted-foreground text-[10px]">Automation Success</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">{execSummary.automation_success_rate_pct}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Orchestration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <IncidentAnalyticsDashboard />
          <AutomationActionsPanel />
          <PlaybookExecutionPanel />
        </div>

        <div className="space-y-4">
          <OperationalCommunicationPanel />
          {selectedIncident && <IncidentDetailsDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} />}
        </div>
      </div>
    </div>
  );
}
