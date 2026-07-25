"use client";

import { Brain, User2, Pill, FlaskConical, Scan, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetPatientSnapshotQuery, useEvaluatePatientContextMutation } from "@/redux/api/clinicalIntelligenceApi";

type Props = { patientId: string };

export function PatientIntelligencePanel({ patientId }: Props) {
  const { data: snapshot, isLoading } = useGetPatientSnapshotQuery(patientId);
  const [evaluate, { isLoading: isEvaluating }] = useEvaluatePatientContextMutation();

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground animate-pulse">Loading patient intelligence...</div>;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-base">
          <Brain className="h-5 w-5 text-indigo-600" />
          Patient Intelligence Snapshot
        </div>
        <Button size="sm" variant="outline" disabled={isEvaluating} onClick={() => evaluate(patientId)}>
          {isEvaluating ? "Evaluating..." : "Run Decision Support"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Demographics */}
        <Card className="border">
          <CardHeader className="py-2 border-b"><CardTitle className="text-xs flex gap-1"><User2 className="h-3 w-3" /> Demographics</CardTitle></CardHeader>
          <CardContent className="p-2 text-[11px] space-y-0.5">
            <p><span className="text-muted-foreground">Name:</span> {snapshot?.demographics?.full_name || "—"}</p>
            <p><span className="text-muted-foreground">DOB:</span> {snapshot?.demographics?.date_of_birth || "—"}</p>
            <p><span className="text-muted-foreground">Gender:</span> {snapshot?.demographics?.gender || "—"}</p>
            <p><span className="text-muted-foreground">Blood Group:</span> {snapshot?.demographics?.blood_group || "—"}</p>
          </CardContent>
        </Card>

        {/* Allergies */}
        <Card className="border">
          <CardHeader className="py-2 border-b"><CardTitle className="text-xs flex gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> Allergies ({snapshot?.allergies?.length || 0})</CardTitle></CardHeader>
          <CardContent className="p-2 text-[11px] space-y-0.5">
            {snapshot?.allergies?.length === 0 ? <span className="text-muted-foreground">No known allergies.</span> :
              snapshot?.allergies?.map((a: any) => (
                <div key={a.allergy_id} className="flex items-center gap-1">
                  <Badge className="bg-red-100 text-red-700 text-[9px]">{a.severity}</Badge>
                  <span>{a.allergen}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Active Medications */}
        <Card className="border">
          <CardHeader className="py-2 border-b"><CardTitle className="text-xs flex gap-1"><Pill className="h-3 w-3 text-blue-600" /> Active Medications ({snapshot?.active_medications?.length || 0})</CardTitle></CardHeader>
          <CardContent className="p-2 text-[11px] space-y-0.5">
            {snapshot?.active_medications?.length === 0 ? <span className="text-muted-foreground">No active prescriptions.</span> :
              snapshot?.active_medications?.slice(0, 5).map((rx: any) => (
                <div key={rx.prescription_id} className="text-slate-800 dark:text-slate-200">
                  {rx.items?.slice(0, 2).map((item: any) => (
                    <div key={item.item_id}>{item.drug_name || item.item_name}</div>
                  ))}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Active Problems */}
        <Card className="border">
          <CardHeader className="py-2 border-b"><CardTitle className="text-xs flex gap-1"><Activity className="h-3 w-3 text-amber-600" /> Active Problems ({snapshot?.active_problems?.length || 0})</CardTitle></CardHeader>
          <CardContent className="p-2 text-[11px] space-y-0.5">
            {snapshot?.active_problems?.length === 0 ? <span className="text-muted-foreground">No active problems.</span> :
              snapshot?.active_problems?.map((p: any) => (
                <div key={p.problem_id} className="flex items-center gap-1">
                  <Badge className={`text-[9px] ${p.severity === "CRITICAL" ? "bg-red-600 text-white" : p.severity === "HIGH" ? "bg-orange-500 text-white" : "bg-yellow-400 text-black"}`}>{p.severity}</Badge>
                  <span>{p.problem_name}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        Generated: {snapshot?.generated_at ? new Date(snapshot.generated_at).toLocaleString() : "—"}
      </div>
    </div>
  );
}
