"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useGetGoldParameterSettingsQuery,
  useUpdateGoldParameterSettingsMutation,
} from "@/redux/api/goldApi";

export interface GoldTypeConfig {
  id: string;
  name: string;
  description: string;
  is_available: boolean;
  is_system?: boolean;
}

export interface KaratGradeConfig {
  id: string;
  karat: string;
  label: string;
  default_purity_percentage: number;
  min_purity?: number;
  max_purity?: number;
  is_available: boolean;
  is_system?: boolean;
}

export interface QualityGradeConfig {
  id: string;
  grade: string;
  label: string;
  description: string;
  is_available: boolean;
  is_system?: boolean;
}

export const DEFAULT_GOLD_TYPES: GoldTypeConfig[] = [
  { id: "gt-1", name: "Raw/Placer Gold", description: "Unrefined alluvial placer gold from riverbeds or shallow pits", is_available: true, is_system: true },
  { id: "gt-2", name: "Smelted Bar", description: "Locally melted and cast crude bullion bar", is_available: true, is_system: true },
  { id: "gt-3", name: "Refined Bullion", description: "Assayed high-purity commercial gold bar", is_available: true, is_system: true },
  { id: "gt-4", name: "Gold Dust", description: "Fine particulate gold recovered through panning or gravity separation", is_available: true, is_system: true },
  { id: "gt-5", name: "Gold Nugget", description: "Naturally occurring dense gold specimen nuggets", is_available: true, is_system: true },
  { id: "gt-6", name: "Dore Bar", description: "Semi-pure alloy bar containing precious metals", is_available: true, is_system: true },
];

export const DEFAULT_KARAT_GRADES: KaratGradeConfig[] = [
  { id: "kg-1", karat: "24K", label: "24K (99.9% Pure)", default_purity_percentage: 99.9, min_purity: 99.0, max_purity: 100.0, is_available: true, is_system: true },
  { id: "kg-2", karat: "22K", label: "22K (91.6% Pure)", default_purity_percentage: 91.6, min_purity: 90.0, max_purity: 93.0, is_available: true, is_system: true },
  { id: "kg-3", karat: "21K", label: "21K (87.5% Pure)", default_purity_percentage: 87.5, min_purity: 86.0, max_purity: 89.0, is_available: true, is_system: true },
  { id: "kg-4", karat: "20K", label: "20K (83.3% Pure)", default_purity_percentage: 83.3, min_purity: 81.0, max_purity: 85.0, is_available: true, is_system: true },
  { id: "kg-5", karat: "18K", label: "18K (75.0% Pure)", default_purity_percentage: 75.0, min_purity: 73.0, max_purity: 78.0, is_available: true, is_system: true },
  { id: "kg-6", karat: "14K", label: "14K (58.5% Pure)", default_purity_percentage: 58.5, min_purity: 56.0, max_purity: 62.0, is_available: true, is_system: true },
  { id: "kg-7", karat: "10K", label: "10K (41.7% Pure)", default_purity_percentage: 41.7, min_purity: 40.0, max_purity: 45.0, is_available: false, is_system: true },
  { id: "kg-8", karat: "Raw", label: "Raw / Unrefined Assayed", default_purity_percentage: 80.0, min_purity: 50.0, max_purity: 95.0, is_available: true, is_system: true },
];

export const DEFAULT_QUALITY_GRADES: QualityGradeConfig[] = [
  { id: "qg-1", grade: "Grade A", label: "Grade A - High Purity Export Grade", description: "Cleaned, high purity certified gold meeting national export reserve standards", is_available: true, is_system: true },
  { id: "qg-2", grade: "Grade B", label: "Grade B - Standard Commercial Grade", description: "Standard commercial trade gold meeting institutional bank intake specifications", is_available: true, is_system: true },
  { id: "qg-3", grade: "Grade C", label: "Grade C - Artisanal / Small-Scale Grade", description: "Field-sourced artisanal gold requiring secondary refinery smelting", is_available: true, is_system: true },
  { id: "qg-4", grade: "Grade D", label: "Grade D - Low Purity / Alluvial Aggregate", description: "Low purity alluvial composite requiring heavy chemical processing", is_available: true, is_system: true },
];

const STORAGE_KEYS = {
  GOLD_TYPES: "prms_gold_types_config_v1",
  KARATS: "prms_karats_config_v1",
  QUALITY_GRADES: "prms_quality_grades_config_v1",
  SPECS_MODULE_ENABLED: "prms_gold_specs_module_enabled_v1",
};

export function loadStoredSpecsModuleEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPECS_MODULE_ENABLED);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function saveStoredSpecsModuleEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.SPECS_MODULE_ENABLED, String(enabled));
    window.dispatchEvent(new Event("gold_parameters_updated"));
  } catch {}
}

export function loadStoredGoldTypes(): GoldTypeConfig[] {
  if (typeof window === "undefined") return DEFAULT_GOLD_TYPES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOLD_TYPES);
    if (!raw) return DEFAULT_GOLD_TYPES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GOLD_TYPES;
  }
}

export function saveStoredGoldTypes(data: GoldTypeConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.GOLD_TYPES, JSON.stringify(data));
    window.dispatchEvent(new Event("gold_parameters_updated"));
  } catch {}
}

export function loadStoredKaratGrades(): KaratGradeConfig[] {
  if (typeof window === "undefined") return DEFAULT_KARAT_GRADES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KARATS);
    if (!raw) return DEFAULT_KARAT_GRADES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_KARAT_GRADES;
  }
}

export function saveStoredKaratGrades(data: KaratGradeConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.KARATS, JSON.stringify(data));
    window.dispatchEvent(new Event("gold_parameters_updated"));
  } catch {}
}

export function loadStoredQualityGrades(): QualityGradeConfig[] {
  if (typeof window === "undefined") return DEFAULT_QUALITY_GRADES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUALITY_GRADES);
    if (!raw) return DEFAULT_QUALITY_GRADES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_QUALITY_GRADES;
  }
}

export function saveStoredQualityGrades(data: QualityGradeConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.QUALITY_GRADES, JSON.stringify(data));
    window.dispatchEvent(new Event("gold_parameters_updated"));
  } catch {}
}

export function useGoldParameters() {
  const { data: serverSettings } = useGetGoldParameterSettingsQuery();
  const [updateServerSettingsMutation] = useUpdateGoldParameterSettingsMutation();

  const [localSpecsEnabled, setLocalSpecsEnabled] = useState<boolean>(() => loadStoredSpecsModuleEnabled());
  const [goldTypes, setGoldTypes] = useState<GoldTypeConfig[]>(DEFAULT_GOLD_TYPES);
  const [karatGrades, setKaratGrades] = useState<KaratGradeConfig[]>(DEFAULT_KARAT_GRADES);
  const [qualityGrades, setQualityGrades] = useState<QualityGradeConfig[]>(DEFAULT_QUALITY_GRADES);
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(() => {
    setLocalSpecsEnabled(loadStoredSpecsModuleEnabled());
    setGoldTypes(loadStoredGoldTypes());
    setKaratGrades(loadStoredKaratGrades());
    setQualityGrades(loadStoredQualityGrades());
    setIsReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener("gold_parameters_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("gold_parameters_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refresh]);

  // Sync whenever serverSettings arrives from backend
  useEffect(() => {
    if (serverSettings) {
      if (typeof serverSettings.is_specs_module_enabled === "boolean") {
        setLocalSpecsEnabled(serverSettings.is_specs_module_enabled);
        saveStoredSpecsModuleEnabled(serverSettings.is_specs_module_enabled);
      }
      if (serverSettings.gold_types?.length) {
        setGoldTypes(serverSettings.gold_types);
        saveStoredGoldTypes(serverSettings.gold_types);
      }
      if (serverSettings.karat_grades?.length) {
        setKaratGrades(serverSettings.karat_grades);
        saveStoredKaratGrades(serverSettings.karat_grades);
      }
      if (serverSettings.quality_grades?.length) {
        setQualityGrades(serverSettings.quality_grades);
        saveStoredQualityGrades(serverSettings.quality_grades);
      }
      setIsReady(true);
    }
  }, [serverSettings]);

  // Server setting is authoritative when present
  const isSpecsModuleEnabled = serverSettings !== undefined && typeof serverSettings.is_specs_module_enabled === "boolean"
    ? serverSettings.is_specs_module_enabled
    : localSpecsEnabled;

  const toggleSpecsModule = async (overrideEnabled?: boolean) => {
    const nextVal = typeof overrideEnabled === "boolean" ? overrideEnabled : !isSpecsModuleEnabled;
    setLocalSpecsEnabled(nextVal);
    saveStoredSpecsModuleEnabled(nextVal);
    try {
      await updateServerSettingsMutation({ is_specs_module_enabled: nextVal }).unwrap();
    } catch (err) {
      console.warn("Could not sync specs module setting to server:", err);
    }
  };

  const setSpecsModuleEnabled = async (enabled: boolean) => {
    setLocalSpecsEnabled(enabled);
    saveStoredSpecsModuleEnabled(enabled);
    try {
      await updateServerSettingsMutation({ is_specs_module_enabled: enabled }).unwrap();
    } catch (err) {
      console.warn("Could not sync specs module setting to server:", err);
    }
  };

  // Filtered active choices for purchase recording and benchmarking
  const availableGoldTypes = goldTypes.filter((g) => g.is_available);
  const availableKaratGrades = karatGrades.filter((k) => k.is_available);
  const availableQualityGrades = qualityGrades.filter((q) => q.is_available);

  const toggleGoldTypeAvailability = async (id: string) => {
    const updated = goldTypes.map((g) => (g.id === id ? { ...g, is_available: !g.is_available } : g));
    setGoldTypes(updated);
    saveStoredGoldTypes(updated);
    try {
      await updateServerSettingsMutation({ gold_types: updated }).unwrap();
    } catch {}
  };

  const toggleKaratAvailability = async (id: string) => {
    const updated = karatGrades.map((k) => (k.id === id ? { ...k, is_available: !k.is_available } : k));
    setKaratGrades(updated);
    saveStoredKaratGrades(updated);
    try {
      await updateServerSettingsMutation({ karat_grades: updated }).unwrap();
    } catch {}
  };

  const toggleQualityAvailability = async (id: string) => {
    const updated = qualityGrades.map((q) => (q.id === id ? { ...q, is_available: !q.is_available } : q));
    setQualityGrades(updated);
    saveStoredQualityGrades(updated);
    try {
      await updateServerSettingsMutation({ quality_grades: updated }).unwrap();
    } catch {}
  };

  const addGoldType = async (name: string, description: string) => {
    const newItem: GoldTypeConfig = {
      id: `gt-custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      is_available: true,
      is_system: false,
    };
    const updated = [...goldTypes, newItem];
    setGoldTypes(updated);
    saveStoredGoldTypes(updated);
    try {
      await updateServerSettingsMutation({ gold_types: updated }).unwrap();
    } catch {}
  };

  const addKaratGrade = async (karat: string, purity: number, minPurity?: number, maxPurity?: number) => {
    const newItem: KaratGradeConfig = {
      id: `kg-custom-${Date.now()}`,
      karat: karat.trim(),
      label: `${karat.trim()} (${purity.toFixed(1)}% Pure)`,
      default_purity_percentage: purity,
      min_purity: minPurity,
      max_purity: maxPurity,
      is_available: true,
      is_system: false,
    };
    const updated = [...karatGrades, newItem];
    setKaratGrades(updated);
    saveStoredKaratGrades(updated);
    try {
      await updateServerSettingsMutation({ karat_grades: updated }).unwrap();
    } catch {}
  };

  const addQualityGrade = async (grade: string, description: string) => {
    const newItem: QualityGradeConfig = {
      id: `qg-custom-${Date.now()}`,
      grade: grade.trim(),
      label: `${grade.trim()} - ${description.trim()}`,
      description: description.trim(),
      is_available: true,
      is_system: false,
    };
    const updated = [...qualityGrades, newItem];
    setQualityGrades(updated);
    saveStoredQualityGrades(updated);
    try {
      await updateServerSettingsMutation({ quality_grades: updated }).unwrap();
    } catch {}
  };

  const resetToDefaults = async () => {
    setGoldTypes(DEFAULT_GOLD_TYPES);
    setKaratGrades(DEFAULT_KARAT_GRADES);
    setQualityGrades(DEFAULT_QUALITY_GRADES);
    setLocalSpecsEnabled(true);
    saveStoredSpecsModuleEnabled(true);
    saveStoredGoldTypes(DEFAULT_GOLD_TYPES);
    saveStoredKaratGrades(DEFAULT_KARAT_GRADES);
    saveStoredQualityGrades(DEFAULT_QUALITY_GRADES);
    try {
      await updateServerSettingsMutation({
        is_specs_module_enabled: true,
        gold_types: DEFAULT_GOLD_TYPES,
        karat_grades: DEFAULT_KARAT_GRADES,
        quality_grades: DEFAULT_QUALITY_GRADES,
      }).unwrap();
    } catch {}
  };

  return {
    isReady,
    isSpecsModuleEnabled,
    toggleSpecsModule,
    setSpecsModuleEnabled,
    goldTypes,
    karatGrades,
    qualityGrades,
    availableGoldTypes,
    availableKaratGrades,
    availableQualityGrades,
    toggleGoldTypeAvailability,
    toggleKaratAvailability,
    toggleQualityAvailability,
    addGoldType,
    addKaratGrade,
    addQualityGrade,
    resetToDefaults,
  };
}
