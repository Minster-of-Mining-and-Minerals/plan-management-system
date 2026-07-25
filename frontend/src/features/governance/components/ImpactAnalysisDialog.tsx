"use client";

import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetImpactAnalysisQuery,
  type ImpactAnalysis,
} from "@/redux/api/clinicalConfigurationGovernanceApi";

interface ImpactAnalysisDialogProps {
  entityType?: string;
  entityId?: string;
}

export function ImpactAnalysisDialog({ entityType = "ORDER_DEFINITION", entityId = "DEF_CBC_TEST" }: ImpactAnalysisDialogProps) {
  const { data: impact } = useGetImpactAnalysisQuery({ entity_type: entityType, entity_id: entityId });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-semibold">Pre-Change Impact Analysis</CardTitle>
          </div>
          <Badge className={`text-[9px] ${impact?.risk_level === "HIGH" ? "bg-rose-600" : "bg-emerald-600"} text-white`}>
            Risk: {impact?.risk_level || "LOW"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2">
        <div className="text-[10px] text-muted-foreground">{impact?.message || "Analyzing dependencies..."}</div>
        <div className="grid grid-cols-2 gap-2 text-center pt-1">
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Active Patient Orders</div>
            <div className="text-xs font-bold text-amber-600">{impact?.dependent_active_orders || 0}</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50">
            <div className="text-[10px] text-muted-foreground">Historical Orders</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{impact?.dependent_historical_orders || 0}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
