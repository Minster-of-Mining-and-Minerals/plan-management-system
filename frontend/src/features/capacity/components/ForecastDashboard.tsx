"use client";

import { TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetForecastQuery } from "@/redux/api/capacityApi";

export function ForecastDashboard() {
  const { data: forecast, isLoading } = useGetForecastQuery();

  if (isLoading || !forecast) {
    return <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">Loading capacity demand forecast...</div>;
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">7-Day Capacity Demand Forecast</CardTitle>
          <Badge variant="outline" className="ml-auto text-[9px]">ML Readiness: {forecast.ml_readiness_score}%</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-3">
        {/* 7-day forecast grid */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono">
          {forecast.seven_day_forecast.map((f) => (
            <div key={f.day} className={`p-1.5 border rounded ${f.risk === "HIGH" ? "bg-red-50/60 border-red-200 dark:bg-red-950/20" : "bg-slate-50/50"}`}>
              <div className="text-[9px] text-muted-foreground">{f.day}</div>
              <div className="text-xs font-bold mt-0.5">{f.expected_orders}</div>
            </div>
          ))}
        </div>

        {/* Peak Hours */}
        <div className="border-t pt-2 space-y-1">
          <div className="font-semibold text-[10px] text-muted-foreground">Predicted Peak Demand Hours</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div>Consultation: <span className="font-medium text-slate-900 dark:text-slate-100">{forecast.peak_hours.consultation_peak}</span></div>
            <div>Laboratory: <span className="font-medium text-slate-900 dark:text-slate-100">{forecast.peak_hours.laboratory_peak}</span></div>
            <div>Radiology: <span className="font-medium text-slate-900 dark:text-slate-100">{forecast.peak_hours.radiology_peak}</span></div>
            <div>Pharmacy: <span className="font-medium text-slate-900 dark:text-slate-100">{forecast.peak_hours.pharmacy_peak}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
