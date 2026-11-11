"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useGetNationalRequirementsQuery } from "@/redux/api/nationalReportingApi";
import { NationalUnitConfigTab } from "./NationalUnitConfigTab";
import {
  Settings,
  Scale,
  Layers,
  ChevronDown,
  ChevronRight,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  Building2,
  Coins,
  HardHat,
  Search,
} from "lucide-react";

export interface ReportingCategoryDefinition {
  code: string;
  label: string;
  icon: string;
  description: string;
  mandateLevel: "mandatory_default" | "optional_default";
  frequencyDefault: "quarterly" | "monthly" | "annual";
  typicalUnits: string[];
}

export const NATIONAL_REPORTING_CATEGORIES: ReportingCategoryDefinition[] = [
  {
    code: "mining_production",
    label: "Mining Production & Output",
    icon: "⛏️",
    description: "Extraction of metallic, non-metallic, construction, and strategic minerals across provinces.",
    mandateLevel: "mandatory_default",
    frequencyDefault: "quarterly",
    typicalUnits: ["kg", "ton", "quintal", "gram", "m3"],
  },
  {
    code: "mineral_exploration",
    label: "Mineral Exploration & Reserve Estimation",
    icon: "🧭",
    description: "Geological surveys, core drilling milestones, and resource classification by regional license holders.",
    mandateLevel: "mandatory_default",
    frequencyDefault: "semi-annual" as any,
    typicalUnits: ["meter", "sample", "dataset", "sq_km"],
  },
  {
    code: "industrial_capacity",
    label: "Industrial Capacity & Beneficiation",
    icon: "🏭",
    description: "Local mineral processing, value addition plants, refinery utilization, and domestic smelter quotas.",
    mandateLevel: "optional_default",
    frequencyDefault: "annual",
    typicalUnits: ["ton", "percentage", "facility"],
  },
  {
    code: "revenue_generation",
    label: "Revenue, Royalties & Mining Tax",
    icon: "💰",
    description: "Provincial mineral royalty collections, land rent, licensing fees, and local community fund levies.",
    mandateLevel: "mandatory_default",
    frequencyDefault: "quarterly",
    typicalUnits: ["etb", "birr", "usd"],
  },
  {
    code: "environmental_compliance",
    label: "Environmental Remediation & Community",
    icon: "🌿",
    description: "Mined land reclamation, environmental impact assessments, water safety, and resettlement programs.",
    mandateLevel: "mandatory_default",
    frequencyDefault: "quarterly",
    typicalUnits: ["hectare", "sq_m", "percentage", "site"],
  },
  {
    code: "artisanal_mining",
    label: "Artisanal & Small-Scale Mining (ASM)",
    icon: "👷",
    description: "Traditional mining cooperatives, ASM registry, gold purchasing center throughput, and formalization.",
    mandateLevel: "mandatory_default",
    frequencyDefault: "monthly" as any,
    typicalUnits: ["cooperative", "person", "gram", "license"],
  },
  {
    code: "safety_and_inspections",
    label: "Mine Safety & Regulatory Inspection",
    icon: "🛡️",
    description: "Occupational safety audits, technical inspections, incident investigations, and enforcement orders.",
    mandateLevel: "optional_default",
    frequencyDefault: "quarterly",
    typicalUnits: ["inspection", "report", "occurrence", "count"],
  },
];

export function NationalReportingConfigView() {
  const [activeTab, setActiveTab] = useState<string>("categories");
  const [categorySearch, setCategorySearch] = useState<string>("");

  const { data: requirements = [] } = useGetNationalRequirementsQuery({});

  // Count active requirements per category
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    requirements.forEach((req) => {
      const c = req.category || "mining_production";
      stats[c] = (stats[c] || 0) + 1;
    });
    return stats;
  }, [requirements]);

  const filteredCategories = useMemo(() => {
    return NATIONAL_REPORTING_CATEGORIES.filter((c) => {
      if (!categorySearch.trim()) return true;
      const q = categorySearch.toLowerCase();
      return (
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [categorySearch]);

  const categoryColumns: ColumnDef<ReportingCategoryDefinition>[] = useMemo(
    () => [
      {
        id: "category",
        header: "Reporting Category",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-start gap-2.5 max-w-md">
              <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                    {item.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "activeIndicators",
        header: "Active Indicators",
        cell: ({ row }) => {
          const count = categoryStats[row.original.code] || 0;
          return (
            <Badge
              variant={count > 0 ? "secondary" : "outline"}
              className="font-mono text-xs"
            >
              {count} indicators
            </Badge>
          );
        },
      },
      {
        id: "mandate",
        header: "Default Mandate",
        cell: ({ row }) => {
          const m = row.original.mandateLevel;
          return m === "mandatory_default" ? (
            <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 text-[10px]">
              Mandatory
            </Badge>
          ) : (
            <Badge variant="outline" className="text-slate-600 text-[10px]">
              Optional
            </Badge>
          );
        },
      },
      {
        id: "frequency",
        header: "Default Cycle",
        cell: ({ row }) => {
          return (
            <span className="text-xs font-mono capitalize text-slate-700 dark:text-slate-300">
              {row.original.frequencyDefault}
            </span>
          );
        },
      },
      {
        id: "typicalUnits",
        header: "Typical Units",
        cell: ({ row }) => {
          const units = row.original.typicalUnits;
          return (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {units.map((u) => (
                <span
                  key={u}
                  className="font-mono text-[9px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                >
                  {u}
                </span>
              ))}
            </div>
          );
        },
      },
    ],
    [categoryStats]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <Sliders className="h-4 w-4" />
            Federal Reporting Administration
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            National Reporting Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure national reporting sectors, measurement categories, and national unit conversion matrices for regional compliance.
          </p>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200 dark:border-slate-700/50 rounded-xl">
          <TabsTrigger
            value="categories"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <Layers className="h-4 w-4" />
            Reporting Categories
          </TabsTrigger>

          <TabsTrigger
            value="measurement"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <Boxes className="h-4 w-4" />
            Measurement Categories
          </TabsTrigger>

          <TabsTrigger
            value="units"
            className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg text-xs font-semibold"
          >
            <Scale className="h-4 w-4" />
            National Unit Configuration
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Reporting Categories */}
        <TabsContent value="categories" className="space-y-4 outline-none">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <span>Federal Reporting Category Taxonomy</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Official sectors under which national reporting indicators and regional mandates are grouped.
                  </CardDescription>
                </div>

                <div className="relative w-52">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-1">
              <DataTable
                columns={categoryColumns}
                data={filteredCategories}
                defaultPageSize={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Measurement Categories */}
        <TabsContent value="measurement" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Mass & Weight Category
                  </h3>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Canonical Base: kg
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Covers solid minerals (gold, gemstones, coal, potash, copper, tantalum). Any local regional unit (e.g. quintal, ton, gram, ounce) is automatically converted to the federal requirement's standard unit (e.g. kg or metric tons).
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs font-mono space-y-1">
                <div>1 ton = 1,000 kg</div>
                <div>1 quintal = 100 kg</div>
                <div>1 gram = 0.001 kg</div>
                <div>1 ounce = 0.0283495 kg</div>
              </div>
            </Card>

            <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧪</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Volume & Liquid Category
                  </h3>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Canonical Base: m³ (Cubic Meter)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Covers petroleum, industrial effluents, geothermal water discharge, and bulk aggregates. Inter-converts between cubic meters, barrels, liters, and gallons.
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs font-mono space-y-1">
                <div>1 m³ = 1.0 m³</div>
                <div>1 barrel = 0.158987 m³</div>
                <div>1 liter = 0.001 m³</div>
                <div>1 gallon = 0.00378541 m³</div>
              </div>
            </Card>

            <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔢</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Discrete Count & Entity Category
                  </h3>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Canonical Base: count
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Covers integer counts of licenses, active cooperative societies, inspection missions, technical reports, operational sites, and direct mining jobs created.
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs font-mono space-y-1">
                <div>license, cooperative, site, person, project, report = 1:1 parity</div>
              </div>
            </Card>

            <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Currency & Financial Value Category
                  </h3>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Canonical Base: ETB (Ethiopian Birr)
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Covers royalties, lease payments, institutional transfers, and export revenue receipts.
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs font-mono space-y-1">
                <div>ETB = 1.0, Birr = 1.0, Ethiopian Birr = 1.0</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: National Unit Configuration */}
        <TabsContent value="units" className="space-y-4 outline-none">
          <NationalUnitConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

