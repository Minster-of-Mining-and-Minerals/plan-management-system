"use client";

import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPlanOutcomesQuery, type PatientOutcome } from "@/redux/api/careManagementApi";

type Props = { planId: string };

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  ACHIEVED: { color: "bg-emerald-600 text-white", icon: <TrendingUp className="h-3 w-3" /> },
  IMPROVING: { color: "bg-blue-500 text-white", icon: <TrendingUp className="h-3 w-3" /> },
  STABLE: { color: "bg-slate-400 text-white", icon: <Minus className="h-3 w-3" /> },
  WORSENING: { color: "bg-red-500 text-white", icon: <TrendingDown className="h-3 w-3" /> },
};

function OutcomeProgressBar({ progress, status }: { progress: number | null; status: string }) {
  const pct = Math.min(Math.max(progress ?? 0, 0), 100);
  const color = status === "ACHIEVED" ? "bg-emerald-500" : status === "IMPROVING" ? "bg-blue-500" : status === "WORSENING" ? "bg-red-400" : "bg-slate-400";
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">Progress toward target</span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function OutcomeDashboard({ planId }: Props) {
  const { data: outcomes = [], isLoading } = useGetPlanOutcomesQuery(planId);

  const summary = {
    achieved: outcomes.filter((o) => o.status === "ACHIEVED").length,
    improving: outcomes.filter((o) => o.status === "IMPROVING").length,
    stable: outcomes.filter((o) => o.status === "STABLE").length,
    worsening: outcomes.filter((o) => o.status === "WORSENING").length,
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Patient Outcome Dashboard</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3 text-xs">
        {/* Summary row */}
        {outcomes.length > 0 && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {Object.entries(summary).map(([key, val]) => (
              <div key={key} className="p-2 border rounded">
                <div className="text-lg font-bold">{val}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{key}</div>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading outcomes...</div>
        ) : outcomes.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No outcomes recorded for this plan.</div>
        ) : (
          outcomes.map((outcome: PatientOutcome) => {
            const config = STATUS_CONFIG[outcome.status] || STATUS_CONFIG["STABLE"];
            return (
              <div key={outcome.outcome_id} className="p-3 border rounded space-y-2 hover:bg-slate-50/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] flex items-center gap-0.5 ${config.color}`}>
                        {config.icon}{outcome.status}
                      </Badge>
                      <span className="font-semibold text-[11px]">{outcome.outcome_name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Baseline: {outcome.baseline_value ?? "N/A"} · Current: <span className="font-medium text-slate-900 dark:text-white">{outcome.current_value ?? "N/A"}</span> · Target: {outcome.target_value ?? "N/A"}
                      {outcome.unit && ` ${outcome.unit}`}
                    </div>
                    {outcome.notes && <p className="text-[10px] italic text-muted-foreground">{outcome.notes}</p>}
                  </div>
                </div>
                {outcome.progress_percentage !== null && outcome.progress_percentage !== undefined && (
                  <OutcomeProgressBar progress={outcome.progress_percentage ?? null} status={outcome.status} />
                )}
                <div className="text-[10px] text-muted-foreground">
                  Measured: {new Date(outcome.measured_at).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
