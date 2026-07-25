"use client";

import { History, CheckCircle2, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetPredictionHistoryQuery, type ClinicalPrediction } from "@/redux/api/predictiveOperationsApi";

export function PredictionHistoryPanel() {
  const { data: history = [], isLoading } = useGetPredictionHistoryQuery();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold">Prediction Performance & Outcome History</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2 max-h-[250px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading prediction history...</div>
        ) : (
          history.map((pred: ClinicalPrediction, idx: number) => (
            <div key={pred.prediction_id || idx} className="p-2 border rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">{pred.prediction_type} ({pred.department})</span>
                <Badge className={`text-[9px] ${pred.actual_outcome === "PREVENTED" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                  {pred.actual_outcome || "OCCURRED"} ({pred.accuracy || pred.confidence}%)
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{pred.reason.join(" • ")}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
