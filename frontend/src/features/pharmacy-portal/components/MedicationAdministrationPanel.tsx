"use client";

import { useState } from "react";
import { Syringe, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useGetPatientMARQuery,
  useRecordAdministrationMutation,
} from "@/redux/api/pharmacyEnterpriseApi";

type Props = {
  patientId: string;
  prescriptionId: string;
};

export function MedicationAdministrationPanel({ patientId, prescriptionId }: Props) {
  const { data: marRecords = [], refetch } = useGetPatientMARQuery(patientId);
  const [recordAdmin, { isLoading }] = useRecordAdministrationMutation();

  const [dose, setDose] = useState("500mg");
  const [route, setRoute] = useState("Oral");
  const [status, setStatus] = useState("GIVEN");

  const handleRecord = async () => {
    if (!dose) {
      toast.error("Please specify administration dosage");
      return;
    }

    try {
      await recordAdmin({
        patient_id: patientId,
        prescription_id: prescriptionId,
        dose,
        route,
        status,
      }).unwrap();

      toast.success(`MAR: Medication administration recorded as ${status}!`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to record MAR administration");
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Syringe className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            Medication Administration Record (MAR)
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px]">Dose</Label>
              <Input
                className="h-8 text-xs"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Route</Label>
              <Input
                className="h-8 text-xs"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Status</Label>
              <select
                className="h-8 text-xs w-full rounded border bg-white dark:bg-slate-950 px-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="GIVEN">GIVEN</option>
                <option value="MISSED">MISSED</option>
                <option value="REFUSED">REFUSED</option>
                <option value="HELD">HELD</option>
              </select>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-8 text-xs"
            disabled={isLoading}
            onClick={handleRecord}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Log MAR Administration
          </Button>
        </div>

        {marRecords.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-muted-foreground flex items-center gap-1 text-[11px]">
              <Clock className="h-3.5 w-3.5" /> Recent Patient MAR Administrations ({marRecords.length}):
            </p>
            <div className="divide-y border rounded">
              {marRecords.map((m) => (
                <div key={m.id} className="p-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{m.dose} ({m.route || "Oral"})</span>
                    <p className="text-[10px] text-muted-foreground">
                      Time: {new Date(m.scheduled_time).toLocaleString()} by {m.administrator?.full_name || "Nurse"}
                    </p>
                  </div>
                  <Badge
                    className={
                      m.status === "GIVEN"
                        ? "bg-emerald-100 text-emerald-800"
                        : m.status === "MISSED"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
