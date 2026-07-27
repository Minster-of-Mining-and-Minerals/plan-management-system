"use client";

import { Layers, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetOrderDefinitionsQuery,
  type ClinicalOrderDefinition,
} from "@/redux/api/clinicalOrderDefinitionApi";

export function OrderDefinitionManager() {
  const { data: rawDefinitions = [], isLoading } = useGetOrderDefinitionsQuery();
  const definitions = Array.isArray(rawDefinitions) ? rawDefinitions : (rawDefinitions as any)?.data || [];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">Active Clinical Order Definitions & Version Snapshots</CardTitle>
          </div>
          <Badge variant="outline" className="text-[9px]">{definitions.length} Published Definitions</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading order definitions...</div>
        ) : definitions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No published order definitions available.</div>
        ) : (
          definitions.map((def: ClinicalOrderDefinition) => (
            <div key={def.definition_id || def.code} className="p-2.5 border rounded flex items-center justify-between">
              <div>
                <div className="font-semibold text-[11px]">{def.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  Code: <code className="font-mono text-indigo-600">{def.code}</code> • Dept: {def.department_id}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[9px]">v{def.version || "1.0.0"}</Badge>
                <Badge className="text-[9px] bg-emerald-600 text-white">{def.status}</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
