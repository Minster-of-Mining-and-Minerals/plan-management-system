"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Lock,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useEvaluatePrescriptionSafetyMutation,
  useOverrideSafetyAlertMutation,
  type MedicationSafetyAssessment,
  type SafetyAlertSeverity,
} from "@/redux/api/medicationSafetyApi";

type Props = {
  patientId: string;
  prescriptionId?: string;
  items: Array<{
    item_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: string;
  }>;
  onSafetyEvaluated?: (assessment: MedicationSafetyAssessment) => void;
};

const SEVERITY_BADGES: Record<SafetyAlertSeverity | "CLEAN", { label: string; className: string }> = {
  CLEAN: { label: "SAFE — CLEAR TO PRESCRIBE", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  INFO: { label: "INFORMATIONAL NOTICE", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  WARNING: { label: "CLINICAL WARNING", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold" },
  SEVERE: { label: "HIGH RISK — OVERRIDE REQUIRED", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold animate-pulse" },
  CONTRAINDICATED: { label: "STRICTLY CONTRAINDICATED", className: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200 font-extrabold" },
};

export function MedicationSafetyPanel({ patientId, prescriptionId, items, onSafetyEvaluated }: Props) {
  const [evaluateSafety, { data: assessment, isLoading }] = useEvaluatePrescriptionSafetyMutation();
  const [overrideAlert, { isLoading: isOverriding }] = useOverrideSafetyAlertMutation();

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (patientId && items && items.length > 0) {
      evaluateSafety({ patient_id: patientId, prescription_id: prescriptionId, items })
        .unwrap()
        .then((res) => {
          if (onSafetyEvaluated) onSafetyEvaluated(res);
        })
        .catch((err) => {
          console.error("Failed to evaluate medication safety:", err);
        });
    }
  }, [patientId, prescriptionId, items, evaluateSafety, onSafetyEvaluated]);

  const handleOverrideSubmit = async () => {
    if (!overrideReason || overrideReason.trim().length < 5) {
      toast.error("Please enter a detailed clinical justification reason (minimum 5 characters).");
      return;
    }
    if (!selectedAlertId) return;

    try {
      await overrideAlert({ alertId: selectedAlertId, reason: overrideReason }).unwrap();
      toast.success("Medication safety alert overridden successfully.");
      setOverrideDialogOpen(false);
      setOverrideReason("");
      setSelectedAlertId(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to override medication alert.");
    }
  };

  if (isLoading) {
    return (
      <Card className="my-3 border border-slate-200 dark:border-slate-800">
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          Running Medication Intelligence & Safety Engine Evaluation...
        </CardContent>
      </Card>
    );
  }

  if (!assessment) return null;

  const severityBadge = SEVERITY_BADGES[assessment.overall_severity] || SEVERITY_BADGES.CLEAN;

  return (
    <Card className="my-3 border border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            Medication Safety Engine
            <span className="text-[10px] font-normal text-muted-foreground lowercase">
              ({assessment.total_alerts} check alerts)
            </span>
          </CardTitle>
        </div>
        <Badge className={`text-[11px] ${severityBadge.className}`}>
          {severityBadge.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 pt-3 text-xs">
        {assessment.is_safe && assessment.alerts.length === 0 && (
          <div className="p-3 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>
              Allergy, Drug Interaction, Duplicate Therapy, and Dose Safety checks passed with zero warnings.
            </span>
          </div>
        )}

        {assessment.alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-md border text-xs space-y-1.5 ${
              alert.severity === "SEVERE" || alert.severity === "CONTRAINDICATED"
                ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900"
                : alert.severity === "WARNING"
                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900"
                : "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                {alert.type === "ALLERGY" && <AlertOctagon className="h-4 w-4 text-rose-600" />}
                {alert.type === "INTERACTION" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                {alert.type === "DUPLICATE_THERAPY" && <Info className="h-4 w-4 text-blue-600" />}
                {alert.type === "DOSE_SAFETY" && <ShieldAlert className="h-4 w-4 text-purple-600" />}
                [{alert.type}] — {alert.medication_name || "Medication Item"}
              </span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {alert.severity}
              </Badge>
            </div>

            <p className="text-[11px] text-slate-700 dark:text-slate-300">
              {alert.message}
            </p>

            {alert.clinical_action && (
              <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
                Recommended Action: {alert.clinical_action}
              </p>
            )}
          </div>
        ))}

        {/* Persisted Alerts Override List */}
        {assessment.persisted_alerts && assessment.persisted_alerts.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-slate-500" /> Active Preserved Safety Alerts ({assessment.persisted_alerts.length})
            </Label>
            {assessment.persisted_alerts.map((pa: any) => (
              <div key={pa.alert_id} className="p-2 border rounded flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-semibold">{pa.alert_type}</span>: {pa.message.slice(0, 80)}...
                  <Badge variant="outline" className="ml-2 text-[9px]">{pa.status}</Badge>
                </div>
                {pa.status === "OPEN" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] border-rose-300 hover:bg-rose-50"
                    onClick={() => {
                      setSelectedAlertId(pa.alert_id);
                      setOverrideDialogOpen(true);
                    }}
                  >
                    Override Warning
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Mandatory Clinical Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              Override Clinical Safety Warning
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              You are overriding a high-risk medication warning. Regulations require a mandatory clinical justification reason that will be logged in the permanent audit trail.
            </p>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">
                Clinical Override Justification Reason *
              </Label>
              <Textarea
                placeholder="E.g., Patient previously tolerated medication without adverse reaction; benefit outweighs potential risk under close monitoring..."
                className="text-xs h-24"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isOverriding || overrideReason.trim().length < 5}
              onClick={handleOverrideSubmit}
            >
              {isOverriding ? "Logging Override..." : "Confirm & Sign Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
