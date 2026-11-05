"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanNodeHierarchy, PlanNode, PlanRule, AnnualTargetAllocation, PeriodTargetAllocation } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
    formatNodeTarget,
    getStepLabel,
    stepRequiresWeight,
    stepRequiresContributionWeight,
    childLevelRequiresContribution,
    getStepColorHex,
    getPlanStepSurfaceStyles,
} from "@/utils/planRuleUtils";
import { resolveLiveDraftTarget } from "@/utils/planDraftUtils";
import { getHierarchyNumber } from "@/utils/planNodeOrderUtils";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeHierarchyNumber } from "./PlanNodeHierarchyNumber";
import { PlanNodeAssignmentSummary } from "./PlanNodeAssignmentSummary";
import { PlanNodeAnnualTargetSection } from "./PlanNodeAnnualTargetSection";
import { PlanNodePeriodTargetSection } from "./PlanNodePeriodTargetSection";
import { PlanNodePeriodActualSection } from "./PlanNodePeriodActualSection";
import { PlanNodeAnnualActualSection } from "./PlanNodeAnnualActualSection";
import { PlanNodeActions } from "./PlanNodeActions";
import { useEffectivePlanningConfiguration } from "@/hooks/useEffectivePlanningConfiguration";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
    hiddenProgressAppearance,
    resolveCompletionForPlanNode,
} from "@/utils/performanceColorUtils";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { PerformanceProgressBar } from "./PerformanceProgressBar";
import { EvaluationStatusBadge } from "./EvaluationStatusBadge";
import { PlanNodeContributionBadge } from "./PlanNodeContributionBadge";
import { ContributionAllocationSummary } from "./ContributionAllocationSummary";
import { RollupProgressTooltip } from "./RollupProgressTooltip";

interface NodeItemProps {
    node: PlanNodeHierarchy;
    level: number;
    siblings: PlanNodeHierarchy[];
    siblingIndex: number;
    hierarchyNumberMap: Map<string, string>;
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown?: (node: PlanNodeHierarchy) => void;
    onMoveNode?: (nodeId: string, direction: "up" | "down", siblings: PlanNode[]) => void;
    isReordering?: boolean;
    readOnly?: boolean;
    dangerMode?: boolean;
    showRaiseIssue?: boolean;
    configuredUnits?: TargetUnit[];
    hideAssignments?: boolean;
    showAnnualTargets?: boolean;
    showPeriodTargets?: boolean;
    showPeriodActuals?: boolean;
    showAnnualActuals?: boolean;
    canEditPeriodActual?: boolean;
    canEditAnnualActual?: boolean;
    useExecutionCompletion?: boolean;
    processStarted?: boolean;
    periodHasRecordedActuals?: boolean;
    canEditAnnualTarget?: boolean;
    canEditPeriodTarget?: boolean;
    annualTargetAllocations?: Record<string, AnnualTargetAllocation>;
    periodTargetAllocations?: Record<string, PeriodTargetAllocation>;
    onSaveAnnualTarget?: (node: PlanNode, val: number | null) => Promise<void>;
    onSavePeriodTarget?: (node: PlanNode, val: number | null) => Promise<void>;
    canEditContribution?: boolean;
    onDistributeContributionEqually?: (parent: PlanNode, children: PlanNode[]) => void;
    isDistributingContribution?: boolean;
    renderPeriodActualSection?: (node: PlanNode, options?: { variant?: "card" | "compact" | "table" }) => React.ReactNode;
}

const NodeItem = ({
    node,
    level,
    siblings,
    siblingIndex,
    hierarchyNumberMap,
    rule,
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
    configuredUnits,
    hideAssignments = false,
    showAnnualTargets = false,
    showPeriodTargets = false,
    showPeriodActuals = false,
    showAnnualActuals = false,
    canEditPeriodActual = false,
    canEditAnnualActual = false,
    useExecutionCompletion = false,
    processStarted = false,
    periodHasRecordedActuals = false,
    canEditAnnualTarget = false,
    canEditPeriodTarget = false,
    annualTargetAllocations,
    periodTargetAllocations,
    onSaveAnnualTarget,
    onSavePeriodTarget,
    canEditContribution = false,
    onDistributeContributionEqually,
    isDistributingContribution = false,
    renderPeriodActualSection,
}: NodeItemProps) => {
    const thresholds = usePerformanceColorThresholds();
    const hierarchyNumber = getHierarchyNumber(hierarchyNumberMap, node.plan_node_id);
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const levelLabel = getStepLabel(rule, node.level);
    const nodeWeightMode = node.weight_mode;
    const allocation = annualTargetAllocations?.[node.plan_node_id];
    const liveDraftTarget = resolveLiveDraftTarget(node, allocation);
    const sortedChildren = useMemo(() => node.children ?? [], [node.children]);
    const stepSurface = getPlanStepSurfaceStyles(getStepColorHex(rule, node.level));
    const completion = useExecutionCompletion
        ? resolveCompletionForPlanNode(
              thresholds,
              node,
              processStarted,
              periodHasRecordedActuals
          )
        : hiddenProgressAppearance();

    return (
        <div className="space-y-2">
            <div
                className="flex items-center group p-3 rounded-xl border border-gray-100/90 hover:brightness-[0.99] transition-all duration-200"
                style={{ marginLeft: `${level * 24}px`, ...stepSurface }}
            >
                <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{
                        backgroundColor: completion.visible ? completion.color : "#E5E7EB",
                    }}
                />
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 ${!hasChildren && "invisible"}`}
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-primary/10 transition-colors shrink-0">
                        <PlanNodeIcon type={node.type} />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {hierarchyNumber && (
                                <PlanNodeHierarchyNumber value={hierarchyNumber} size="sm" />
                            )}
                            <button
                                type="button"
                                onClick={() => onDrillDown?.(node)}
                                className={`font-semibold text-gray-900 text-left truncate ${onDrillDown && hasChildren ? "hover:text-primary cursor-pointer" : "cursor-default"}`}
                                title={hasChildren ? "Open this level" : undefined}
                            >
                                {node.title}
                            </button>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 shrink-0">
                                {levelLabel}
                            </Badge>
                            {stepRequiresWeight(rule, node.level) && liveDraftTarget > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100 shrink-0"
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
                            {stepRequiresContributionWeight(rule, node.level) && (
                                <PlanNodeContributionBadge
                                    contributionWeight={node.contribution_weight}
                                    missing={!node.contribution_weight || node.contribution_weight <= 0}
                                />
                            )}
                            {hasChildren && onDrillDown && (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                                    {node.children.length} child{node.children.length !== 1 ? "ren" : ""}
                                </Badge>
                            )}
                            {completion.visible && (
                                <RollupProgressTooltip
                                    rule={rule}
                                    node={node}
                                    childrenNodes={sortedChildren}
                                    enabled={useExecutionCompletion && hasChildren}
                                >
                                    <PerformanceColorBadge
                                        color={completion.color}
                                        label={`${completion.percent}%`}
                                        className="text-[10px] py-0 h-4"
                                    />
                                </RollupProgressTooltip>
                            )}
                            {useExecutionCompletion && node.evaluation_status && (
                                <EvaluationStatusBadge
                                    status={node.evaluation_status}
                                    className="text-[10px] py-0 h-4"
                                />
                            )}
                        </div>
                        {completion.visible && (
                            <PerformanceProgressBar
                                value={completion.percent}
                                color={completion.color}
                                className="h-1.5 mt-2"
                            />
                        )}
                        {node.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{node.description}</p>
                        )}
                        {childLevelRequiresContribution(rule, sortedChildren) && (
                            <ContributionAllocationSummary
                                children={sortedChildren}
                                variant="compact"
                                canDistribute={canEditContribution}
                                isDistributing={isDistributingContribution}
                                onDistributeEqually={
                                    onDistributeContributionEqually
                                        ? () => onDistributeContributionEqually(node, sortedChildren)
                                        : undefined
                                }
                            />
                        )}
                        {showAnnualTargets && (
                            <PlanNodeAnnualTargetSection
                                node={node}
                                rule={rule}
                                configuredUnits={configuredUnits}
                                allocation={annualTargetAllocations?.[node.plan_node_id]}
                                canEdit={canEditAnnualTarget}
                                showRaiseIssue={showRaiseIssue}
                                onSaveTarget={onSaveAnnualTarget ? (val) => onSaveAnnualTarget(node, val) : undefined}
                                variant="compact"
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
                                onSaveTarget={onSavePeriodTarget ? (val) => onSavePeriodTarget(node, val) : undefined}
                                variant="compact"
                            />
                        )}
                        {showPeriodActuals && (
                            renderPeriodActualSection ? (
                                renderPeriodActualSection(node, { variant: "compact" })
                            ) : (
                                <PlanNodePeriodActualSection
                                    node={node}
                                    rule={rule}
                                    configuredUnits={configuredUnits}
                                    canEdit={canEditPeriodActual}
                                    variant="compact"
                                />
                            )
                        )}
                        {showAnnualActuals && (
                            <PlanNodeAnnualActualSection
                                node={node}
                                rule={rule}
                                configuredUnits={configuredUnits}
                                canEdit={canEditAnnualActual}
                                variant="compact"
                            />
                        )}
                        {!hideAssignments && <PlanNodeAssignmentSummary node={node} />}
                    </div>
                </div>

                <PlanNodeActions
                    node={node}
                    rule={rule}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    canMoveUp={!readOnly && !!onMoveNode && siblingIndex > 0}
                    canMoveDown={
                        !readOnly &&
                        !!onMoveNode &&
                        siblingIndex < siblings.length - 1
                    }
                    onMoveUp={
                        onMoveNode
                            ? () => onMoveNode(node.plan_node_id, "up", siblings)
                            : undefined
                    }
                    onMoveDown={
                        onMoveNode
                            ? () => onMoveNode(node.plan_node_id, "down", siblings)
                            : undefined
                    }
                    isReordering={isReordering}
                    readOnly={readOnly}
                    dangerMode={dangerMode}
                    showRaiseIssue={showRaiseIssue}
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
            </div>

            {isExpanded && hasChildren && (
                <div className="space-y-2">
                    {sortedChildren.map((child, childIndex) => (
                        <NodeItem
                            key={child.plan_node_id}
                            node={child}
                            level={level + 1}
                            siblings={sortedChildren}
                            siblingIndex={childIndex}
                            hierarchyNumberMap={hierarchyNumberMap}
                            rule={rule}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onViewDetails={onViewDetails}
                            onDrillDown={onDrillDown}
                            onMoveNode={onMoveNode}
                            isReordering={isReordering}
                            readOnly={readOnly}
                            dangerMode={dangerMode}
                            showRaiseIssue={showRaiseIssue}
                            configuredUnits={configuredUnits}
                            hideAssignments={hideAssignments}
                            showAnnualTargets={showAnnualTargets}
                            showPeriodTargets={showPeriodTargets}
                            showPeriodActuals={showPeriodActuals}
                            showAnnualActuals={showAnnualActuals}
                            canEditPeriodActual={canEditPeriodActual}
                            canEditAnnualActual={canEditAnnualActual}
                            useExecutionCompletion={useExecutionCompletion}
                            processStarted={processStarted}
                            periodHasRecordedActuals={periodHasRecordedActuals}
                            canEditAnnualTarget={canEditAnnualTarget}
                            canEditPeriodTarget={canEditPeriodTarget}
                            annualTargetAllocations={annualTargetAllocations}
                            periodTargetAllocations={periodTargetAllocations}
                            onSaveAnnualTarget={onSaveAnnualTarget}
                            onSavePeriodTarget={onSavePeriodTarget}
                            canEditContribution={canEditContribution}
                            onDistributeContributionEqually={onDistributeContributionEqually}
                            isDistributingContribution={isDistributingContribution}
                            renderPeriodActualSection={renderPeriodActualSection}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface PlanHierarchyTreeProps {
    nodes: PlanNodeHierarchy[];
    hierarchyNumberMap: Map<string, string>;
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown?: (node: PlanNodeHierarchy) => void;
    onMoveNode?: (nodeId: string, direction: "up" | "down", siblings: PlanNode[]) => void;
    isReordering?: boolean;
    /** When true, only render direct nodes without expanding nested children inline */
    scoped?: boolean;
    readOnly?: boolean;
    dangerMode?: boolean;
    showRaiseIssue?: boolean;
    hideAssignments?: boolean;
    showAnnualTargets?: boolean;
    showPeriodTargets?: boolean;
    showPeriodActuals?: boolean;
    showAnnualActuals?: boolean;
    canEditPeriodActual?: boolean;
    canEditAnnualActual?: boolean;
    useExecutionCompletion?: boolean;
    processStarted?: boolean;
    periodHasRecordedActuals?: boolean;
    canEditAnnualTarget?: boolean;
    canEditPeriodTarget?: boolean;
    annualTargetAllocations?: Record<string, AnnualTargetAllocation>;
    periodTargetAllocations?: Record<string, PeriodTargetAllocation>;
    onSaveAnnualTarget?: (node: PlanNode, val: number | null) => Promise<void>;
    onSavePeriodTarget?: (node: PlanNode, val: number | null) => Promise<void>;
    governmentStructureId?: string;
    canEditContribution?: boolean;
    onDistributeContributionEqually?: (parent: PlanNode, children: PlanNode[]) => void;
    isDistributingContribution?: boolean;
    configuredUnits?: TargetUnit[];
    renderPeriodActualSection?: (node: PlanNode, options?: { variant?: "card" | "compact" | "table" }) => React.ReactNode;
}

export function PlanHierarchyTree({
    nodes,
    hierarchyNumberMap,
    rule,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onDrillDown,
    onMoveNode,
    isReordering = false,
    scoped = false,
    readOnly = false,
    dangerMode = false,
    showRaiseIssue = false,
    hideAssignments = false,
    showAnnualTargets = false,
    showPeriodTargets = false,
    showPeriodActuals = false,
    showAnnualActuals = false,
    canEditPeriodActual = false,
    canEditAnnualActual = false,
    useExecutionCompletion = false,
    processStarted = false,
    periodHasRecordedActuals = false,
    canEditAnnualTarget = false,
    canEditPeriodTarget = false,
    annualTargetAllocations,
    periodTargetAllocations,
    onSaveAnnualTarget,
    onSavePeriodTarget,
    governmentStructureId,
    canEditContribution = false,
    onDistributeContributionEqually,
    isDistributingContribution = false,
    configuredUnits: propsConfiguredUnits,
    renderPeriodActualSection,
}: PlanHierarchyTreeProps) {
    const { config: planningConfig } = useEffectivePlanningConfiguration({
        governmentStructureId,
        skip: !governmentStructureId || Boolean(propsConfiguredUnits),
    });
    const configuredUnits = propsConfiguredUnits ?? (governmentStructureId ? planningConfig?.target_units : undefined);
    const sortedNodes = useMemo(() => nodes, [nodes]);

    if (scoped) {
        return (
            <div className="space-y-2">
                {sortedNodes.map((node, index) => (
                    <NodeItem
                        key={node.plan_node_id}
                        node={{ ...node, children: [] }}
                        level={0}
                        siblings={sortedNodes}
                        siblingIndex={index}
                        hierarchyNumberMap={hierarchyNumberMap}
                        rule={rule}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        onDrillDown={onDrillDown}
                        onMoveNode={onMoveNode}
                        isReordering={isReordering}
                        readOnly={readOnly}
                        dangerMode={dangerMode}
                        showRaiseIssue={showRaiseIssue}
                        configuredUnits={configuredUnits}
                        hideAssignments={hideAssignments}
                        showAnnualTargets={showAnnualTargets}
                        showPeriodTargets={showPeriodTargets}
                            showPeriodActuals={showPeriodActuals}
                            showAnnualActuals={showAnnualActuals}
                            canEditPeriodActual={canEditPeriodActual}
                            canEditAnnualActual={canEditAnnualActual}
                        useExecutionCompletion={useExecutionCompletion}
                        processStarted={processStarted}
                        periodHasRecordedActuals={periodHasRecordedActuals}
                        canEditAnnualTarget={canEditAnnualTarget}
                        canEditPeriodTarget={canEditPeriodTarget}
                        annualTargetAllocations={annualTargetAllocations}
                        periodTargetAllocations={periodTargetAllocations}
                        canEditContribution={canEditContribution}
                        onDistributeContributionEqually={onDistributeContributionEqually}
                        isDistributingContribution={isDistributingContribution}
                        renderPeriodActualSection={renderPeriodActualSection}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {sortedNodes.map((node, index) => (
                <NodeItem
                    key={node.plan_node_id}
                    node={node}
                    level={0}
                    siblings={sortedNodes}
                    siblingIndex={index}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    onDrillDown={onDrillDown}
                    onMoveNode={onMoveNode}
                    isReordering={isReordering}
                    readOnly={readOnly}
                    dangerMode={dangerMode}
                    showRaiseIssue={showRaiseIssue}
                    configuredUnits={configuredUnits}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    showPeriodTargets={showPeriodTargets}
                    showPeriodActuals={showPeriodActuals}
                    showAnnualActuals={showAnnualActuals}
                    canEditPeriodActual={canEditPeriodActual}
                    canEditAnnualActual={canEditAnnualActual}
                    useExecutionCompletion={useExecutionCompletion}
                    processStarted={processStarted}
                    periodHasRecordedActuals={periodHasRecordedActuals}
                    canEditAnnualTarget={canEditAnnualTarget}
                    canEditPeriodTarget={canEditPeriodTarget}
                    annualTargetAllocations={annualTargetAllocations}
                    periodTargetAllocations={periodTargetAllocations}
                    onSaveAnnualTarget={onSaveAnnualTarget}
                    onSavePeriodTarget={onSavePeriodTarget}
                    canEditContribution={canEditContribution}
                    onDistributeContributionEqually={onDistributeContributionEqually}
                    isDistributingContribution={isDistributingContribution}
                    renderPeriodActualSection={renderPeriodActualSection}
                />
            ))}
        </div>
    );
}
