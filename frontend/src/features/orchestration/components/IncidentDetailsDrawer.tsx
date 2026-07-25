"use client";

import { ShieldAlert, CheckCircle2, UserCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateIncidentStatusMutation, type ClinicalIncident } from "@/redux/api/incidentApi";

export function IncidentDetailsDrawer({ incident, onClose }: { incident: ClinicalIncident | null; onClose?: () => void }) {
  const [updateStatus, { isLoading }] = useUpdateIncidentStatusMutation();

  if (!incident) return null;

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus({
      id: incident.incident_id,
      status: newStatus,
      resolution_notes: newStatus === "RESOLVED" ? "Resolved via Orchestration Command" : undefined,
    });
  };

  return (
    <Card className="border shadow-md">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <CardTitle className="text-sm font-semibold">{incident.title}</CardTitle>
          </div>
          <Badge className={`text-[9px] ${incident.severity === "CRITICAL" ? "bg-red-600 text-white" : incident.severity === "HIGH" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}`}>
            {incident.severity}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <div>Incident Type: <span className="font-semibold text-slate-900 dark:text-slate-100">{incident.incident_type}</span></div>
          <div>Department: <span className="font-semibold text-slate-900 dark:text-slate-100">{incident.department_id}</span></div>
          <div>Owner Role: <span className="font-semibold text-indigo-600">{incident.assigned_owner_role || "OPERATIONS_MANAGER"}</span></div>
          <div>Current Status: <span className="font-semibold text-slate-900 dark:text-slate-100">{incident.status}</span></div>
        </div>

        <div className="flex gap-1 pt-2 border-t">
          {incident.status === "OPEN" && (
            <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={isLoading} onClick={() => handleStatusChange("ACKNOWLEDGED")}>
              Acknowledge
            </Button>
          )}
          {incident.status !== "RESOLVED" && incident.status !== "CLOSED" && (
            <Button size="sm" variant="default" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700" disabled={isLoading} onClick={() => handleStatusChange("RESOLVED")}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Resolved
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
