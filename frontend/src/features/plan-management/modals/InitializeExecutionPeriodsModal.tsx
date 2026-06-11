"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { actionFeedback } from "@/components/action-feedback";
import { useInitializeExecutionPeriodsMutation } from "@/redux/api/planApi";
import { PeriodSubdivisionMode, PlanVersion } from "@/redux/types/plan";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";
import { cn } from "@/lib/utils";

interface InitializeExecutionPeriodsModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterVersion: PlanVersion;
    planningYears?: number[];
    onSuccess?: () => void;
}

const SUBDIVISION_OPTIONS: {
    value: PeriodSubdivisionMode;
    label: string;
    description: string;
}[] = [
    {
        value: "quarterly",
        label: "Quarterly",
        description: "Q1–Q4 for every annual year",
    },
    {
        value: "semi_annual",
        label: "Semi-annual",
        description: "Two halves for every annual year",
    },
    {
        value: "custom",
        label: "Custom",
        description: "Same custom labels for every annual year",
    },
];

export function InitializeExecutionPeriodsModal({
    isOpen,
    onClose,
    masterVersion,
    planningYears = [],
    onSuccess,
}: InitializeExecutionPeriodsModalProps) {
    const [mode, setMode] = useState<PeriodSubdivisionMode>("quarterly");
    const [customLabels, setCustomLabels] = useState("Period 1\nPeriod 2\nPeriod 3");
    const [initialize, { isLoading }] = useInitializeExecutionPeriodsMutation();

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
                id: masterVersion.plan_version_id,
                subdivision_mode: mode,
                custom_periods,
            }).unwrap();
            const yearCount = planningYears.length || "all";
            actionFeedback.success(
                `${result.executionPeriods?.length ?? 0} execution period(s) created across ${yearCount} annual year(s)`
            );
            onSuccess?.();
            onClose();
        } catch (error: unknown) {
            actionFeedback.error(getApiErrorMessage(error, "Failed to initialize execution periods"));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px] top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
                <DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Initialize Execution Periods</DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
                    <div className="space-y-4 pb-4 text-sm">
                        <p className="text-muted-foreground">
                            Choose one subdivision for the entire plan. The same period structure
                            will be created for every annual year
                            {planningYears.length > 0
                                ? ` (${planningYears.join(", ")})`
                                : ""}
                            . Initial period targets are split from each year&apos;s annual targets;
                            adjust them before finalizing.
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
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:bg-muted/50"
                                    )}
                                >
                                    <p className="font-medium text-gray-900">{option.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {option.description}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {mode === "custom" && (
                            <div className="space-y-2">
                                <Label htmlFor="custom-period-labels">Period labels (one per line)</Label>
                                <textarea
                                    id="custom-period-labels"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={customLabels}
                                    onChange={(e) => setCustomLabels(e.target.value)}
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
                                Initializing...
                            </>
                        ) : (
                            "Initialize for All Years"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
