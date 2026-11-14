"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetPeriodConfigsQuery,
  useUpdatePeriodConfigsMutation,
} from "@/redux/api/nationalReportingApi";
import {
  NationalReportingPeriodConfig,
  PeriodDivisionConfig,
} from "@/redux/types/nationalReporting";
import {
  CalendarRange,
  Clock,
  Sparkles,
  CheckCircle2,
  Save,
  RotateCcw,
  Layers,
  Info,
  Calendar,
  Eye,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

const ETHIOPIAN_MONTH_NAMES = [
  "Hamle (ሐምሌ)",
  "Nehase (ነሐሴ)",
  "Meskerem (መስከረም)",
  "Tikimt (ጥቅምት)",
  "Hidar (ኅዳር)",
  "Tahsas (ታኅሣሥ)",
  "Tir (ጥር)",
  "Yakatit (የካቲት)",
  "Magabit (መጋቢት)",
  "Miyazia (ሚያዝያ)",
  "Ginbot (ግንቦት)",
  "Sene (ሰኔ)",
];

const GREGORIAN_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function NationalPeriodConfigTab() {
  const { data: configs = [], isLoading } = useGetPeriodConfigsQuery();
  const [updateConfig, { isLoading: isUpdating }] = useUpdatePeriodConfigsMutation();

  const [activeFrequency, setActiveFrequency] = useState<string>("monthly");
  const [editedDivisions, setEditedDivisions] = useState<Record<string, PeriodDivisionConfig[]>>({});

  // Sync loaded configs into local editing state
  useEffect(() => {
    if (configs && configs.length > 0) {
      const stateMap: Record<string, PeriodDivisionConfig[]> = {};
      configs.forEach((c) => {
        stateMap[c.frequency] = JSON.parse(JSON.stringify(c.divisions || []));
      });
      setEditedDivisions(stateMap);
    }
  }, [configs]);

  const currentConfig: NationalReportingPeriodConfig | undefined = useMemo(() => {
    return configs.find((c) => c.frequency === activeFrequency);
  }, [configs, activeFrequency]);

  const currentDivisions: PeriodDivisionConfig[] = useMemo(() => {
    return (
      editedDivisions[activeFrequency] ||
      currentConfig?.divisions ||
      []
    );
  }, [editedDivisions, currentConfig, activeFrequency]);

  const handleNameChange = (index: number, newCustomName: string) => {
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const targetIdx = list.findIndex((item) => item.index === index);
      if (targetIdx !== -1) {
        list[targetIdx] = {
          ...list[targetIdx],
          custom_name: newCustomName,
        };
      }
      return {
        ...prev,
        [activeFrequency]: list,
      };
    });
  };

  const handleShortCodeChange = (index: number, newCode: string) => {
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const targetIdx = list.findIndex((item) => item.index === index);
      if (targetIdx !== -1) {
        list[targetIdx] = {
          ...list[targetIdx],
          short_code: newCode,
        };
      }
      return {
        ...prev,
        [activeFrequency]: list,
      };
    });
  };

  // Quick Preset Handlers
  const applyPresetEthiopianMonths = () => {
    if (activeFrequency !== "monthly") return;
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const updated = list.map((div, i) => ({
        ...div,
        custom_name: `Month ${i + 1} / ${ETHIOPIAN_MONTH_NAMES[i] || `Month ${i + 1}`}`,
        short_code: `M${i + 1}`,
      }));
      return { ...prev, [activeFrequency]: updated };
    });
    toast.info("Applied Ethiopian month names preset. Click Save to persist.");
  };

  const applyPresetGregorianMonths = () => {
    if (activeFrequency !== "monthly") return;
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const updated = list.map((div, i) => ({
        ...div,
        custom_name: GREGORIAN_MONTH_NAMES[i] || `Month ${i + 1}`,
        short_code: (GREGORIAN_MONTH_NAMES[i] || `M${i + 1}`).substring(0, 3).toUpperCase(),
      }));
      return { ...prev, [activeFrequency]: updated };
    });
    toast.info("Applied Gregorian month names preset. Click Save to persist.");
  };

  const applyPresetNumericCodes = () => {
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const updated = list.map((div, i) => {
        const padded = String(i + 1).padStart(2, "0");
        return {
          ...div,
          custom_name: `${padded}26 Period ${i + 1}`,
          short_code: `P${padded}`,
        };
      });
      return { ...prev, [activeFrequency]: updated };
    });
    toast.info("Applied numeric fiscal code preset. Click Save to persist.");
  };

  const applyResetToDefault = () => {
    setEditedDivisions((prev) => {
      const list = [...(prev[activeFrequency] || currentConfig?.divisions || [])];
      const updated = list.map((div) => ({
        ...div,
        custom_name: div.default_name,
        short_code: div.division_key,
      }));
      return { ...prev, [activeFrequency]: updated };
    });
    toast.info("Reset to default system division names. Click Save to persist.");
  };

  const handleSave = async () => {
    try {
      await updateConfig({
        frequency: activeFrequency,
        divisions: currentDivisions,
      }).unwrap();
      toast.success(
        `Period communication names for ${activeFrequency.replace(/_/g, " ")} saved successfully`
      );
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update period configuration");
    }
  };

  const frequenciesList = [
    { id: "monthly", label: "Monthly", count: 12, desc: "12 Sequential Divisions (Full Planning Cycle)" },
    { id: "quarterly", label: "Quarterly", count: 4, desc: "4 Quarters (Q1 ~ Q4)" },
    { id: "semi_annually", label: "Semi-Annually", count: 2, desc: "2 Semesters / Halves (H1, H2)" },
    { id: "annually", label: "Annually", count: 1, desc: "1 Annual Master Target Division" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner / Explanation */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-emerald-500/5 via-slate-500/5 to-transparent">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CalendarRange className="h-4 w-4" />
              Reporting Period Classification &amp; Communication Naming
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Customize Display Names for Reporting Divisions
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Federal administrators can assign custom communication names to any reporting division (e.g., naming Division 1 as <strong>January</strong>, <strong>Hamle</strong>, or <strong>0124</strong>). Underlying date intervals, sequential indexing, and target arithmetic remain 100% stable.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <Save className="h-3.5 w-3.5" />
            {isUpdating ? "Saving..." : "Save Classification Names"}
          </Button>
        </CardContent>
      </Card>

      {/* Frequency Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {frequenciesList.map((freq) => {
          const isActive = activeFrequency === freq.id;
          return (
            <button
              key={freq.id}
              type="button"
              onClick={() => setActiveFrequency(freq.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {freq.label}
                </span>
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className={`text-[10px] ${
                    isActive ? "bg-emerald-600 text-white" : ""
                  }`}
                >
                  {freq.count} {freq.count === 1 ? "Division" : "Divisions"}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                {freq.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Preset Action Bar & Custom Name Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-600" />
                <span>
                  Configuring {activeFrequency.replace(/_/g, " ").toUpperCase()} Divisions ({currentDivisions.length})
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Enter communication aliases for each division. These labels will be shown in regional submission modals, dropdowns, and progress receipts.
              </CardDescription>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
              {activeFrequency === "monthly" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPresetEthiopianMonths}
                    className="h-7 text-[11px] px-2 border-emerald-300 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  >
                    Ethiopian Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyPresetGregorianMonths}
                    className="h-7 text-[11px] px-2 hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Gregorian Months
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={applyPresetNumericCodes}
                className="h-7 text-[11px] px-2 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Fiscal Codes (e.g. 0124)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={applyResetToDefault}
                className="h-7 text-[11px] px-2 text-slate-500 hover:text-slate-800"
                title="Reset to default labels"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Defaults
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4 text-left w-20">Division #</th>
                  <th className="py-2.5 px-4 text-left w-36">Default System Key</th>
                  <th className="py-2.5 px-4 text-left">Custom Communication Name *</th>
                  <th className="py-2.5 px-4 text-left w-32">Short Code / Badge</th>
                  <th className="py-2.5 px-4 text-left w-52">Live Interface Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {currentDivisions.map((div) => {
                  return (
                    <tr key={div.index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{div.index}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-[11px] font-semibold">
                          {div.default_name || div.division_key}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <div className="relative">
                          <Input
                            value={div.custom_name || ""}
                            onChange={(e) => handleNameChange(div.index, e.target.value)}
                            placeholder={`e.g. ${div.default_name}, January, 0124...`}
                            className="h-8 text-xs font-medium focus-visible:ring-emerald-500 border-slate-300 dark:border-slate-700 max-w-md"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Input
                          value={div.short_code || ""}
                          onChange={(e) => handleShortCodeChange(div.index, e.target.value)}
                          placeholder="Code"
                          className="h-8 text-xs font-mono font-bold w-24 border-slate-300 dark:border-slate-700"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold">
                            {div.short_code || `D${div.index}`}
                          </span>
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {div.custom_name || div.default_name}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Changes take effect globally across federal and regional reporting interfaces after saving.
              </span>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 self-end sm:self-auto"
            >
              <Save className="h-3.5 w-3.5" />
              {isUpdating ? "Saving Changes..." : "Save Classification Names"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

