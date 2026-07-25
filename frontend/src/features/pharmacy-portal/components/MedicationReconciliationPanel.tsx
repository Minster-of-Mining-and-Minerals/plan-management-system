"use client";

import { useState } from "react";
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useGetPatientReconciliationsQuery,
  usePerformReconciliationMutation,
} from "@/redux/api/pharmacyEnterpriseApi";

type Props = {
  patientId: string;
};

export function MedicationReconciliationPanel({ patientId }: Props) {
  const { data: reconciliations = [], refetch } = useGetPatientReconciliationsQuery(patientId);
  const [performRec, { isLoading }] = usePerformReconciliationMutation();

  const handlePerformAdmissionRec = async () => {
    try {
      const res = await performRec({
        patient_id: patientId,
        reconciliation_type: "ADMISSION",
        home_medications: [{ name: "Aspirin 81mg" }, { name: "Metformin 500mg" }],
        reconciled_medications: [{ name: "Metformin 500mg" }, { name: "Lisinopril 10mg" }],
      }).unwrap();

      toast.success(`Admission Reconciliation completed! (${res.conflict_summary_json?.length || 0} conflicts detected)`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to perform medication reconciliation");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Admission & Discharge Medication Reconciliation
          </CardTitle>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
          disabled={isLoading}
          onClick={handlePerformAdmissionRec}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> Run Admission Reconciliation
        </Button>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {reconciliations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No medication reconciliation records generated for this patient chart.
          </div>
        ) : (
          <div className="space-y-2">
            {reconciliations.map((rec) => (
              <div key={rec.id} className="p-3 border rounded-lg bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-600 text-white">{rec.reconciliation_type} RECONCILIATION</Badge>
                  <span className="text-muted-foreground text-[11px]">
                    Reconciled by: {rec.reconciler?.full_name || "Clinician"} ({new Date(rec.created_at).toLocaleDateString()})
                  </span>
                </div>

                {rec.conflict_summary_json && rec.conflict_summary_json.length > 0 && (
                  <div className="p-2 border border-amber-200 bg-amber-50 text-amber-900 rounded text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Conflict Warnings Detected ({rec.conflict_summary_json.length}):
                    </p>
                    {rec.conflict_summary_json.map((c: any, idx: number) => (
                      <p key={idx}>• {c.message}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
