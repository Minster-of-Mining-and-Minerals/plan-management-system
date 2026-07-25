"use client";

import { useState } from "react";
import { Activity, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubmitClinicalIntentMutation, type ClinicalActivityDefinition } from "@/redux/api/clinicalWorkflowApi";

interface ClinicalActivityRendererProps {
  activity: ClinicalActivityDefinition;
  appointmentId: string;
  patientId: string;
  orderedBy: string;
  onSuccess?: (orderRes: any) => void;
}

export function ClinicalActivityRenderer({
  activity,
  appointmentId,
  patientId,
  orderedBy,
  onSuccess,
}: ClinicalActivityRendererProps) {
  const [submitIntent, { isLoading }] = useSubmitClinicalIntentMutation();
  const [reason, setReason] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await submitIntent({
        activity_code: activity.code,
        appointment_id: appointmentId,
        patient_id: patientId,
        ordered_by: orderedBy,
        clinical_data: { reason: reason || "Routine Clinical Assessment" },
      }).unwrap();

      setResultMsg(`ClinicalOrder #${res.order_id.slice(0, 8)} created successfully!`);
      if (onSuccess) onSuccess(res);
      setTimeout(() => setResultMsg(null), 4000);
    } catch (err: any) {
      setResultMsg(`Submission Error: ${err?.message || "Failed"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">{activity.name}</CardTitle>
          </div>
          <Badge className="text-[9px] bg-indigo-600 text-white">{activity.order_type}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        <div className="text-[10px] text-muted-foreground">
          Department: <span className="font-semibold">{activity.department_id}</span> • Priority: <span className="font-semibold">{activity.default_priority}</span>
        </div>

        {resultMsg && <div className="p-2 border rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">{resultMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Clinical Reason / Assessment Notes</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter dynamic clinical notes or diagnostic rationale..."
              className="w-full h-16 p-2 text-xs border rounded bg-background"
            />
          </div>

          <Button type="submit" size="sm" className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
            <Send className="h-3 w-3 mr-1" /> Submit Intent & Create ClinicalOrder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
