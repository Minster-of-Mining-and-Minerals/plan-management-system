"use client";

import { History, BellRing, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetHospitalTimelineQuery, type HospitalTimelineItem } from "@/redux/api/operationsApi";

export function HospitalOperationsTimeline() {
  const { data: timeline = [], isLoading } = useGetHospitalTimelineQuery({ limit: 20 });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-orange-600" />
          <CardTitle className="text-sm font-semibold">Hospital Operations Timeline</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2 max-h-[350px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading operations timeline...</div>
        ) : timeline.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No operations timeline events recorded.</div>
        ) : (
          timeline.map((item: HospitalTimelineItem) => (
            <div key={item.id} className="flex gap-2.5 items-start p-2 border-b last:border-0">
              <span className="text-[10px] text-muted-foreground font-mono w-12 shrink-0 pt-0.5">{item.formatted_time}</span>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{item.domain}</Badge>
                  <span className="font-semibold text-[11px]">{item.title}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">Order ID: #{item.order_id?.substring(0, 8)}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
