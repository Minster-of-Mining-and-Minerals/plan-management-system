"use client";

import { ShieldAlert, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPatientRiskScoreQuery } from "@/redux/api/clinicalIntelligenceApi";

type Props = { patientId: string };

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-yellow-400",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-600",
};

function RiskBar({ label, value }: { label: string; value: number }) {
  const color = value >= 75 ? "bg-red-500" : value >= 50 ? "bg-orange-400" : value >= 25 ? "bg-yellow-400" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function RiskDashboard({ patientId }: Props) {
  const { data: risk, isLoading } = useGetPatientRiskScoreQuery(patientId);

  if (isLoading) return <div className="p-4 text-xs animate-pulse text-muted-foreground">Computing risk assessment...</div>;

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Patient Risk Assessment
          </div>
          <Badge className={`${RISK_COLORS[risk?.risk_level || "LOW"]} text-white text-xs`}>
            {risk?.risk_level || "LOW"} RISK
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-center">
          <div className="flex-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
            <div className="text-2xl font-bold">{risk?.overall_risk_score || 0}</div>
            <div className="text-[10px] text-muted-foreground">Overall Score</div>
          </div>
        </div>

        <div className="space-y-3">
          <RiskBar label="Medication Risk" value={risk?.medication_risk || 0} />
          <RiskBar label="Disease Risk" value={risk?.disease_risk || 0} />
          <RiskBar label="Follow-up Risk" value={risk?.followup_risk || 0} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
          {Object.entries(risk?.factors || {}).map(([key, val]) => (
            <div key={key} className="p-2 bg-slate-50 dark:bg-slate-900 rounded border">
              <div className="font-semibold">{String(val)}</div>
              <div className="text-muted-foreground">{key.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground text-right">
          Assessed: {risk?.assessed_at ? new Date(risk.assessed_at).toLocaleString() : "—"}
        </div>
      </CardContent>
    </Card>
  );
}
