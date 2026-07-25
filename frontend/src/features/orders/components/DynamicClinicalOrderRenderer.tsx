"use client";

import { useState } from "react";
import { FileText, Play, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useInstantiateRuntimeOrderMutation,
  type ClinicalOrderDefinition,
} from "@/redux/api/clinicalOrderDefinitionApi";

interface DynamicClinicalOrderRendererProps {
  definition: ClinicalOrderDefinition;
  appointmentId: string;
  patientId: string;
  orderedBy: string;
  onSuccess?: (res: any) => void;
}

export function DynamicClinicalOrderRenderer({
  definition,
  appointmentId,
  patientId,
  orderedBy,
  onSuccess,
}: DynamicClinicalOrderRendererProps) {
  const [instantiateOrder, { isLoading }] = useInstantiateRuntimeOrderMutation();
  const [notes, setNotes] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleInstantiate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await instantiateOrder({
        definition_code: definition.code,
        appointment_id: appointmentId,
        patient_id: patientId,
        ordered_by: orderedBy,
        intent_data: { clinical_reason: notes || "Order Instantiated via Dynamic Renderer" },
      }).unwrap();

      setResultMsg(`Instantiated ClinicalOrder #${res.order_id.slice(0, 8)} (v${res.snapshot?.definition_version})`);
      if (onSuccess) onSuccess(res);
      setTimeout(() => setResultMsg(null), 4000);
    } catch (err: any) {
      setResultMsg(`Instantiation error: ${err?.message || "Failed"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-semibold">{definition.name}</CardTitle>
          </div>
          <Badge className="text-[9px] bg-blue-600 text-white">v{definition.version || "1.0.0"}</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        <div className="text-[10px] text-muted-foreground">
          Department: <span className="font-semibold">{definition.department_id}</span> • Category: <span className="font-semibold">{definition.category}</span>
        </div>

        {resultMsg && <div className="p-2 border rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">{resultMsg}</div>}

        <form onSubmit={handleInstantiate} className="space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-700 dark:text-slate-300 mb-1">Dynamic Request Rationale / Intent Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter dynamic request intent parameters..."
              className="w-full p-2 text-xs border rounded bg-background"
            />
          </div>

          <Button type="submit" size="sm" className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            <Play className="h-3 w-3 mr-1" /> Instantiate Configured Order
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
