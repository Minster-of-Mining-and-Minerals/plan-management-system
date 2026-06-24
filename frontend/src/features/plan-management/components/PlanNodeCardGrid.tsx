"use client";

import { useMemo } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlanNodeHierarchy, PlanNode, PlanRule, AnnualTargetAllocation, PeriodTargetAllocation } from "@/redux/types/plan";
import {
    formatNodeTarget,
    getStepLabel,
    stepRequiresWeight,
} from "@/utils/planRuleUtils";
import {
    resolveCompletionForEntity,
} from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { useEffectivePlanningConfiguration } from "@/hooks/useEffectivePlanningConfiguration";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeActions } from "./PlanNodeActions";
import { CircularProgress } from "./CircularProgress";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { getHierarchyNumber } from "@/utils/planNodeOrderUtils";
import { PlanNodeHierarchyNumber } from "./PlanNodeHierarchyNumber";
import { PlanNodeAssignmentSummary } from "./PlanNodeAssignmentSummary";
import { PlanNodeAnnualTargetSection } from "./PlanNodeAnnualTargetSection";
import { PlanNodePeriodTargetSection } from "./PlanNodePeriodTargetSection";
import { resolveLiveDraftTarget } from "@/utils/planDraftUtils";

interface PlanNodeCardGridProps {
    nodes: PlanNodeHierarchy[];
    hierarchyNumberMap: Map<string, string>;
    rule?: PlanRule | null;
    showDualTargets?: boolean;
    showAnnualTargets?: boolean;
    showPeriodTargets?: boolean;
    hideAssignments?: boolean;
    canEditAnnualTarget?: boolean;
    canEditPeriodTarget?: boolean;
    annualTargetAllocations?: Record<string, AnnualTargetAllocation>;
    periodTargetAllocations?: Record<string, PeriodTargetAllocation>;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown: (node: PlanNodeHierarchy) => void;
    onMoveNode?: (nodeId: string, direction: "up" | "down") => void;
    isReordering?: boolean;
    readOnly?: boolean;
    dangerMode?: boolean;
    showRaiseIssue?: boolean;
    governmentStructureId?: string;
}

export function PlanNodeCardGrid({
    nodes,
    hierarchyNumberMap,
    rule,
    showDualTargets = false,
    showAnnualTargets = false,
    showPeriodTargets = false,
    hideAssignments = false,
    canEditAnnualTarget = false,
    canEditPeriodTarget = false,
    annualTargetAllocations,
    periodTargetAllocations,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onDrillDown,
    onMoveNode,
    isReordering = false,
    readOnly = false,
    dangerMode = false,
    showRaiseIssue = false,
    governmentStructureId,
}: PlanNodeCardGridProps) {
    const { config: planningConfig } = useEffectivePlanningConfiguration({
        governmentStructureId,
        skip: !governmentStructureId,
    });
    const configuredUnits = planningConfig?.target_units;
    const thresholds = usePerformanceColorThresholds();

    const sortedNodes = useMemo(() => nodes, [nodes]);

    const completionMap = useMemo(() => {
        const map = new Map<
            string,
            { percent: number; color: string; label: string }
        >();
        for (const node of sortedNodes) {
            const completion = resolveCompletionForEntity(thresholds, node.plan_node_id);
            map.set(node.plan_node_id, completion);
        }
        return map;
    }, [sortedNodes, thresholds]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {sortedNodes.map((node, index) => {
                const hasChildren = node.children && node.children.length > 0;
                const levelLabel = getStepLabel(rule, node.level);
                const nodeWeightMode = node.weight_mode;
                const completion = completionMap.get(node.plan_node_id) ?? {
                    percent: 0,
                    color: "#6B7280",
                    label: "Unknown",
                };
                const requiresWeight = stepRequiresWeight(rule, node.level);
                const allocation = annualTargetAllocations?.[node.plan_node_id];
                const liveDraftTarget = resolveLiveDraftTarget(node, allocation);
                const hasDraftTarget = requiresWeight && liveDraftTarget > 0;

                return (
                    <Card
                        key={node.plan_node_id}
                        className={`group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] hover:border-primary/20 ${hasChildren ? "cursor-pointer" : ""}`}
                        onClick={() => {
                            if (hasChildren) onDrillDown(node);
                        }}
                    >
                        <div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{
                                background: `linear-gradient(90deg, ${completion.color}, ${completion.color}55)`,
                            }}
                        />
                        <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="p-2.5 rounded-xl bg-gray-50 group-hover:bg-primary/5 transition-colors">
                                            <PlanNodeIcon type={node.type} className="h-5 w-5" />
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <PlanNodeActions
                                                node={node}
                                                rule={rule}
                                                onAddChild={onAddChild}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onViewDetails={onViewDetails}
                                                canMoveUp={!readOnly && !!onMoveNode && index > 0}
                                                canMoveDown={
                                                    !readOnly &&
                                                    !!onMoveNode &&
                                                    index < sortedNodes.length - 1
                                                }
                                                onMoveUp={
                                                    onMoveNode
                                                        ? () => onMoveNode(node.plan_node_id, "up")
                                                        : undefined
                                                }
                                                onMoveDown={
                                                    onMoveNode
                                                        ? () => onMoveNode(node.plan_node_id, "down")
                                                        : undefined
                                                }
                                                isReordering={isReordering}
                                                readOnly={readOnly}
                                                dangerMode={dangerMode}
                                                showRaiseIssue={showRaiseIssue}
                                                size="sm"
                                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase font-bold py-0 h-4"
                                            >
                                                {levelLabel}
                                            </Badge>
                                            {!showDualTargets && hasDraftTarget && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100"
                                                >
                                                    Draft Target:{" "}
                                                    {formatNodeTarget(
                                                        liveDraftTarget,
                                                        nodeWeightMode,
                                                        node.target_unit,
                                                        configuredUnits
                                                    )}
                                                </Badge>
                                            )}
                                            <PerformanceColorBadge
                                                color={completion.color}
                                                label={completion.label}
                                                className="text-[10px] py-0 h-4"
                                            />
                                        </div>

                                        {showAnnualTargets && hasDraftTarget && (
                                            <PlanNodeAnnualTargetSection
                                                node={node}
                                                rule={rule}
                                                configuredUnits={configuredUnits}
                                                allocation={annualTargetAllocations?.[node.plan_node_id]}
                                                canEdit={canEditAnnualTarget}
                                                showRaiseIssue={showRaiseIssue}
                                                variant="card"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}

                                        {showPeriodTargets && (node.annual_target ?? 0) > 0 && (
                                            <PlanNodePeriodTargetSection
                                                node={node}
                                                rule={rule}
                                                configuredUnits={configuredUnits}
                                                allocation={periodTargetAllocations?.[node.plan_node_id]}
                                                canEdit={canEditPeriodTarget}
                                                showRaiseIssue={showRaiseIssue}
                                                variant="card"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}

                                        <h3 className="flex items-start gap-2 text-lg font-bold text-gray-900 leading-snug">
                                            {getHierarchyNumber(hierarchyNumberMap, node.plan_node_id) && (
                                                <PlanNodeHierarchyNumber
                                                    value={
                                                        getHierarchyNumber(
                                                            hierarchyNumberMap,
                                                            node.plan_node_id
                                                        )!
                                                    }
                                                    size="lg"
                                                    className="mt-0.5"
                                                />
                                            )}
                                            <span className="line-clamp-2 min-w-0">{node.title}</span>
                                        </h3>
                                        {node.description ? (
                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                {node.description}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">No description</p>
                                        )}
                                        {!hideAssignments && (
                                            <PlanNodeAssignmentSummary node={node} />
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        {hasChildren ? (
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                                                <Layers className="h-3.5 w-3.5" />
                                                {node.children.length} item
                                                {node.children.length !== 1 ? "s" : ""}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">No sub-items</span>
                                        )}
                                        {hasChildren && (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                                                Open
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="shrink-0 pt-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <CircularProgress
                                        value={completion.percent}
                                        color={completion.color}
                                        size={76}
                                        className="hidden sm:block"
                                    />
                                    <CircularProgress
                                        value={completion.percent}
                                        color={completion.color}
                                        size={64}
                                        className="sm:hidden"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
