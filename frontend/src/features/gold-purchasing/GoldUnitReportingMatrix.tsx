"use client";

import React, { useMemo } from "react";
import { Scale, Check, Layers, ArrowRight, Sparkles, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GoldMeasurementUnit, UnitBreakdownItem } from "@/redux/types/gold";

export interface UnitInfo {
  unit_id?: string;
  name: string;
  code: string;
  symbol: string;
  conversion_factor: number;
  is_canonical_base?: boolean;
}

export const FALLBACK_STANDARD_UNITS: UnitInfo[] = [
  {
    name: "Gram",
    code: "GRAM",
    symbol: "g",
    conversion_factor: 1.0,
    is_canonical_base: true,
  },
  {
    name: "Kilogram",
    code: "KG",
    symbol: "kg",
    conversion_factor: 1000.0,
    is_canonical_base: false,
  },
];

/**
 * Merge API measurement units with default Gram and Kilogram to guarantee both always exist.
 */
export function resolveConfiguredUnits(
  apiUnits?: Array<GoldMeasurementUnit | UnitInfo>
): UnitInfo[] {
  const map = new Map<string, UnitInfo>();

  // Always seed Gram and Kilogram
  for (const def of FALLBACK_STANDARD_UNITS) {
    map.set(def.code.toUpperCase(), { ...def });
  }

  if (apiUnits && Array.isArray(apiUnits)) {
    for (const u of apiUnits) {
      if (!u || !u.code) continue;
      const codeKey = u.code.toUpperCase();
      const factor = parseFloat(String(u.conversion_factor)) || 1.0;
      map.set(codeKey, {
        unit_id: u.unit_id,
        name: u.name || codeKey,
        code: codeKey,
        symbol: u.symbol || codeKey.toLowerCase(),
        conversion_factor: factor,
        is_canonical_base: Boolean(u.is_canonical_base || factor === 1.0),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.is_canonical_base) return -1;
    if (b.is_canonical_base) return 1;
    return a.conversion_factor - b.conversion_factor;
  });
}

/**
 * Convert canonical grams to target unit.
 */
export function convertGramsToUnit(
  grams: number | string,
  unit?: UnitInfo | null
): number {
  const g = parseFloat(String(grams || 0));
  if (isNaN(g) || g === 0) return 0;
  const factor = unit?.conversion_factor || 1.0;
  return g / factor;
}

/**
 * Format a volume quantity in the specified unit with sensible decimal places.
 */
export function formatUnitVolume(
  grams: number | string,
  unit?: UnitInfo | null
): string {
  const val = convertGramsToUnit(grams, unit);
  const factor = unit?.conversion_factor || 1.0;
  // If unit is kg or larger, 3-4 decimals; grams: 2-4 decimals
  const decimals = factor >= 1000 ? 3 : factor <= 1 ? 2 : 3;
  return val.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals + 1,
  });
}

interface GoldUnitReportingMatrixProps {
  /** Canonical gold weight in grams for the selected period */
  canonicalGramsPeriod: number;
  /** Canonical gold weight in grams all-time (optional) */
  canonicalGramsAllTime?: number;
  /** Configured units from API */
  configuredUnits?: Array<GoldMeasurementUnit | UnitInfo>;
  /** Native unit recording breakdown from API (optional) */
  unitBreakdown?: UnitBreakdownItem[];
  /** Currently selected unit code: e.g. "GRAM", "KG", or "all" */
  selectedUnitCode: string;
  /** Callback to change selected unit */
  onSelectUnit: (unitCode: string) => void;
  /** Period title: e.g. "Today" or "Period: 2026-11-01 -> 2026-11-25" */
  periodLabel?: string;
  /** Whether to show the detailed cards grid */
  showCardsGrid?: boolean;
}

export function GoldUnitReportingMatrix({
  canonicalGramsPeriod,
  canonicalGramsAllTime,
  configuredUnits,
  unitBreakdown = [],
  selectedUnitCode,
  onSelectUnit,
  periodLabel = "Period",
  showCardsGrid = true,
}: GoldUnitReportingMatrixProps) {
  const units = useMemo(
    () => resolveConfiguredUnits(configuredUnits),
    [configuredUnits]
  );

  const activeUnit = useMemo(() => {
    if (selectedUnitCode === "all") return null;
    return (
      units.find((u) => u.code.toUpperCase() === selectedUnitCode.toUpperCase()) ||
      units.find((u) => u.is_canonical_base) ||
      units[0]
    );
  }, [units, selectedUnitCode]);

  // Lookup map for native recording transactions
  const nativeBreakdownMap = useMemo(() => {
    const map = new Map<string, UnitBreakdownItem>();
    for (const b of unitBreakdown) {
      if (b?.code) {
        map.set(b.code.toUpperCase(), b);
      }
    }
    return map;
  }, [unitBreakdown]);

  return (
    <div className="space-y-4">
      {/* ----------------- UNIT SELECTOR TOOLBAR ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Unit Reporting & Conversion</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-600 bg-amber-500/5">
                {activeUnit ? `Active: ${activeUnit.name} (${activeUnit.symbol})` : "All Configured Units"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {activeUnit
                ? `Dashboard volume metrics and analytics are converted into ${activeUnit.name} (${activeUnit.symbol})`
                : "Comparative multi-unit telemetry across all active metric and traditional standards"}
            </p>
          </div>
        </div>

        {/* Quick Unit Pills */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectUnit("GRAM")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedUnitCode.toUpperCase() === "GRAM"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gram (g)
          </button>
          <button
            type="button"
            onClick={() => onSelectUnit("KG")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedUnitCode.toUpperCase() === "KG"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kilogram (kg)
          </button>

          {/* Other configured units (e.g. OUNCE, TOLA) */}
          {units
            .filter((u) => u.code.toUpperCase() !== "GRAM" && u.code.toUpperCase() !== "KG")
            .map((u) => (
              <button
                key={u.code}
                type="button"
                onClick={() => onSelectUnit(u.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedUnitCode.toUpperCase() === u.code.toUpperCase()
                    ? "bg-background text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {u.name} ({u.symbol})
              </button>
            ))}

          <button
            type="button"
            onClick={() => onSelectUnit("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              selectedUnitCode === "all"
                ? "bg-amber-500 text-white shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3 w-3" />
            All Units
          </button>
        </div>
      </div>

      {/* ----------------- MULTI-UNIT REPORTING CARDS MATRIX ----------------- */}
      {(showCardsGrid || selectedUnitCode === "all") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Volume Equivalent Across All Configured Standards ({periodLabel})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Canonical Base: {canonicalGramsPeriod.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {units.map((unit) => {
              const convertedPeriod = convertGramsToUnit(canonicalGramsPeriod, unit);
              const convertedAllTime = canonicalGramsAllTime !== undefined
                ? convertGramsToUnit(canonicalGramsAllTime, unit)
                : null;
              const nativeRec = nativeBreakdownMap.get(unit.code.toUpperCase());
              const isSelected = selectedUnitCode.toUpperCase() === unit.code.toUpperCase();

              return (
                <Card
                  key={unit.code}
                  className={`border transition-all relative overflow-hidden ${
                    isSelected
                      ? "border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-sm"
                      : "border-border hover:border-border/80 bg-card"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={unit.is_canonical_base ? "default" : "outline"}
                          className={`font-mono text-xs font-bold px-2 py-0.5 ${
                            unit.is_canonical_base
                              ? "bg-amber-500 text-white"
                              : "border-amber-500/30 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {unit.symbol}
                        </Badge>
                        <div>
                          <div className="font-bold text-xs text-foreground leading-tight">{unit.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            1 {unit.symbol} = {unit.conversion_factor.toLocaleString()} g
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10 gap-0.5">
                          <Check className="h-2.5 w-2.5" /> Active
                        </Badge>
                      )}
                    </div>

                    {/* Converted Volume Metric */}
                    <div className="pt-1 border-t border-border/50">
                      <div className="text-[11px] text-muted-foreground">Acquired Volume ({periodLabel})</div>
                      <div className="text-lg font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1">
                        <span>
                          {convertedPeriod.toLocaleString(undefined, {
                            minimumFractionDigits: unit.conversion_factor >= 1000 ? 3 : 2,
                            maximumFractionDigits: unit.conversion_factor >= 1000 ? 4 : 3,
                          })}
                        </span>
                        <span className="text-xs font-sans text-amber-600 dark:text-amber-400 font-semibold">
                          {unit.symbol}
                        </span>
                      </div>
                    </div>

                    {/* All-time volume or Native recordings */}
                    <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                      {convertedAllTime !== null && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span>All-Time:</span>
                          <span className="font-mono font-medium text-foreground">
                            {convertedAllTime.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 3,
                            })}{" "}
                            {unit.symbol}
                          </span>
                        </div>
                      )}

                      {nativeRec ? (
                        <div className="flex items-center justify-between text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-md">
                          <span>Natively Recorded:</span>
                          <span className="font-mono font-bold">
                            {nativeRec.purchase_count} tx ({parseFloat(String(nativeRec.total_quantity || 0)).toLocaleString()} {unit.symbol})
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground/70 italic">
                          Standard metric rollup
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onSelectUnit(unit.code)}
                      className="w-full h-7 text-[11px] font-medium gap-1"
                    >
                      {isSelected ? "Currently Active Unit" : `Report in ${unit.name} (${unit.symbol})`}
                      {!isSelected && <ArrowRight className="h-3 w-3 ml-0.5" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
