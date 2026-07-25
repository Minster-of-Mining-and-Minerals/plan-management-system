"use client";

import { UserCheck, Clock, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetProviderAvailabilityQuery, type ProviderAvailability } from "@/redux/api/capacityApi";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-600 text-white",
  CONSULTING: "bg-blue-500 text-white",
  BUSY: "bg-amber-500 text-white",
  EMERGENCY: "bg-red-600 text-white",
};

export function ProviderAvailabilityBoard() {
  const { data: providers = [], isLoading } = useGetProviderAvailabilityQuery("CONSULTATION");

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-teal-600" />
          <CardTitle className="text-sm font-semibold">Provider Real-Time Availability Board</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading provider availability...</div>
        ) : providers.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No active provider shifts recorded.</div>
        ) : (
          providers.map((p: ProviderAvailability) => (
            <div key={p.provider_id} className="p-2 border rounded flex items-center justify-between hover:bg-slate-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[11px]">{p.full_name || p.email || p.provider_id.substring(0, 8)}</span>
                  <Badge className={`text-[9px] ${STATUS_COLORS[p.current_status] || "bg-slate-400 text-white"}`}>{p.current_status}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Workload: <span className="font-medium text-slate-900 dark:text-slate-100">{p.current_workload} active</span> (STAT: {p.stat_workload})
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                Next Slot: <span className="font-medium text-indigo-600">{p.next_availability_in_minutes}m</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
