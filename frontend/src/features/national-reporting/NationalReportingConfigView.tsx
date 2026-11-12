"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  useGetNationalRequirementsQuery,
  useGetNationalCategoriesQuery,
  useCreateNationalCategoryMutation,
} from "@/redux/api/nationalReportingApi";
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
  Plus,
} from "lucide-react";
import { toast } from "sonner";

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
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    code: "",
    label: "",
    icon: "📊",
    description: "",
    mandate_level: "mandatory_default",
    frequency_default: "monthly",
    typical_units: "",
  });

  const { data: requirements = [] } = useGetNationalRequirementsQuery({});
  const { data: customCategories = [] } = useGetNationalCategoriesQuery();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateNationalCategoryMutation();

  // Combine built-in categories with custom categories from DB
  const allCategories = useMemo(() => {
    const combined: any[] = [...NATIONAL_REPORTING_CATEGORIES.map((c) => ({ ...c, is_custom: false }))];
    const seen = new Set(combined.map((c) => c.code.toLowerCase()));

    customCategories.forEach((cat) => {
      if (!seen.has(cat.code.toLowerCase())) {
        combined.push({
          code: cat.code,
          label: cat.label,
          icon: cat.icon || "📊",
          description: cat.description || "",
          mandateLevel: cat.mandate_level || cat.mandateLevel || "mandatory_default",
          frequencyDefault: cat.frequency_default || cat.frequencyDefault || "monthly",
          typicalUnits: cat.typical_units || cat.typicalUnits || [],
          is_custom: true,
        });
        seen.add(cat.code.toLowerCase());
      }
    });

    return combined;
  }, [customCategories]);

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
    return allCategories.filter((c) => {
      if (!categorySearch.trim()) return true;
      const q = categorySearch.toLowerCase();
      return (
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [allCategories, categorySearch]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.code || !newCategory.label) {
      toast.error("Category Code and Label are required");
      return;
    }

    try {
      const typicalUnitsArray = newCategory.typical_units
        ? newCategory.typical_units.split(",").map((u) => u.trim()).filter(Boolean)
        : [];

      await createCategory({
        code: newCategory.code.trim().toLowerCase().replace(/[\s\-_]+/g, "_"),
        label: newCategory.label.trim(),
        icon: newCategory.icon || "📊",
        description: newCategory.description.trim(),
        mandate_level: newCategory.mandate_level,
        frequency_default: newCategory.frequency_default,
        typical_units: typicalUnitsArray,
      }).unwrap();

      toast.success("Reporting category created successfully");
      setIsAddCategoryOpen(false);
      setNewCategory({
        code: "",
        label: "",
        icon: "📊",
        description: "",
        mandate_level: "mandatory_default",
        frequency_default: "monthly",
        typical_units: "",
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create category");
    }
  };

  const categoryColumns: ColumnDef<any>[] = useMemo(
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
                  {item.is_custom && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                      Custom
                    </Badge>
                  )}
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
              {(units || []).map((u: string) => (
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

                <div className="flex items-center gap-2">
                  <div className="relative w-52">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                    onClick={() => setIsAddCategoryOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Category</span>
                  </Button>
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

      {/* Add Reporting Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Reporting Category Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-3 py-2">
            <div>
              <Label htmlFor="cat-code" className="text-xs">Category Code * (Unique Key)</Label>
              <Input
                id="cat-code"
                placeholder="e.g. geothermal_energy"
                value={newCategory.code}
                onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
                required
                className="text-xs font-mono h-8 mt-1"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
                <Label htmlFor="cat-label" className="text-xs">Category Label *</Label>
                <Input
                  id="cat-label"
                  placeholder="e.g. Geothermal & Renewable Minerals"
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
                  required
                  className="text-xs h-8 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cat-icon" className="text-xs">Icon Emoji</Label>
                <Input
                  id="cat-icon"
                  placeholder="🌋"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="text-xs h-8 mt-1 text-center"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cat-desc" className="text-xs">Description</Label>
              <Textarea
                id="cat-desc"
                placeholder="Briefly describe what this reporting category encompasses..."
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                rows={2}
                className="text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cat-mandate" className="text-xs">Default Mandate</Label>
                <Select
                  value={newCategory.mandate_level}
                  onValueChange={(val) => setNewCategory({ ...newCategory, mandate_level: val })}
                >
                  <SelectTrigger id="cat-mandate" className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory_default" className="text-xs">Mandatory Default</SelectItem>
                    <SelectItem value="optional_default" className="text-xs">Optional Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cat-freq" className="text-xs">Default Frequency</Label>
                <Select
                  value={newCategory.frequency_default}
                  onValueChange={(val) => setNewCategory({ ...newCategory, frequency_default: val })}
                >
                  <SelectTrigger id="cat-freq" className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                    <SelectItem value="semi_annual" className="text-xs">Semi-Annual</SelectItem>
                    <SelectItem value="annual" className="text-xs">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="cat-units" className="text-xs">Typical Units (Comma-separated)</Label>
              <Input
                id="cat-units"
                placeholder="e.g. kwh, mwh, count"
                value={newCategory.typical_units}
                onChange={(e) => setNewCategory({ ...newCategory, typical_units: e.target.value })}
                className="text-xs font-mono h-8 mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingCategory} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isCreatingCategory ? "Saving..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

