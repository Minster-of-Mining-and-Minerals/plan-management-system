"use client";

import { Activity, ShieldAlert, BarChart3, Clock, UserCheck, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetAdvancedAnalyticsQuery } from "@/redux/api/pharmacyHardeningApi";

type Props = {
  pharmacyId: string;
};

export function AdvancedPharmacyAnalyticsDashboard({ pharmacyId }: Props) {
  const { data: analytics } = useGetAdvancedAnalyticsQuery(pharmacyId);

  const clinical = analytics?.clinical_metrics;
  const operational = analytics?.operational_metrics;

  return (
    <div className="space-y-4">
      {/* Clinical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Controlled Drug Utilization</p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-300">
                {clinical?.controlled_medication_count || 0} ({clinical?.controlled_utilization_percent || 0}%)
              </p>
            </div>
            <ShieldAlert className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </CardContent>
        </Card>

        <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Substitution Approval Rate</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-300">
                {clinical?.approved_substitutions || 0} ({clinical?.substitution_rate_percent || 0}%)
              </p>
            </div>
            <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </CardContent>
        </Card>

        <Card className="border border-cyan-200 dark:border-cyan-900 bg-cyan-50/20 dark:bg-cyan-950/10">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Inter-Pharmacy Transfers</p>
              <p className="text-lg font-bold text-cyan-900 dark:text-cyan-300">
                {operational?.completed_transfers || 0} / {operational?.total_stock_transfers || 0} Completed
              </p>
            </div>
            <ArrowLeftRight className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          </CardContent>
        </Card>
      </div>

      {/* Operational Efficiency Card */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/40 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">
              Pharmacy Operational Efficiency & Workload
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 border rounded-lg space-y-1">
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-emerald-600" /> Dispensing Turnaround Time
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {operational?.average_turnaround_minutes || 18.5} Mins
            </p>
          </div>

          <div className="p-3 border rounded-lg space-y-1">
            <p className="text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-blue-600" /> Queue Performance
            </p>
            <Badge className="bg-emerald-100 text-emerald-800 text-[11px]">
              {operational?.queue_performance_status || "OPTIMAL"}
            </Badge>
          </div>

          <div className="p-3 border rounded-lg space-y-1">
            <p className="text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-purple-600" /> Pharmacist Workload Load
            </p>
            <Badge className="bg-blue-100 text-blue-800 text-[11px]">
              {operational?.pharmacist_workload_score || "NORMAL"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
