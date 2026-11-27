"use client";

import React, { useState } from "react";
import { useGetShortTermPlansQuery } from "@/redux/api/shortTermPlanApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { ShortTermDashboardTab } from "./ShortTermDashboardTab";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ShortTermDashboardPageView() {
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: plans = [] } = useGetShortTermPlansQuery(
    sectorFilter !== "all" ? { government_structure_id: sectorFilter } : undefined
  );

  return (
    <div className="space-y-6 p-6 border rounded-lg w-full bg-white shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">
            Short-Term Plan Dashboard Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track reporting and target achievement across Sectors, Departments, Users, and KPIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <Label className="text-xs text-slate-500">Sector</Label>
            <Select
              value={sectorFilter}
              onValueChange={(v) => {
                setSectorFilter(v);
                setPlanFilter("all");
              }}
            >
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Label className="text-xs text-slate-500">Short-Term Plan</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Short-Term Plans</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.short_term_plan_id} value={p.short_term_plan_id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ShortTermDashboardTab
        planId={planFilter !== "all" ? planFilter : undefined}
        sectorId={sectorFilter !== "all" ? sectorFilter : undefined}
      />
    </div>
  );
}
