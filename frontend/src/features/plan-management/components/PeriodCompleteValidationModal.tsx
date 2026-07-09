"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DIALOG_SCROLLABLE_CONTENT } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlanVersion } from "@/redux/types/plan";
import {
    buildPeriodCompleteValidationMessage,
    resolvePeriodCompleteBlockingSections,
    type PeriodCompleteBlockingSection,
} from "@/utils/planExecutionUtils";
import { PlanNodeHierarchyNumber } from "./PlanNodeHierarchyNumber";

interface PeriodCompleteValidationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    period: PlanVersion;
    periodLabel: string;
    plansBasePath: string;
    processStarted: boolean;
}

export function PeriodCompleteValidationModal({
    open,
    onOpenChange,
    period,
    periodLabel,
    plansBasePath,
    processStarted,
}: PeriodCompleteValidationModalProps) {
    const router = useRouter();
    const readiness = period.execution_actuals_readiness;
    const sections = useMemo(
        () => resolvePeriodCompleteBlockingSections(readiness),
        [readiness]
    );
    const [activeSectionKey, setActiveSectionKey] = useState<
        PeriodCompleteBlockingSection["key"] | null
    >(sections[0]?.key ?? null);

    const activeSection =
        sections.find((section) => section.key === activeSectionKey) ?? sections[0] ?? null;

    useEffect(() => {
        if (open) {
            setActiveSectionKey(sections[0]?.key ?? null);
        }
    }, [open, sections]);

    const periodVersionId =
        period.execution_snapshot_plan_version_id ?? period.plan_version_id;
    const planBaseUrl = `${plansBasePath}/${periodVersionId}`;

    const handleNavigateToNode = (nodeId: string) => {
        const isRealNodeId = /^[0-9a-f-]{36}$/i.test(nodeId);
        if (isRealNodeId) {
            router.push(`${planBaseUrl}/nodes/${nodeId}?focus=achievement`);
        } else {
            router.push(planBaseUrl);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(DIALOG_SCROLLABLE_CONTENT, "w-full max-w-lg sm:max-w-lg")}>
                <div className="h-1.5 w-full shrink-0 bg-amber-500" />

                <DialogHeader className="shrink-0 space-y-3 border-b px-6 py-4 text-left">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                            <DialogTitle className="text-lg leading-snug">
                                Cannot complete {periodLabel}
                            </DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed break-words">
                                {buildPeriodCompleteValidationMessage(readiness)}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
                    {sections.length > 0 && (
                        <div className="min-w-0 overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/40">
                            <div className="overflow-x-auto border-b border-amber-200/80 px-3 py-2">
                                <div className="flex min-w-max flex-wrap gap-2">
                                    {sections.map((section) => (
                                        <button
                                            key={section.key}
                                            type="button"
                                            onClick={() => setActiveSectionKey(section.key)}
                                            className={cn(
                                                "inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                                                activeSection?.key === section.key
                                                    ? "bg-white text-amber-950 shadow-sm"
                                                    : "text-amber-900/80 hover:bg-white/70"
                                            )}
                                        >
                                            {section.title}
                                            <Badge
                                                variant="secondary"
                                                className="h-4 px-1.5 text-[10px] bg-amber-100 text-amber-900 border-amber-200"
                                            >
                                                {section.nodes.length}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeSection && (
                                <div className="space-y-2 px-3 py-3">
                                    <p className="text-xs text-amber-900/80">
                                        {activeSection.description}
                                    </p>
                                    <div className="overflow-auto rounded-md border border-amber-200/70 bg-white">
                                        <ul className="min-w-max divide-y divide-amber-200/70">
                                            {activeSection.nodes.map((node) => (
                                                <li
                                                    key={`${activeSection.key}-${node.plan_node_id}`}
                                                    className="min-w-max"
                                                >
                                                    <button
                                                        type="button"
                                                        className="flex w-full min-w-max items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-amber-50/80 transition-colors"
                                                        onClick={() =>
                                                            handleNavigateToNode(node.plan_node_id)
                                                        }
                                                    >
                                                        {node.hierarchy_number && (
                                                            <PlanNodeHierarchyNumber
                                                                value={node.hierarchy_number}
                                                                size="sm"
                                                            />
                                                        )}
                                                        <span className="whitespace-nowrap font-medium text-gray-900">
                                                            {node.title}
                                                        </span>
                                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            router.push(planBaseUrl);
                            onOpenChange(false);
                        }}
                    >
                        {processStarted ? "Open execution plan" : "Open plan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
