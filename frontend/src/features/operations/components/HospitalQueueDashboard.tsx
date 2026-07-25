"use client";

import { Layers, Clock, AlertOctagon, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetHospitalQueueQuery, type QueueMetrics } from "@/redux/api/operationsApi";

function QueueMetricCard({ title, metrics, icon, color }: { title: string; metrics?: QueueMetrics; icon: React.ReactNode; color: string }) {
  if (!metrics) return null;
  return (
    <div className="p-3 border rounded space-y-1.5 bg-slate-50/40 dark:bg-slate-800/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {icon}
          <span>{title}</span>
        </div>
        <Badge className={`text-[10px] ${color}`}>{metrics.current_size} Active</Badge>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground pt-1">
        <div>Avg Wait: <span className="font-medium text-slate-900 dark:text-slate-100">{metrics.average_waiting_time_minutes}m</span></div>
        <div>Est. Finish: <span className="font-medium text-slate-900 dark:text-slate-100">{metrics.estimated_completion_minutes}m</span></div>
      </div>
      {metrics.oldest_order && (
        <div className="text-[9px] text-red-500 font-medium">
          Oldest: #{metrics.oldest_order.clinical_order_id?.substring(0, 6)} ({metrics.oldest_order.elapsed_minutes}m ago)
        </div>
      )}
    </div>
  );
}

export function HospitalQueueDashboard() {
  const { data: queues, isLoading } = useGetHospitalQueueQuery();

  if (isLoading || !queues) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading queue monitoring metrics...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Enterprise Queue Monitoring</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <QueueMetricCard title="Hospital Queue" metrics={queues.hospital_queue} icon={<Layers className="h-3.5 w-3.5 text-blue-500" />} color="bg-blue-600 text-white" />
        <QueueMetricCard title="STAT Queue" metrics={queues.stat_queue} icon={<Zap className="h-3.5 w-3.5 text-amber-500" />} color="bg-amber-500 text-white" />
        <QueueMetricCard title="Overdue Queue" metrics={queues.overdue_queue} icon={<AlertOctagon className="h-3.5 w-3.5 text-red-500" />} color="bg-red-600 text-white" />
        <QueueMetricCard title="Laboratory Queue" metrics={queues.department_queues?.LABORATORY} icon={<Clock className="h-3.5 w-3.5 text-purple-500" />} color="bg-purple-600 text-white" />
        <QueueMetricCard title="Radiology Queue" metrics={queues.department_queues?.RADIOLOGY} icon={<Clock className="h-3.5 w-3.5 text-teal-500" />} color="bg-teal-600 text-white" />
        <QueueMetricCard title="Pharmacy Queue" metrics={queues.department_queues?.PHARMACY} icon={<Clock className="h-3.5 w-3.5 text-emerald-500" />} color="bg-emerald-600 text-white" />
      </CardContent>
    </Card>
  );
}
