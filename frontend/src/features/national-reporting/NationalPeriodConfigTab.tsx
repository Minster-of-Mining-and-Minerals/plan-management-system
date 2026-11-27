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
  ShieldCheck,
  AlertCircle,
  Hourglass,
  ArrowRight,
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

interface FrequencyPhaseState {
  openDaysBefore: number;
  closeDaysAfter: number;
  allowGracePeriod: boolean;
  phaseDescription: string;
}

const DEFAULT_PHASE_RULES: Record<string, FrequencyPhaseState> = {
  daily: { openDaysBefore: 0, closeDaysAfter: 1, allowGracePeriod: true, phaseDescription: "Same-day reporting with 24h grace buffer" },
  weekly: { openDaysBefore: 2, closeDaysAfter: 3, allowGracePeriod: true, phaseDescription: "Opens 2 days before week end, 3-day grace period" },
  monthly: { openDaysBefore: 5, closeDaysAfter: 5, allowGracePeriod: true, phaseDescription: "Opens 5 days before month end (e.g. Day 25), 5-day grace period (Day 35)" },
  quarterly: { openDaysBefore: 15, closeDaysAfter: 15, allowGracePeriod: true, phaseDescription: "Opens 15 days before quarter end, 15-day grace period" },
  semi_annually: { openDaysBefore: 20, closeDaysAfter: 20, allowGracePeriod: true, phaseDescription: "Opens 20 days before semester end, 20-day grace period" },
  annually: { openDaysBefore: 30, closeDaysAfter: 30, allowGracePeriod: true, phaseDescription: "Opens 30 days before fiscal year end, 30-day grace period" },
};

export function NationalPeriodConfigTab() {
  const { data: configs = [], isLoading } = useGetPeriodConfigsQuery();
  const [updateConfig, { isLoading: isUpdating }] = useUpdatePeriodConfigsMutation();

  const [activeFrequency, setActiveFrequency] = useState<string>("monthly");
  const [editedDivisions, setEditedDivisions] = useState<Record<string, PeriodDivisionConfig[]>>({});
  const [phaseSettings, setPhaseSettings] = useState<Record<string, FrequencyPhaseState>>({});

  // Sync loaded configs into local editing state
  useEffect(() => {
    if (configs && configs.length > 0) {
      const stateMap: Record<string, PeriodDivisionConfig[]> = {};
      const phaseMap: Record<string, FrequencyPhaseState> = {};
      configs.forEach((c) => {
        stateMap[c.frequency] = JSON.parse(JSON.stringify(c.divisions || []));
        const def = DEFAULT_PHASE_RULES[c.frequency] || { openDaysBefore: 5, closeDaysAfter: 5, allowGracePeriod: true, phaseDescription: "" };
        phaseMap[c.frequency] = {
          openDaysBefore: c.reporting_phase_open_days_before !== undefined && c.reporting_phase_open_days_before !== null ? c.reporting_phase_open_days_before : def.openDaysBefore,
          closeDaysAfter: c.reporting_phase_close_days_after !== undefined && c.reporting_phase_close_days_after !== null ? c.reporting_phase_close_days_after : def.closeDaysAfter,
          allowGracePeriod: c.allow_grace_period !== undefined && c.allow_grace_period !== null ? c.allow_grace_period : def.allowGracePeriod,
          phaseDescription: c.phase_description || def.phaseDescription,
        };
      });
      setEditedDivisions(stateMap);
      setPhaseSettings(phaseMap);
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

  const currentPhase: FrequencyPhaseState = useMemo(() => {
    const def = DEFAULT_PHASE_RULES[activeFrequency] || { openDaysBefore: 5, closeDaysAfter: 5, allowGracePeriod: true, phaseDescription: "" };
    return (
      phaseSettings[activeFrequency] || {
        openDaysBefore: currentConfig?.reporting_phase_open_days_before ?? def.openDaysBefore,
        closeDaysAfter: currentConfig?.reporting_phase_close_days_after ?? def.closeDaysAfter,
        allowGracePeriod: currentConfig?.allow_grace_period ?? def.allowGracePeriod,
        phaseDescription: currentConfig?.phase_description ?? def.phaseDescription,
      }
    );
  }, [phaseSettings, currentConfig, activeFrequency]);

  const updatePhaseField = <K extends keyof FrequencyPhaseState>(key: K, val: FrequencyPhaseState[K]) => {
    setPhaseSettings((prev) => ({
      ...prev,
      [activeFrequency]: {
        ...currentPhase,
        [key]: val,
      },
    }));
  };

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

  const applyResetPhaseToDefault = () => {
    const def = DEFAULT_PHASE_RULES[activeFrequency] || {
      openDaysBefore: 5,
      closeDaysAfter: 5,
      allowGracePeriod: true,
      phaseDescription: "",
    };
    setPhaseSettings((prev) => ({
      ...prev,
      [activeFrequency]: { ...def },
    }));
    toast.info(`Restored system default timeline rules for ${activeFrequency.replace(/_/g, " ")}. Click Save to persist.`);
  };

  const handleSave = async () => {
    try {
      await updateConfig({
        frequency: activeFrequency,
        divisions: currentDivisions,
        reporting_phase_open_days_before: Number(currentPhase.openDaysBefore),
        reporting_phase_close_days_after: Number(currentPhase.closeDaysAfter),
        allow_grace_period: Boolean(currentPhase.allowGracePeriod),
        phase_description: currentPhase.phaseDescription,
      }).unwrap();
      toast.success(
        `Period rules & names for ${activeFrequency.replace(/_/g, " ")} saved successfully`
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
    { id: "weekly", label: "Weekly", count: 52, desc: "52 Operating Weeks" },
    { id: "daily", label: "Daily", count: 365, desc: "Continuous Daily Records" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner / Explanation */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-emerald-500/5 via-slate-500/5 to-transparent">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CalendarRange className="h-4 w-4" />
              Federal Reporting Frequency &amp; Submission Timeline Matrix
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Configure Reporting Timelines &amp; Division Classification Names
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Configure default reporting phase windows (early window open days and grace period submission buffers) across all frequencies. All current and previously assigned periods across all regions follow this configured matrix unless an individual assignment has a custom override.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isUpdating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <Save className="h-3.5 w-3.5" />
            {isUpdating ? "Saving..." : "Save Frequency Configuration"}
          </Button>
        </CardContent>
      </Card>

      {/* Global Frequency Timeline Matrix Overview Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-2 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Sliders className="h-4 w-4 text-emerald-600" />
                <span>Global Frequency Reporting Matrix (All Frequencies)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Compare federal default baselines with current configured timelines. Click any frequency row to edit its timeline or division naming.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-[10px] border-emerald-300 font-mono self-start sm:self-auto">
              Auto-Applies to All Regional Assignments
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5">Frequency Cycle</th>
                  <th className="px-4 py-2.5">Divisions</th>
                  <th className="px-4 py-2.5">Standard Default Baseline</th>
                  <th className="px-4 py-2.5">Configured Opens (Early)</th>
                  <th className="px-4 py-2.5">Configured Grace Closes</th>
                  <th className="px-4 py-2.5">Total Window</th>
                  <th className="px-4 py-2.5">Matrix Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {frequenciesList.map((freq) => {
                  const def = DEFAULT_PHASE_RULES[freq.id] || { openDaysBefore: 5, closeDaysAfter: 5 };
                  const cfg = phaseSettings[freq.id] || { openDaysBefore: def.openDaysBefore, closeDaysAfter: def.closeDaysAfter };
                  const isCustomized =
                    cfg.openDaysBefore !== def.openDaysBefore ||
                    cfg.closeDaysAfter !== def.closeDaysAfter;
                  const isSelected = activeFrequency === freq.id;

                  return (
                    <tr
                      key={freq.id}
                      onClick={() => setActiveFrequency(freq.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 font-medium"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`} />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{freq.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {freq.count} {freq.count === 1 ? "Division" : "Divisions"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">
                        {def.openDaysBefore}d before / {def.closeDaysAfter}d after
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {cfg.openDaysBefore} days before
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {cfg.closeDaysAfter} days after
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(cfg.openDaysBefore) + Number(cfg.closeDaysAfter)} days total
                      </td>
                      <td className="px-4 py-2.5">
                        {isCustomized ? (
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-mono">
                            Customized Matrix
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/50 text-[10px] font-mono">
                            Standard Default
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`h-6 text-[10px] px-2 ${isSelected ? "bg-emerald-600 text-white" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFrequency(freq.id);
                          }}
                        >
                          {isSelected ? "Editing" : "Configure"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Frequency Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {frequenciesList.map((freq) => {
          const isActive = activeFrequency === freq.id;
          return (
            <button
              key={freq.id}
              type="button"
              onClick={() => setActiveFrequency(freq.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
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
                  className={`text-[9px] px-1.5 py-0 ${
                    isActive ? "bg-emerald-600 text-white" : ""
                  }`}
                >
                  {freq.count}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                {freq.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Reporting Phase Submission Window Rules Card */}
      <Card className="border border-emerald-200 dark:border-emerald-900/60 shadow-sm bg-gradient-to-br from-emerald-50/40 via-white to-slate-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950">
        <CardHeader className="p-4 pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>Reporting Phase &amp; Submission Window Rules ({activeFrequency.replace(/_/g, " ").toUpperCase()})</span>
                </CardTitle>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-[10px] border-emerald-300 font-mono">
                  Active Baseline Rule
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Standard System Default for {activeFrequency.replace(/_/g, " ")}:{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {DEFAULT_PHASE_RULES[activeFrequency]?.openDaysBefore ?? 5} days before period end
                </strong>{" "}
                (window opens),{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {DEFAULT_PHASE_RULES[activeFrequency]?.closeDaysAfter ?? 5} days after period end
                </strong>{" "}
                (grace deadline).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyResetPhaseToDefault}
                className="h-8 text-xs border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to Standard Defaults
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isUpdating}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {isUpdating ? "Saving..." : "Save Timeline"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Window Opens (Days Before Period End)</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={currentPhase.openDaysBefore}
                  onChange={(e) => updatePhaseField("openDaysBefore", Number(e.target.value))}
                  className="h-8 text-xs font-mono font-bold pr-14"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                  days before
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                E.g. In monthly reporting, <strong>5 days</strong> opens submission on Day 25.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5 text-amber-600" />
                <span>Grace Period (Days After Period End)</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={currentPhase.closeDaysAfter}
                  onChange={(e) => updatePhaseField("closeDaysAfter", Number(e.target.value))}
                  className="h-8 text-xs font-mono font-bold pr-14"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                  days after
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                E.g. In monthly reporting, <strong>5 days</strong> closes submission on Day 35.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-600" />
                <span>Phase Description / Operational Note</span>
              </Label>
              <Input
                type="text"
                value={currentPhase.phaseDescription}
                onChange={(e) => updatePhaseField("phaseDescription", e.target.value)}
                placeholder="e.g. 5 days early window + 5 days grace submission"
                className="h-8 text-xs font-medium"
              />
              <p className="text-[10px] text-slate-500">
                Descriptive explanation displayed to regional officers.
              </p>
            </div>
          </div>

          {/* Interactive Visual Timeline Diagram */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold flex items-center gap-1.5 text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Reporting Phase Timeline Model (Standard Cycle: Day 1 ~ Day 30)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Total Reporting Window: {currentPhase.openDaysBefore + currentPhase.closeDaysAfter} Days
              </span>
            </div>

            {/* Timeline Bar */}
            <div className="grid grid-cols-12 gap-1 text-[10px] font-mono text-center select-none pt-1">
              {/* Operating / Upcoming */}
              <div className="col-span-6 bg-slate-800 border border-slate-700 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-[9px] mb-1">
                  <span>Day 1</span>
                  <span>Day {30 - currentPhase.openDaysBefore}</span>
                </div>
                <div className="font-semibold text-slate-300 text-xs truncate">
                  Operating Activity
                </div>
                <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Locked (Upcoming Phase)
                </div>
              </div>

              {/* Active Pre-Deadline Window */}
              <div className="col-span-3 bg-emerald-950/80 border border-emerald-600/70 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-400 text-[9px] mb-1">
                  <span>Day {30 - currentPhase.openDaysBefore}</span>
                  <span>Day 30</span>
                </div>
                <div className="font-bold text-emerald-300 text-xs truncate">
                  Phase Open ({currentPhase.openDaysBefore}d)
                </div>
                <div className="text-[9px] text-emerald-300 mt-1 flex items-center justify-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Submission
                </div>
              </div>

              {/* Grace Period */}
              <div className="col-span-3 bg-amber-950/80 border border-amber-600/70 rounded-lg p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-400 text-[9px] mb-1">
                  <span>Day 31</span>
                  <span>+{currentPhase.closeDaysAfter}d (Day {30 + currentPhase.closeDaysAfter})</span>
                </div>
                <div className="font-bold text-amber-300 text-xs truncate">
                  Grace Period ({currentPhase.closeDaysAfter}d)
                </div>
                <div className="text-[9px] text-amber-300 mt-1 flex items-center justify-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Grace Open
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-emerald-400" />
                Day {30 + currentPhase.closeDaysAfter + 1}+:
                <strong className="text-red-400 ml-1">Period Closed &amp; Locked</strong> (Requires Administrative Unlock Override)
              </span>
              <span className="text-emerald-400 font-semibold">
                Baseline Active for all {activeFrequency} assignments without custom overrides
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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

