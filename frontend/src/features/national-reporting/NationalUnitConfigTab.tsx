"use client";

import React, { useState, useMemo } from "react";
import {
  useGetNationalUnitsCatalogQuery,
  useCreateNationalUnitMutation,
  useCreateNationalMeasurementCategoryMutation,
} from "@/redux/api/nationalReportingApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import {
  Scale,
  Search,
  ArrowRight,
  Layers,
  Sparkles,
  Calculator,
  CheckCircle2,
  HelpCircle,
  Hash,
  Boxes,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

// Standard canonical metadata for measurement categories
const CATEGORY_META: Record<
  string,
  { label: string; icon: string; description: string; defaultBase: string }
> = {
  mass: {
    label: "Mass & Weight",
    icon: "⚖️",
    description: "Solid mineral production, ore extraction, concentrates (kg, ton, quintal, ounce, gram).",
    defaultBase: "kg",
  },
  volume: {
    label: "Volume & Liquid",
    icon: "🧪",
    description: "Liquid minerals, geothermal discharges, petroleum, water usage (m³, barrel, liter, gallon).",
    defaultBase: "m3",
  },
  count: {
    label: "Discrete Count & Quantity",
    icon: "🔢",
    description: "Licenses issued, artisanal cooperatives, inspection missions, operational mining sites, jobs created.",
    defaultBase: "count",
  },
  percentage: {
    label: "Percentage & Proportions",
    icon: "📊",
    description: "Recovery rates, compliance ratios, environmental remediation percentages, gender parity indices.",
    defaultBase: "percentage",
  },
  area: {
    label: "Geographic Area & Land",
    icon: "🗺️",
    description: "Concession boundaries, exploration licenses acreage, reclaimed land (hectare, m², km²).",
    defaultBase: "sq_m",
  },
  currency: {
    label: "Financial & Royalty Value",
    icon: "💰",
    description: "Royalty revenue, community development fund transfers, mining lease fees (ETB, Birr, USD).",
    defaultBase: "etb",
  },
};

export function NationalUnitConfigTab() {
  const { data: unitsCatalog = {}, isLoading } = useGetNationalUnitsCatalogQuery();
  const [createUnit, { isLoading: isCreatingUnit }] = useCreateNationalUnitMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateNationalMeasurementCategoryMutation();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog States
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Form State: Add Unit
  const [newUnit, setNewUnit] = useState({
    unit_code: "",
    label: "",
    category: "mass",
    base_unit: "",
    multiplier: "1.0",
    is_base: false,
  });

  // Form State: Add Category
  const [newCategory, setNewCategory] = useState({
    category: "",
    base_unit: "",
    base_label: "",
  });

  // Interactive standardizer test tool state
  const [calcCategory, setCalcCategory] = useState<string>("mass");
  const [calcAmount, setCalcAmount] = useState<string>("100");
  const [calcFromUnit, setCalcFromUnit] = useState<string>("quintal");
  const [calcToUnit, setCalcToUnit] = useState<string>("ton");

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnit.unit_code || !newUnit.category) {
      toast.error("Unit Code and Category are required");
      return;
    }

    try {
      const catBase = unitsCatalog[newUnit.category]?.base || newUnit.unit_code;
      await createUnit({
        unit_code: newUnit.unit_code.trim().toLowerCase().replace(/[\s\-_]+/g, "_"),
        label: newUnit.label.trim() || newUnit.unit_code.trim(),
        category: newUnit.category.trim().toLowerCase(),
        base_unit: newUnit.base_unit ? newUnit.base_unit.trim().toLowerCase() : catBase,
        multiplier: parseFloat(newUnit.multiplier) || 1.0,
        is_base: newUnit.is_base,
      }).unwrap();

      toast.success("Measurement unit registered successfully");
      setIsAddUnitOpen(false);
      setNewUnit({
        unit_code: "",
        label: "",
        category: "mass",
        base_unit: "",
        multiplier: "1.0",
        is_base: false,
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create unit");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.category || !newCategory.base_unit) {
      toast.error("Category Name and Base Unit are required");
      return;
    }

    try {
      await createCategory({
        category: newCategory.category.trim().toLowerCase().replace(/[\s\-_]+/g, "_"),
        base_unit: newCategory.base_unit.trim().toLowerCase().replace(/[\s\-_]+/g, "_"),
        base_label: newCategory.base_label.trim() || newCategory.base_unit.trim(),
      }).unwrap();

      toast.success("Measurement category and base unit registered successfully");
      setIsAddCategoryOpen(false);
      setNewCategory({
        category: "",
        base_unit: "",
        base_label: "",
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create measurement category");
    }
  };

  // Format catalog entries into flattened table rows
  const unitRows = useMemo(() => {
    const rows: Array<{
      id: string;
      unit: string;
      category: string;
      isBase: boolean;
      baseUnit: string;
      multiplier: number;
    }> = [];

    Object.entries(unitsCatalog).forEach(([catKey, catData]) => {
      const base = catData.base;
      const factors = catData.factors || {};

      catData.units.forEach((u) => {
        const mult = factors[u] != null ? factors[u] : 1;
        const isBase = u.toLowerCase() === base.toLowerCase();
        rows.push({
          id: `${catKey}-${u}`,
          unit: u,
          category: catKey,
          isBase,
          baseUnit: base,
          multiplier: mult,
        });
      });
    });

    return rows;
  }, [unitsCatalog]);

  const filteredUnitRows = useMemo(() => {
    return unitRows.filter((r) => {
      if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return r.unit.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
  }, [unitRows, selectedCategory, searchQuery]);

  // Conversion test calculation
  const calculatedResult = useMemo(() => {
    const cat = unitsCatalog[calcCategory];
    if (!cat) return null;
    const factors = cat.factors || {};
    const fromFactor = factors[calcFromUnit] ?? 1;
    const toFactor = factors[calcToUnit] ?? 1;

    const num = parseFloat(calcAmount);
    if (isNaN(num)) return null;

    const inBase = num * fromFactor;
    const converted = inBase / toFactor;
    return {
      converted: Math.round(converted * 10000) / 10000,
      inBase: Math.round(inBase * 10000) / 10000,
      baseUnit: cat.base,
    };
  }, [unitsCatalog, calcCategory, calcAmount, calcFromUnit, calcToUnit]);

  // Available units for the test calculator
  const activeCalcUnits = useMemo(() => {
    return unitsCatalog[calcCategory]?.units || [];
  }, [unitsCatalog, calcCategory]);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "unit",
        header: "Standard Unit / Alias",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {item.unit}
              </span>
              {item.isBase && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[9px] flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Canonical Base
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "category",
        header: "Measurement Category",
        cell: ({ row }) => {
          const cat = row.original.category;
          const meta = CATEGORY_META[cat];
          return (
            <div className="flex items-center gap-1.5">
              <span>{meta?.icon || "📐"}</span>
              <span className="text-xs font-medium capitalize">
                {meta?.label || cat}
              </span>
            </div>
          );
        },
      },
      {
        id: "conversion",
        header: "Canonical Conversion Factor",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="font-mono text-xs">
              <span className="text-slate-500">1 {item.unit} = </span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                {item.multiplier}{" "}
              </strong>
              <span className="text-slate-500">{item.baseUnit}</span>
            </div>
          );
        },
      },
      {
        id: "compatibility",
        header: "Compatibility Scope",
        cell: ({ row }) => {
          const cat = row.original.category;
          return (
            <Badge variant="outline" className="text-[10px] text-slate-500">
              Interchangeable within {cat}
            </Badge>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Category Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const catData = unitsCatalog[key];
          const unitCount = catData?.units?.length || 0;
          const isSelected = selectedCategory === key;

          return (
            <Card
              key={key}
              onClick={() => setSelectedCategory(isSelected ? "all" : key)}
              className={`p-3.5 cursor-pointer transition-all border rounded-xl ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm"
                  : "hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {meta.label}
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                      Base: {catData?.base || meta.defaultBase}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {unitCount} units
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                {meta.description}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Interactive Standardizer Calculator */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Calculator className="h-4 w-4 text-emerald-600" />
            <span>Interactive National Unit Standardizer & Calculator</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Test how local regional measurements are automatically converted to national standard units during submissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs text-slate-600">Measurement Category</Label>
              <Select
                value={calcCategory}
                onValueChange={(val) => {
                  setCalcCategory(val);
                  const units = unitsCatalog[val]?.units || [];
                  if (units.length > 0) {
                    setCalcFromUnit(units[0]);
                    setCalcToUnit(units[Math.min(1, units.length - 1)]);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {meta.icon} {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600">Regional Reported Quantity</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="Quantity"
                />
                <Select value={calcFromUnit} onValueChange={setCalcFromUnit}>
                  <SelectTrigger className="w-28 h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCalcUnits.map((u) => (
                      <SelectItem key={u} value={u} className="text-xs font-mono">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-600">Standardized Target Unit</Label>
              <Select value={calcToUnit} onValueChange={setCalcToUnit}>
                <SelectTrigger className="h-8 text-xs font-mono mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeCalcUnits.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs font-mono">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Federal Standardized Result
              </span>
              <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {calculatedResult
                  ? `${calculatedResult.converted.toLocaleString()} ${calcToUnit}`
                  : "—"}
              </div>
              {calculatedResult && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  ({calculatedResult.inBase.toLocaleString()} {calculatedResult.baseUnit} in base)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Units Catalog Matrix */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-emerald-600" />
                <span>Standard Units Catalog & Conversion Multipliers</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Official measurement units recognized by the national reporting framework and their fixed base multipliers.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-40">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search units..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Categories
                  </SelectItem>
                  {Object.keys(unitsCatalog).map((catKey) => {
                    const meta = CATEGORY_META[catKey];
                    return (
                      <SelectItem key={catKey} value={catKey} className="text-xs capitalize">
                        {meta ? meta.label : catKey.replace(/_/g, " ")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs flex items-center gap-1.5"
                onClick={() => setIsAddCategoryOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Category</span>
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                onClick={() => setIsAddUnitOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Unit</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1">
          <DataTable
            columns={columns}
            data={filteredUnitRows}
            defaultPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Add Measurement Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Measurement Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-3 py-2">
            <div>
              <Label htmlFor="m-cat-code" className="text-xs">Category Key *</Label>
              <Input
                id="m-cat-code"
                placeholder="e.g. energy, radiation, linear_distance"
                value={newCategory.category}
                onChange={(e) => setNewCategory({ ...newCategory, category: e.target.value })}
                required
                className="text-xs font-mono h-8 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="m-base-unit" className="text-xs">Base Unit Code *</Label>
                <Input
                  id="m-base-unit"
                  placeholder="e.g. kwh, m, bq"
                  value={newCategory.base_unit}
                  onChange={(e) => setNewCategory({ ...newCategory, base_unit: e.target.value })}
                  required
                  className="text-xs font-mono h-8 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="m-base-label" className="text-xs">Base Unit Label</Label>
                <Input
                  id="m-base-label"
                  placeholder="e.g. Kilowatt-Hour"
                  value={newCategory.base_label}
                  onChange={(e) => setNewCategory({ ...newCategory, base_label: e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              The base unit is the canonical anchor unit (multiplier 1.0) for this measurement class. All other units added to this category will convert relative to it.
            </p>
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

      {/* Add Custom Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Measurement Unit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUnit} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="u-code" className="text-xs">Unit Code *</Label>
                <Input
                  id="u-code"
                  placeholder="e.g. carat, pound, liter"
                  value={newUnit.unit_code}
                  onChange={(e) => setNewUnit({ ...newUnit, unit_code: e.target.value })}
                  required
                  className="text-xs font-mono h-8 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="u-label" className="text-xs">Display Label</Label>
                <Input
                  id="u-label"
                  placeholder="e.g. Carat (0.2g)"
                  value={newUnit.label}
                  onChange={(e) => setNewUnit({ ...newUnit, label: e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="u-category" className="text-xs">Measurement Category *</Label>
              <Select
                value={newUnit.category}
                onValueChange={(val) => {
                  const defaultBase = unitsCatalog[val]?.base || "";
                  setNewUnit({ ...newUnit, category: val, base_unit: defaultBase });
                }}
              >
                <SelectTrigger id="u-category" className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(unitsCatalog).map((catKey) => {
                    const meta = CATEGORY_META[catKey];
                    return (
                      <SelectItem key={catKey} value={catKey} className="text-xs capitalize">
                        {meta ? `${meta.icon} ${meta.label}` : catKey.replace(/_/g, " ")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="u-base" className="text-xs">Base Unit of Category</Label>
                <Input
                  id="u-base"
                  disabled
                  value={unitsCatalog[newUnit.category]?.base || newUnit.category}
                  className="text-xs font-mono h-8 mt-1 bg-slate-100 dark:bg-slate-800 text-slate-500"
                />
              </div>
              <div>
                <Label htmlFor="u-multiplier" className="text-xs">Multiplier to Base Unit *</Label>
                <Input
                  id="u-multiplier"
                  type="number"
                  step="any"
                  placeholder="e.g. 0.0002"
                  value={newUnit.multiplier}
                  onChange={(e) => setNewUnit({ ...newUnit, multiplier: e.target.value })}
                  required
                  className="text-xs font-mono h-8 mt-1"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Formula: 1 <strong>{newUnit.unit_code || "unit"}</strong> ={" "}
              <strong>{newUnit.multiplier || "1"}</strong>{" "}
              <strong>{unitsCatalog[newUnit.category]?.base || "base"}</strong>.
            </p>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddUnitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingUnit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isCreatingUnit ? "Registering..." : "Register Unit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

