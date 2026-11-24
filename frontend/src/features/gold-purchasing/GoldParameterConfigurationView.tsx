"use client";

import { useState } from "react";
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Plus,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Scale,
  Award,
  Coins,
  Layers,
  Info,
  Power,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGoldParameters,
  GoldTypeConfig,
  KaratGradeConfig,
  QualityGradeConfig,
} from "./goldParametersConfig";
import { toast } from "sonner";

export function GoldParameterConfigurationView() {
  const {
    isReady,
    isSpecsModuleEnabled,
    toggleSpecsModule,
    setSpecsModuleEnabled,
    goldTypes,
    karatGrades,
    qualityGrades,
    toggleGoldTypeAvailability,
    toggleKaratAvailability,
    toggleQualityAvailability,
    addGoldType,
    addKaratGrade,
    addQualityGrade,
    resetToDefaults,
  } = useGoldParameters();

  const [activeTab, setActiveTab] = useState<"karat" | "gold_type" | "quality">("karat");

  // Modal dialog states
  const [isAddGoldTypeOpen, setIsAddGoldTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  const [isAddKaratOpen, setIsAddKaratOpen] = useState(false);
  const [newKaratName, setNewKaratName] = useState("");
  const [newKaratPurity, setNewKaratPurity] = useState("");
  const [newKaratMin, setNewKaratMin] = useState("");
  const [newKaratMax, setNewKaratMax] = useState("");

  const [isAddQualityOpen, setIsAddQualityOpen] = useState(false);
  const [newQualityGrade, setNewQualityGrade] = useState("");
  const [newQualityDesc, setNewQualityDesc] = useState("");

  const handleCreateGoldType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast.error("Please enter a gold type name.");
      return;
    }
    addGoldType(newTypeName, newTypeDescription);
    toast.success(`Gold type "${newTypeName}" added and activated.`);
    setNewTypeName("");
    setNewTypeDescription("");
    setIsAddGoldTypeOpen(false);
  };

  const handleCreateKarat = (e: React.FormEvent) => {
    e.preventDefault();
    const purity = parseFloat(newKaratPurity);
    if (!newKaratName.trim() || isNaN(purity) || purity <= 0 || purity > 100) {
      toast.error("Please enter a valid karat and purity percentage between 0 and 100.");
      return;
    }
    const minP = newKaratMin ? parseFloat(newKaratMin) : undefined;
    const maxP = newKaratMax ? parseFloat(newKaratMax) : undefined;
    addKaratGrade(newKaratName, purity, minP, maxP);
    toast.success(`Karat standard "${newKaratName}" configured and activated.`);
    setNewKaratName("");
    setNewKaratPurity("");
    setNewKaratMin("");
    setNewKaratMax("");
    setIsAddKaratOpen(false);
  };

  const handleCreateQuality = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQualityGrade.trim()) {
      toast.error("Please enter a quality grade name.");
      return;
    }
    addQualityGrade(newQualityGrade, newQualityDesc);
    toast.success(`Quality grade "${newQualityGrade}" added and activated.`);
    setNewQualityGrade("");
    setNewQualityDesc("");
    setIsAddQualityOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-card to-card p-6 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
              <Sliders className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Gold Standards & Parameter Configurations
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
                >
                  Federal Authority
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Govern available gold physical types, karat purity benchmarks, and certified quality grades across all purchasing centers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm("Reset all gold parameters and availability to official regulatory defaults?")) {
                resetToDefaults();
                toast.success("Gold standards reset to regulatory defaults.");
              }
            }}
            className="gap-2 h-9 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Defaults
          </Button>
        </div>
      </div>

      {/* MASTER MODULE ENFORCEMENT TOGGLE CARD */}
      <div
        className={`p-6 rounded-3xl border transition-all ${
          isSpecsModuleEnabled
            ? "bg-card border-border shadow-xs"
            : "bg-destructive/5 border-destructive/20 shadow-xs"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isSpecsModuleEnabled
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-muted text-muted-foreground ring-1 ring-border"
              }`}
            >
              <Layers className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Gold Quality & Karat Specifications Category Control
                </h2>
                <Badge
                  variant={isSpecsModuleEnabled ? "default" : "secondary"}
                  className={
                    isSpecsModuleEnabled
                      ? "bg-emerald-600 text-white font-semibold text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                  }
                >
                  {isSpecsModuleEnabled ? "Enforced & Required" : "Disabled / Bypassed"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {isSpecsModuleEnabled
                  ? "Module is ACTIVE across all purchasing centers. Registrars must specify physical Gold Type, Karat Grade, Purity Percentage, and Quality Grading before recording purchases."
                  : "Module is TURNED OFF GLOBALLY: The entire Gold Quality, Karat, and Quality Grading section is hidden in the purchasing register. Purchase intake validation automatically passes without requiring quality or karat specifications."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            <Button
              type="button"
              variant={isSpecsModuleEnabled ? "outline" : "default"}
              size="default"
              onClick={() => {
                toggleSpecsModule();
                toast.success(
                  isSpecsModuleEnabled
                    ? "Gold Quality & Karat Specifications module turned OFF globally. Purchasing side validation will bypass specifications."
                    : "Gold Quality & Karat Specifications module turned ON globally. Specifications will be required in purchasing centers."
                );
              }}
              className={`gap-2 font-bold h-11 px-5 rounded-2xl ${
                isSpecsModuleEnabled
                  ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              }`}
            >
              <Power className="h-4 w-4" />
              {isSpecsModuleEnabled ? "Turn OFF Entire Category" : "Turn ON Specifications Module"}
            </Button>
          </div>
        </div>
      </div>

      {/* Warning banner when disabled */}
      {!isSpecsModuleEnabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Specifications Module is currently Bypassed</p>
            <p className="text-muted-foreground">
              Gold purchase recording forms in purchasing centers do not render or require Gold Type, Karat, or Quality Grade inputs while this category is toggled off. You can still manage individual availability flags below so they will be ready whenever the module is re-enabled.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeTab === "karat" ? "default" : "outline"}
          onClick={() => setActiveTab("karat")}
          className={`h-9 px-4 text-xs font-semibold gap-2 ${
            activeTab === "karat"
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="h-4 w-4" />
          Karat Grades & Purity % ({karatGrades.filter((k) => k.is_available).length} Active)
        </Button>

        <Button
          size="sm"
          variant={activeTab === "gold_type" ? "default" : "outline"}
          onClick={() => setActiveTab("gold_type")}
          className={`h-9 px-4 text-xs font-semibold gap-2 ${
            activeTab === "gold_type"
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Coins className="h-4 w-4" />
          Gold Physical Types ({goldTypes.filter((g) => g.is_available).length} Active)
        </Button>

        <Button
          size="sm"
          variant={activeTab === "quality" ? "default" : "outline"}
          onClick={() => setActiveTab("quality")}
          className={`h-9 px-4 text-xs font-semibold gap-2 ${
            activeTab === "quality"
              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Award className="h-4 w-4" />
          Quality Grading Standards ({qualityGrades.filter((q) => q.is_available).length} Active)
        </Button>
      </div>

      {/* ===================== TAB 1: KARAT GRADES & PURITY PERCENTAGE ===================== */}
      {activeTab === "karat" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Karat Grades & Canonical Purity Benchmarks
              </h2>
              <p className="text-xs text-muted-foreground">
                Set active karat classifications and benchmark purity percentages for purchase calculation. Disabled karats cannot be selected by registrars.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddKaratOpen(true)}
              className="gap-1.5 h-8.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-semibold text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Karat Standard
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {karatGrades.map((kg) => (
              <Card
                key={kg.id}
                className={`p-4 transition-all duration-200 border flex flex-col justify-between ${
                  kg.is_available
                    ? "border-amber-300/80 dark:border-amber-900/60 bg-card shadow-xs"
                    : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-extrabold text-foreground">
                      {kg.karat}
                    </span>
                    <Badge
                      variant={kg.is_available ? "default" : "secondary"}
                      className={`text-[10px] font-semibold cursor-pointer select-none transition-all ${
                        kg.is_available
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                      onClick={() => toggleKaratAvailability(kg.id)}
                      title="Click to toggle availability"
                    >
                      {kg.is_available ? "Available" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Standard Purity:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {kg.default_purity_percentage.toFixed(1)}%
                      </span>
                    </div>
                    {kg.min_purity && kg.max_purity && (
                      <div className="flex items-baseline justify-between text-[11px] text-muted-foreground font-mono">
                        <span>Tolerance:</span>
                        <span>
                          {kg.min_purity}% - {kg.max_purity}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-3">
                  <span className="text-[10.5px] text-muted-foreground italic">
                    {kg.is_system ? "Statutory standard" : "Custom configured"}
                  </span>
                  <Button
                    size="sm"
                    variant={kg.is_available ? "destructive" : "outline"}
                    onClick={() => toggleKaratAvailability(kg.id)}
                    className="h-7 text-[11px] px-2.5 font-semibold"
                  >
                    {kg.is_available ? "Disable" : "Make Available"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GOLD PHYSICAL TYPES ===================== */}
      {activeTab === "gold_type" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Gold Physical Types & Aggregate Classifications
              </h2>
              <p className="text-xs text-muted-foreground">
                Govern accepted physical gold forms (Placer, Dore, Bullion, Nugget) and activate/deactivate them for procurement.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddGoldTypeOpen(true)}
              className="gap-1.5 h-8.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-semibold text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Gold Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goldTypes.map((gt) => (
              <Card
                key={gt.id}
                className={`p-4 transition-all duration-200 border flex flex-col justify-between ${
                  gt.is_available
                    ? "border-amber-300/80 dark:border-amber-900/60 bg-card shadow-xs"
                    : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Coins className="h-4 w-4 text-amber-600 shrink-0" />
                      {gt.name}
                    </h3>
                    <Badge
                      variant={gt.is_available ? "default" : "secondary"}
                      className={`text-[10px] font-semibold cursor-pointer select-none transition-all ${
                        gt.is_available
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                      onClick={() => toggleGoldTypeAvailability(gt.id)}
                      title="Click to toggle availability"
                    >
                      {gt.is_available ? "Available" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {gt.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-3">
                  <span className="text-[10.5px] text-muted-foreground italic">
                    {gt.is_system ? "Core category" : "Custom category"}
                  </span>
                  <Button
                    size="sm"
                    variant={gt.is_available ? "destructive" : "outline"}
                    onClick={() => toggleGoldTypeAvailability(gt.id)}
                    className="h-7 text-[11px] px-2.5 font-semibold"
                  >
                    {gt.is_available ? "Disable" : "Make Available"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: QUALITY GRADING STANDARDS ===================== */}
      {activeTab === "quality" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Certified Quality Grading Standards
              </h2>
              <p className="text-xs text-muted-foreground">
                Define regulatory assay quality standards for export readiness and bank delivery validation.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddQualityOpen(true)}
              className="gap-1.5 h-8.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs font-semibold text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Quality Grade
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualityGrades.map((qg) => (
              <Card
                key={qg.id}
                className={`p-4 transition-all duration-200 border flex flex-col justify-between ${
                  qg.is_available
                    ? "border-amber-300/80 dark:border-amber-900/60 bg-card shadow-xs"
                    : "border-border/50 bg-muted/20 opacity-60"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                      {qg.grade}
                    </h3>
                    <Badge
                      variant={qg.is_available ? "default" : "secondary"}
                      className={`text-[10px] font-semibold cursor-pointer select-none transition-all ${
                        qg.is_available
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                      onClick={() => toggleQualityAvailability(qg.id)}
                      title="Click to toggle availability"
                    >
                      {qg.is_available ? "Available" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-foreground">{qg.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {qg.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-3">
                  <span className="text-[10.5px] text-muted-foreground italic">
                    {qg.is_system ? "Statutory grading" : "Custom standard"}
                  </span>
                  <Button
                    size="sm"
                    variant={qg.is_available ? "destructive" : "outline"}
                    onClick={() => toggleQualityAvailability(qg.id)}
                    className="h-7 text-[11px] px-2.5 font-semibold"
                  >
                    {qg.is_available ? "Disable" : "Make Available"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===================== MODALS ===================== */}
      {/* 1. Modal: Add Gold Type */}
      <Dialog open={isAddGoldTypeOpen} onOpenChange={setIsAddGoldTypeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Gold Physical Type</DialogTitle>
            <DialogDescription>
              Configure a new physical gold classification for purchasing centers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGoldType} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Gold Type Name *</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Concentrated Dore, Black Sand Gold"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Describe extraction context and physical properties..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddGoldTypeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 text-white font-semibold">
                Save & Make Available
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal: Add Karat Standard */}
      <Dialog open={isAddKaratOpen} onOpenChange={setIsAddKaratOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Karat Standard</DialogTitle>
            <DialogDescription>
              Define a new karat grade with standard purity percentage and tolerances.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKarat} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Karat Grade Label *</Label>
              <Input
                value={newKaratName}
                onChange={(e) => setNewKaratName(e.target.value)}
                placeholder="e.g. 23K, 16K, 9K"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Standard Purity Percentage (%) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                max="100"
                value={newKaratPurity}
                onChange={(e) => setNewKaratPurity(e.target.value)}
                placeholder="e.g. 95.8"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Min Tolerance (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newKaratMin}
                  onChange={(e) => setNewKaratMin(e.target.value)}
                  placeholder="e.g. 94.0"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Max Tolerance (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newKaratMax}
                  onChange={(e) => setNewKaratMax(e.target.value)}
                  placeholder="e.g. 97.0"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddKaratOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 text-white font-semibold">
                Save & Make Available
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Modal: Add Quality Grade */}
      <Dialog open={isAddQualityOpen} onOpenChange={setIsAddQualityOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Quality Grade Standard</DialogTitle>
            <DialogDescription>
              Define certified quality specifications for assaying and intake.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuality} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grade Name *</Label>
              <Input
                value={newQualityGrade}
                onChange={(e) => setNewQualityGrade(e.target.value)}
                placeholder="e.g. Grade Premium, Special Reserve"
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description & Assay Criteria</Label>
              <Textarea
                value={newQualityDesc}
                onChange={(e) => setNewQualityDesc(e.target.value)}
                placeholder="Describe assay thresholds, origin, or market destination..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddQualityOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-600 text-white font-semibold">
                Save & Make Available
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
