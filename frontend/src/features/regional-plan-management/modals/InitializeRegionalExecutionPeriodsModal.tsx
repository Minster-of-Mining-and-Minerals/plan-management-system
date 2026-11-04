"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { useInitializeRegionalExecutionPeriodsMutation } from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

interface InitializeRegionalExecutionPeriodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVersion: RegionalPlanVersion;
  regionId: string;
  planningYears?: number[];
  onSuccess?: () => void;
}

type PeriodSubdivisionMode = "quarterly" | "semi_annual" | "monthly" | "custom";

const SUBDIVISION_OPTIONS: {
  value: PeriodSubdivisionMode;
  label: string;
  description: string;
}[] = [
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Q1–Q4 (4 periods) for every annual year",
  },
  {
    value: "semi_annual",
    label: "Semi-annual",
    description: "Two halves (2 periods) for every annual year",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Jan–Dec (12 months) for every annual year",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Same custom labels for every annual year",
  },
];

export function InitializeRegionalExecutionPeriodsModal({
  isOpen,
  onClose,
  masterVersion,
  regionId,
  planningYears = [],
  onSuccess,
}: InitializeRegionalExecutionPeriodsModalProps) {
  const [mode, setMode] = useState<PeriodSubdivisionMode>("quarterly");
  const [customLabels, setCustomLabels] = useState("Period 1\nPeriod 2\nPeriod 3");
  const [initialize, { isLoading }] = useInitializeRegionalExecutionPeriodsMutation();

  const handleInitialize = async () => {
    const custom_periods =
      mode === "custom"
        ? customLabels
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((label) => ({ label }))
        : undefined;

    if (mode === "custom" && (!custom_periods || custom_periods.length === 0)) {
      actionFeedback.error("Enter at least one custom period label");
      return;
    }

    try {
      const result = await initialize({
        id: masterVersion.regional_plan_version_id,
        region_id: regionId,
        subdivision_mode: mode,
        custom_periods,
      }).unwrap();
      const count = Array.isArray(result) ? result.length : (result as any)?.executionPeriods?.length ?? 0;
      const yearCount = planningYears.length || "all";
      actionFeedback.success(
        `${count} execution period(s) initialized across ${yearCount} annual year(s)`
      );
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      actionFeedback.error(getApiErrorMessage(error, "Failed to initialize execution periods"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "sm:max-w-[520px]")}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
          <DialogTitle>Initialize Execution Periods</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <div className="space-y-4 pb-4 text-sm">
            <p className="text-muted-foreground">
              Choose one subdivision cadence for the entire regional plan. The same period structure
              will be generated for every annual year
              {planningYears.length > 0 ? ` (${planningYears.join(", ")})` : ""}
              . Period targets are not pre-filled — open each year and distribute targets into periods before finalizing.
            </p>

            {planningYears.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {planningYears.map((year) => (
                  <Badge key={year} variant="outline">
                    {year}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {SUBDIVISION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    mode === option.value
                      ? "border-primary bg-primary/5 shadow-2xs"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </button>
              ))}
            </div>

            {mode === "custom" && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-semibold text-foreground">
                  Custom Period Labels (one per line)
                </label>
                <textarea
                  value={customLabels}
                  onChange={(e) => setCustomLabels(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="e.g. Trimester 1&#10;Trimester 2&#10;Trimester 3"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleInitialize} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Execution Periods"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

