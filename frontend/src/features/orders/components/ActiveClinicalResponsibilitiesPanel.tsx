"use client";

import { useListEncounterOrdersQuery, type ClinicalOrder } from "@/redux/api/clinicalOrderApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, CheckCircle2, AlertCircle, FileText, User } from "lucide-react";

interface ActiveClinicalResponsibilitiesPanelProps {
  appointmentId: string;
  className?: string;
}

export function ActiveClinicalResponsibilitiesPanel({
  appointmentId,
  className = "",
}: ActiveClinicalResponsibilitiesPanelProps) {
  const { data: orders = [], isLoading } = useListEncounterOrdersQuery(appointmentId, {
    skip: !appointmentId,
  });

  const activeOrders = Array.isArray(orders) ? orders : (orders as any)?.data || [];
  const pendingOrders = activeOrders.filter((o: ClinicalOrder) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const completedOrders = activeOrders.filter((o: ClinicalOrder) => o.status === "COMPLETED");

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-muted-foreground animate-pulse border rounded-lg bg-slate-50/50">
        Loading active clinical responsibilities...
      </div>
    );
  }

  if (activeOrders.length === 0) {
    return null;
  }

  return (
    <Card className={`border shadow-xs bg-slate-50/40 dark:bg-slate-900/30 ${className}`}>
      <CardHeader className="py-2.5 px-3 border-b bg-white/60 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <CardTitle className="text-xs font-semibold tracking-wide">
              Active Clinical Responsibilities
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {pendingOrders.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200">
                {pendingOrders.length} Pending
              </Badge>
            )}
            {completedOrders.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                {completedOrders.length} Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2.5 space-y-2 text-xs">
        {activeOrders.map((order: ClinicalOrder) => {
          const isPending = order.status !== "COMPLETED" && order.status !== "CANCELLED";
          const isStat = order.priority === "STAT";

          return (
            <div
              key={order.order_id}
              className={`p-2.5 rounded-lg border transition-all ${
                isPending
                  ? isStat
                    ? "bg-rose-50/60 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40"
                    : "bg-amber-50/30 border-amber-200/80 dark:bg-amber-950/10 dark:border-amber-900/30"
                  : "bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isPending ? (
                    <Clock className={`h-3.5 w-3.5 shrink-0 ${isStat ? "text-rose-600 animate-spin" : "text-amber-600"}`} />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                    {order.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0">
                    {order.order_type}
                  </Badge>
                  <Badge
                    className={`text-[9px] px-1.5 py-0 ${
                      order.status === "COMPLETED"
                        ? "bg-emerald-600 text-white"
                        : order.status === "CANCELLED"
                        ? "bg-slate-400 text-white"
                        : isStat
                        ? "bg-rose-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px] text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>Orderer: <strong className="text-slate-700 dark:text-slate-300">{order.orderedByUser?.full_name || "Physician"}</strong></span>
                </div>
                {order.department && (
                  <div className="flex items-center gap-1 truncate">
                    <FileText className="h-3 w-3 text-slate-400" />
                    <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{order.department.name}</strong></span>
                  </div>
                )}
              </div>

              {order.result && (
                <div className="mt-1.5 p-1.5 rounded bg-emerald-50/60 dark:bg-emerald-950/20 text-[10px] text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="font-semibold">Result Summary:</span> {order.result.result_summary || "Final findings uploaded."}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
