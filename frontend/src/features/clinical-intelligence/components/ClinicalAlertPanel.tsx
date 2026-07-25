"use client";

import { Bell, CheckCheck, Zap, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetPatientAlertsQuery,
  useAcknowledgeAlertMutation,
  useMarkAlertActionTakenMutation,
  useDismissAlertMutation,
} from "@/redux/api/clinicalIntelligenceApi";

type Props = { patientId: string };

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  WARNING: "bg-amber-500 text-white",
  INFO: "bg-blue-500 text-white",
};

export function ClinicalAlertPanel({ patientId }: Props) {
  const { data: alerts = [], isLoading } = useGetPatientAlertsQuery({ patientId, status: "OPEN" });
  const [acknowledge] = useAcknowledgeAlertMutation();
  const [markAction] = useMarkAlertActionTakenMutation();
  const [dismiss] = useDismissAlertMutation();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b flex flex-row items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">
            Clinical Alerts — Open ({alerts.length})
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0 text-xs divide-y">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground animate-pulse">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No open clinical alerts.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.alert_id} className="p-3 space-y-2 hover:bg-slate-50/50">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${SEVERITY_COLORS[alert.severity] || "bg-slate-400 text-white"}`}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">{alert.domain}</Badge>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{alert.alert_type.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">{alert.message}</p>
                  {alert.recommendation && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 italic">💡 {alert.recommendation}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => acknowledge(alert.alert_id)}>
                  <CheckCheck className="h-3 w-3 mr-1" /> Acknowledge
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markAction(alert.alert_id)}>
                  <Zap className="h-3 w-3 mr-1" /> Action Taken
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground" onClick={() => dismiss(alert.alert_id)}>
                  <X className="h-3 w-3 mr-1" /> Dismiss
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
