"use client";

import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetOperationsFeedQuery, type OperationsFeedItem } from "@/redux/api/operationsApi";

export function OperationsFeedPanel() {
  const { data: feed = [], isLoading } = useGetOperationsFeedQuery({ limit: 15 });

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-semibold">Real-Time Operations Feed</CardTitle>
          <Badge variant="outline" className="ml-auto text-[9px]">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 text-xs divide-y max-h-[350px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading live feed...</div>
        ) : feed.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No operations feed events recorded.</div>
        ) : (
          feed.map((item: OperationsFeedItem) => (
            <div key={item.id} className="p-2.5 hover:bg-slate-50/50 flex items-start gap-2">
              {item.severity === "HIGH" ? (
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              ) : item.severity === "MEDIUM" ? (
                <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[11px]">{item.title}</span>
                  <span className="text-[9px] text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
