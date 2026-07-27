"use client";

import { useState } from "react";
import {
  useListDepartmentQueueQuery,
  useAcceptClinicalOrderMutation,
  useAutoAssignClinicalOrderMutation,
  type ClinicalOrder,
} from "@/redux/api/clinicalOrderApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Layers, Sparkles, UserCheck } from "lucide-react";
import { DynamicOrderResultEntryModal } from "./DynamicOrderResultEntryModal";

interface DepartmentOrderQueueViewProps {
  departmentId: string;
  departmentName?: string;
}

export function DepartmentOrderQueueView({
  departmentId,
  departmentName = "Department Worklist",
}: DepartmentOrderQueueViewProps) {
  const { data: rawOrders = [], isLoading, refetch } = useListDepartmentQueueQuery({
    departmentId,
  });
  const [acceptOrder] = useAcceptClinicalOrderMutation();
  const [autoAssignOrder, { isLoading: isAssigning }] = useAutoAssignClinicalOrderMutation();
  const [msg, setMsg] = useState<string | null>(null);

  const orders = Array.isArray(rawOrders) ? rawOrders : (rawOrders as any)?.data || [];

  const statOrders = orders.filter((o: ClinicalOrder) => o.priority === "STAT" && o.status !== "COMPLETED");
  const routineOrders = orders.filter((o: ClinicalOrder) => o.priority !== "STAT" || o.status === "COMPLETED");

  const handleAutoAssign = async (orderId: string) => {
    try {
      const assigned = await autoAssignOrder({ orderId, departmentId }).unwrap();
      setMsg(`Order '${assigned.title}' auto-assigned to ${assigned.assignedStaff?.full_name || "technician"}!`);
      setTimeout(() => setMsg(null), 3000);
      refetch();
    } catch (err: any) {
      setMsg(`Auto-assign failed: ${err?.data?.message || err?.message}`);
    }
  };

  const handleClaim = async (orderId: string) => {
    try {
      await acceptOrder(orderId).unwrap();
      setMsg("Order claimed successfully!");
      setTimeout(() => setMsg(null), 3000);
      refetch();
    } catch (err: any) {
      setMsg(`Claim failed: ${err?.data?.message || err?.message}`);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-semibold">{departmentName} Order Queue</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {statOrders.length > 0 && (
              <Badge className="text-[10px] bg-rose-600 text-white animate-pulse gap-1">
                <AlertCircle className="h-3 w-3" />
                {statOrders.length} STAT Emergency Orders
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px]">{orders.length} Queue Items</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {msg && (
          <div className="p-2 border rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">
            {msg}
          </div>
        )}

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading department worklist...</div>
        ) : orders.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No active orders in department queue.</div>
        ) : (
          <div className="space-y-2">
            {/* STAT Auto-Pinned Emergency Orders */}
            {statOrders.map((order: ClinicalOrder) => (
              <div key={order.order_id} className="p-3 border-2 border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 animate-spin" />
                    <span className="font-bold text-rose-900 dark:text-rose-200">{order.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-rose-600 text-white text-[9px]">STAT EMERGENCY</Badge>
                    <Badge variant="outline" className="text-[9px]">{order.status}</Badge>
                  </div>
                </div>

                <div className="text-[10px] text-rose-700 dark:text-rose-300">
                  Reason: {order.clinical_reason || "Immediate execution required"} • Orderer: {order.orderedByUser?.full_name || "Physician"}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {order.assignedStaff ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                      <UserCheck className="h-3 w-3" />
                      <span>Assigned to: {order.assignedStaff.full_name}</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleClaim(order.order_id)}
                        className="h-6 text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2"
                      >
                        Claim Emergency Order
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isAssigning}
                        onClick={() => handleAutoAssign(order.order_id)}
                        className="h-6 text-[10px] border-rose-300 text-rose-700 hover:bg-rose-100 px-2 gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Auto-Balance Technician
                      </Button>
                    </>
                  )}

                  {order.status !== "COMPLETED" && (
                    <DynamicOrderResultEntryModal
                      orderId={order.order_id}
                      orderTitle={order.title}
                      onCompleteSuccess={refetch}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Standard Queue Orders */}
            {routineOrders.map((order: ClinicalOrder) => (
              <div key={order.order_id} className="p-2.5 border rounded-lg bg-white dark:bg-slate-950 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{order.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Orderer: {order.orderedByUser?.full_name || "Physician"} • Priority: <span className="font-mono text-indigo-600">{order.priority}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px]">{order.status}</Badge>

                  {order.assignedStaff ? (
                    <Badge variant="secondary" className="text-[9px]">{order.assignedStaff.full_name}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAssigning}
                      onClick={() => handleAutoAssign(order.order_id)}
                      className="h-6 text-[10px] gap-1 px-2 text-indigo-600"
                    >
                      <Sparkles className="h-3 w-3" />
                      Auto-Assign
                    </Button>
                  )}

                  {order.status !== "COMPLETED" && (
                    <DynamicOrderResultEntryModal
                      orderId={order.order_id}
                      orderTitle={order.title}
                      onCompleteSuccess={refetch}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
