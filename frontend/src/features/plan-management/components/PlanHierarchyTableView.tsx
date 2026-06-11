"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PlanNode, PlanNodeHierarchy, PlanRule, AnnualTargetAllocation, PeriodTargetAllocation } from "@/redux/types/plan";
import {
    formatNodeTarget,
    getStepLabel,
    stepRequiresWeight,
    getStepColorHex,
    getPlanStepSurfaceStyles,
} from "@/utils/planRuleUtils";
import { resolveCompletionForEntity } from "@/utils/performanceColorUtils";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import { getHierarchyNumber, sortPlanNodes } from "@/utils/planNodeOrderUtils";
import { flattenPlanSubtree } from "@/utils/planHierarchyTableUtils";
import { PlanNodeActions } from "./PlanNodeActions";
import { PerformanceColorBadge } from "./PerformanceColorBadge";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeHierarchyNumber } from "./PlanNodeHierarchyNumber";
import { PlanNodeAssignmentSummary } from "./PlanNodeAssignmentSummary";
import { PlanNodeAnnualTargetSection } from "./PlanNodeAnnualTargetSection";
import { PlanNodePeriodTargetSection } from "./PlanNodePeriodTargetSection";
import { cn } from "@/lib/utils";
import { getPlanReferenceTargetColumnLabel } from "@/utils/planDraftUtils";

interface PlanHierarchyTableViewProps {
    roots: PlanNodeHierarchy[];
    hierarchyNumberMap: Map<string, string>;
    rule?: PlanRule | null;
    rootLabel: string;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onMoveNode?: (nodeId: string, direction: "up" | "down", siblings: PlanNode[]) => void;
    isReordering?: boolean;
    readOnly?: boolean;
    hideAssignments?: boolean;
    showAnnualTargets?: boolean;
    showPeriodTargets?: boolean;
    canEditAnnualTarget?: boolean;
    canEditPeriodTarget?: boolean;
    annualTargetAllocations?: Record<string, AnnualTargetAllocation>;
    periodTargetAllocations?: Record<string, PeriodTargetAllocation>;
}

interface StrategicFocusTableProps {
    root: PlanNodeHierarchy;
    rootSiblings: PlanNodeHierarchy[];
    rootSiblingIndex: number;
    hierarchyNumberMap: Map<string, string>;
    rule?: PlanRule | null;
    rootLabel: string;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onMoveNode?: (nodeId: string, direction: "up" | "down", siblings: PlanNode[]) => void;
    isReordering?: boolean;
    readOnly?: boolean;
    defaultOpen?: boolean;
    hideAssignments?: boolean;
    showAnnualTargets?: boolean;
    showPeriodTargets?: boolean;
    canEditAnnualTarget?: boolean;
    canEditPeriodTarget?: boolean;
    annualTargetAllocations?: Record<string, AnnualTargetAllocation>;
    periodTargetAllocations?: Record<string, PeriodTargetAllocation>;
}

function StrategicFocusTable({
    root,
    rootSiblings,
    rootSiblingIndex,
    hierarchyNumberMap,
    rule,
    rootLabel,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onMoveNode,
    isReordering = false,
    readOnly = false,
    defaultOpen = false,
    hideAssignments = false,
    showAnnualTargets = false,
    showPeriodTargets = false,
    canEditAnnualTarget = false,
    canEditPeriodTarget = false,
    annualTargetAllocations,
    periodTargetAllocations,
}: StrategicFocusTableProps) {
    const { data: planningConfig } = useGetPlanningConfigurationQuery();
    const configuredUnits = planningConfig?.target_units;
    const thresholds = usePerformanceColorThresholds();

    const rows = useMemo(() => flattenPlanSubtree(root), [root]);
    const nodeCount = rows.length;
    const rootCompletion = resolveCompletionForEntity(thresholds, root.plan_node_id);
    const levelLabel = getStepLabel(rule, root.level);
    const rootNumber = getHierarchyNumber(hierarchyNumberMap, root.plan_node_id);
    const rootSurface = getPlanStepSurfaceStyles(getStepColorHex(rule, root.level));

    return (
        <Collapsible
            defaultOpen={defaultOpen}
            className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
            <CollapsibleTrigger
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:brightness-[0.99] transition-colors [&[data-state=open]>svg.chevron]:rotate-90"
                style={rootSurface}
            >
                <ChevronRight className="chevron h-4 w-4 shrink-0 text-gray-400 transition-transform" />
                <div
                    className="h-8 w-1 rounded-full shrink-0"
                    style={{ backgroundColor: rootCompletion.color }}
                />
                <div className="p-1.5 rounded-lg bg-gray-50 shrink-0">
                    <PlanNodeIcon type={root.type} className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {rootNumber && (
                            <PlanNodeHierarchyNumber value={rootNumber} size="md" />
                        )}
                        <span className="font-semibold text-gray-900 truncate">{root.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                            {levelLabel || rootLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                            {nodeCount} item{nodeCount !== 1 ? "s" : ""}
                        </Badge>
                        {root.weight > 0 && !showPeriodTargets && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100"
                            >
                                Draft Target:{" "}
                                {formatNodeTarget(
                                    root.weight,
                                    root.weight_mode,
                                    root.target_unit,
                                    configuredUnits
                                )}
                            </Badge>
                        )}
                        {showPeriodTargets && (root.annual_target ?? 0) > 0 && (
                            <Badge
                                variant="secondary"
                                className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100"
                            >
                                Annual Target:{" "}
                                {formatNodeTarget(
                                    root.annual_target ?? 0,
                                    root.weight_mode,
                                    root.target_unit,
                                    configuredUnits
                                )}
                            </Badge>
                        )}
                        <PerformanceColorBadge
                            color={rootCompletion.color}
                            label={rootCompletion.label}
                            className="text-[10px] py-0 h-4"
                        />
                    </div>
                    {root.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {root.description}
                        </p>
                    )}
                    {!hideAssignments && (
                        <PlanNodeAssignmentSummary node={root} className="mt-1" />
                    )}
                    {showAnnualTargets && (
                        <PlanNodeAnnualTargetSection
                            node={root}
                            rule={rule}
                            configuredUnits={configuredUnits}
                            allocation={annualTargetAllocations?.[root.plan_node_id]}
                            canEdit={canEditAnnualTarget}
                            variant="compact"
                            className="mt-2"
                        />
                    )}
                    {showPeriodTargets && (root.annual_target ?? 0) > 0 && (
                        <PlanNodePeriodTargetSection
                            node={root}
                            rule={rule}
                            configuredUnits={configuredUnits}
                            allocation={periodTargetAllocations?.[root.plan_node_id]}
                            canEdit={canEditPeriodTarget}
                            variant="compact"
                            className="mt-2"
                        />
                    )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <PlanNodeActions
                        node={root}
                        rule={rule}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        canMoveUp={!readOnly && !!onMoveNode && rootSiblingIndex > 0}
                        canMoveDown={
                            !readOnly &&
                            !!onMoveNode &&
                            rootSiblingIndex < rootSiblings.length - 1
                        }
                        onMoveUp={
                            onMoveNode
                                ? () => onMoveNode(root.plan_node_id, "up", rootSiblings)
                                : undefined
                        }
                        onMoveDown={
                            onMoveNode
                                ? () => onMoveNode(root.plan_node_id, "down", rootSiblings)
                                : undefined
                        }
                        isReordering={isReordering}
                        readOnly={readOnly}
                        size="sm"
                    />
                </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="border-t border-gray-100">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                                <TableHead className="w-[72px]">No.</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead className="min-w-[220px]">Title</TableHead>
                                <TableHead className="min-w-[140px]">
                                    {getPlanReferenceTargetColumnLabel(showPeriodTargets)}
                                </TableHead>
                                {showAnnualTargets && (
                                    <TableHead className="min-w-[180px]">Annual Target</TableHead>
                                )}
                                {showPeriodTargets && (
                                    <TableHead className="min-w-[180px]">Period Target</TableHead>
                                )}
                                <TableHead className="min-w-[120px]">Performance</TableHead>
                                {!hideAssignments && (
                                    <TableHead className="min-w-[160px]">Assigned to</TableHead>
                                )}
                                {!hideAssignments && (
                                    <TableHead className="w-[100px]">Mode</TableHead>
                                )}
                                <TableHead className="w-[180px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map(({ node, depth, siblings, siblingIndex }) => {
                                const rowLevelLabel = getStepLabel(rule, node.level);
                                const completion = resolveCompletionForEntity(
                                    thresholds,
                                    node.plan_node_id
                                );
                                const showReferenceTarget = showPeriodTargets
                                    ? stepRequiresWeight(rule, node.level) &&
                                      (node.annual_target ?? 0) > 0
                                    : stepRequiresWeight(rule, node.level) && node.weight > 0;
                                const rowNumber = getHierarchyNumber(
                                    hierarchyNumberMap,
                                    node.plan_node_id
                                );
                                const rowSurface = getPlanStepSurfaceStyles(
                                    getStepColorHex(rule, node.level)
                                );

                                return (
                                    <TableRow
                                        key={node.plan_node_id}
                                        style={rowSurface}
                                        className="border-b border-gray-100/80 hover:brightness-[0.99]"
                                    >
                                        <TableCell>
                                            {rowNumber ? (
                                                <PlanNodeHierarchyNumber
                                                    value={rowNumber}
                                                    size="sm"
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase font-bold py-0 h-5"
                                            >
                                                {rowLevelLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            <div
                                                className="flex items-start gap-2 min-w-0"
                                                style={{ paddingLeft: `${depth * 16}px` }}
                                            >
                                                <PlanNodeIcon
                                                    type={node.type}
                                                    className="h-4 w-4 shrink-0 mt-0.5 text-gray-500"
                                                />
                                                <div className="min-w-0">
                                                    <p
                                                        className={cn(
                                                            "font-medium text-gray-900",
                                                            depth === 0 && "text-primary font-semibold"
                                                        )}
                                                    >
                                                        {node.title}
                                                    </p>
                                                    {node.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                            {node.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            {showReferenceTarget ? (
                                                <span
                                                    className={cn(
                                                        "text-sm",
                                                        showPeriodTargets
                                                            ? "text-gray-900 font-medium"
                                                            : "text-gray-700"
                                                    )}
                                                >
                                                    {formatNodeTarget(
                                                        showPeriodTargets
                                                            ? (node.annual_target ?? 0)
                                                            : node.weight,
                                                        node.weight_mode,
                                                        node.target_unit,
                                                        configuredUnits
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        {showAnnualTargets && (
                                            <TableCell className="whitespace-normal">
                                                {stepRequiresWeight(rule, node.level) && node.weight > 0 ? (
                                                    <PlanNodeAnnualTargetSection
                                                        node={node}
                                                        rule={rule}
                                                        configuredUnits={configuredUnits}
                                                        allocation={annualTargetAllocations?.[node.plan_node_id]}
                                                        canEdit={canEditAnnualTarget}
                                                        variant="table"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        )}
                                        {showPeriodTargets && (
                                            <TableCell className="whitespace-normal">
                                                {(node.annual_target ?? 0) > 0 ? (
                                                    <PlanNodePeriodTargetSection
                                                        node={node}
                                                        rule={rule}
                                                        configuredUnits={configuredUnits}
                                                        allocation={periodTargetAllocations?.[node.plan_node_id]}
                                                        canEdit={canEditPeriodTarget}
                                                        variant="table"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-sm font-semibold tabular-nums"
                                                    style={{ color: completion.color }}
                                                >
                                                    {completion.percent}%
                                                </span>
                                                <PerformanceColorBadge
                                                    color={completion.color}
                                                    label={completion.label}
                                                    className="text-[10px] py-0 h-5"
                                                />
                                            </div>
                                        </TableCell>
                                        {!hideAssignments && (
                                            <TableCell className="whitespace-normal">
                                                <PlanNodeAssignmentSummary node={node} />
                                            </TableCell>
                                        )}
                                        {!hideAssignments && (
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] capitalize",
                                                        node.assignment_sharing_mode === "shared"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                                    )}
                                                >
                                                    {node.assignment_sharing_mode}
                                                </Badge>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <PlanNodeActions
                                                    node={node}
                                                    rule={rule}
                                                    onAddChild={onAddChild}
                                                    onEdit={onEdit}
                                                    onDelete={onDelete}
                                                    onViewDetails={onViewDetails}
                                                    canMoveUp={
                                                        !readOnly &&
                                                        !!onMoveNode &&
                                                        siblingIndex > 0
                                                    }
                                                    canMoveDown={
                                                        !readOnly &&
                                                        !!onMoveNode &&
                                                        siblingIndex < siblings.length - 1
                                                    }
                                                    onMoveUp={
                                                        onMoveNode
                                                            ? () =>
                                                                  onMoveNode(
                                                                      node.plan_node_id,
                                                                      "up",
                                                                      siblings
                                                                  )
                                                            : undefined
                                                    }
                                                    onMoveDown={
                                                        onMoveNode
                                                            ? () =>
                                                                  onMoveNode(
                                                                      node.plan_node_id,
                                                                      "down",
                                                                      siblings
                                                                  )
                                                            : undefined
                                                    }
                                                    isReordering={isReordering}
                                                    readOnly={readOnly}
                                                    size="sm"
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function PlanHierarchyTableView({
    roots,
    hierarchyNumberMap,
    rule,
    rootLabel,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onMoveNode,
    isReordering = false,
    readOnly = false,
    hideAssignments = false,
    showAnnualTargets = false,
    showPeriodTargets = false,
    canEditAnnualTarget = false,
    canEditPeriodTarget = false,
    annualTargetAllocations,
    periodTargetAllocations,
}: PlanHierarchyTableViewProps) {
    const sortedRoots = useMemo(() => sortPlanNodes(roots), [roots]);

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                One collapsible table per {rootLabel.toLowerCase()}. Expand a section to browse
                its full subtree.
            </p>
            {sortedRoots.map((root, index) => (
                <StrategicFocusTable
                    key={root.plan_node_id}
                    root={root}
                    rootSiblings={sortedRoots}
                    rootSiblingIndex={index}
                    hierarchyNumberMap={hierarchyNumberMap}
                    rule={rule}
                    rootLabel={rootLabel}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    onMoveNode={onMoveNode}
                    isReordering={isReordering}
                    readOnly={readOnly}
                    defaultOpen={index === 0}
                    hideAssignments={hideAssignments}
                    showAnnualTargets={showAnnualTargets}
                    showPeriodTargets={showPeriodTargets}
                    canEditAnnualTarget={canEditAnnualTarget}
                    canEditPeriodTarget={canEditPeriodTarget}
                    annualTargetAllocations={annualTargetAllocations}
                    periodTargetAllocations={periodTargetAllocations}
                />
            ))}
        </div>
    );
}
