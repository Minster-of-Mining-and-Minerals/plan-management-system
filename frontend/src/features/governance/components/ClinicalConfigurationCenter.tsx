"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, Layers, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useGetGovernanceLogsQuery,
  useTransitionLifecycleStatusMutation,
  type GovernanceLog,
} from "@/redux/api/clinicalConfigurationGovernanceApi";

export function ClinicalConfigurationCenter() {
  const { data: logsData, isLoading } = useGetGovernanceLogsQuery();
  const [transitionStatus] = useTransitionLifecycleStatusMutation();
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const logs: GovernanceLog[] = Array.isArray(logsData)
    ? logsData
    : Array.isArray((logsData as any)?.logs)
    ? (logsData as any).logs
    : [];

  const handlePublish = async (code: string) => {
    try {
      await transitionStatus({
        entity_type: "ORDER_DEFINITION",
        entity_id: code,
        entity_code: code,
        target_status: "PUBLISHED",
        reason: "Administrative validation and approval",
      }).unwrap();

      setActionMsg(`Configuration '${code}' published successfully!`);
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      setActionMsg(`Publish rejected: ${err?.message || "Validation Error"}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">Clinical Configuration Governance Center</CardTitle>
          </div>
          <Badge className="text-[9px] bg-emerald-600 text-white">Multi-Tenant Protected</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {actionMsg && (
          <div className={`p-2 border rounded text-[10px] font-medium ${actionMsg.includes("rejected") ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 border rounded bg-slate-50/50 text-center">
            <div className="text-[10px] text-muted-foreground">Lifecycle States</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">5 Enforced</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 text-center">
            <div className="text-[10px] text-muted-foreground">Tenant Protection</div>
            <div className="text-xs font-bold text-emerald-600 mt-0.5">Active</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 text-center">
            <div className="text-[10px] text-muted-foreground">Runtime Guard</div>
            <div className="text-xs font-bold text-indigo-600 mt-0.5">Published Only</div>
          </div>
          <div className="p-2 border rounded bg-slate-50/50 text-center">
            <div className="text-[10px] text-muted-foreground">Version Snapshots</div>
            <div className="text-xs font-bold text-purple-600 mt-0.5">Immutable</div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">Governance Audit Trail</span>
          {isLoading ? (
            <div className="p-3 text-center text-muted-foreground animate-pulse">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground">No governance logs recorded yet.</div>
          ) : (
            logs.slice(0, 5).map((log: GovernanceLog) => (
              <div key={log.governance_id} className="p-2 border rounded flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-3 w-3 text-indigo-600" />
                  <div>
                    <span className="font-semibold">{log.entity_code}</span> ({log.entity_type}) • <span className="text-muted-foreground">v{log.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px]">{log.previous_status || "DRAFT"} → {log.new_status}</Badge>
                  <Badge className="text-[9px] bg-emerald-600 text-white">Validated</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
