"use client";

import { AlertTriangle, TrendingUp, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetRiskScoresQuery, type OperationalRiskScore } from "@/redux/api/predictiveOperationsApi";

export function RiskForecastCard() {
  const { data: riskScores = [], isLoading } = useGetRiskScoresQuery();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Clinical Operational Risk Forecasting</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">Real-Time Risk Scoring</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Calculating operational risk scores...</div>
        ) : (
          riskScores.map((score: OperationalRiskScore) => (
            <div key={score.score_id} className="p-2 border rounded space-y-1 bg-slate-50/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">{score.department}</span>
                <Badge className={`text-[9px] ${score.risk_level === "HIGH" ? "bg-red-600 text-white" : score.risk_level === "MEDIUM" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
                  Risk: {score.risk_score}% ({score.risk_level})
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">{score.factors.join(" • ")}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
