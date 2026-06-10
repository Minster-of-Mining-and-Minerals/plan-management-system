"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanNodeHierarchy, PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
    formatNodeTarget,
    getStepLabel,
    stepRequiresWeight,
} from "@/utils/planRuleUtils";
import { getHierarchyNumber, sortPlanNodes } from "@/utils/planNodeOrderUtils";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeHierarchyNumber } from "./PlanNodeHierarchyNumber";
import { PlanNodeActions } from "./PlanNodeActions";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";

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
    configuredUnits?: TargetUnit[];
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
    configuredUnits,
}: NodeItemProps) => {
    const hierarchyNumber = getHierarchyNumber(hierarchyNumberMap, node.plan_node_id);
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const levelLabel = getStepLabel(rule, node.level);
    const nodeWeightMode = node.weight_mode;
    const sortedChildren = useMemo(
        () => sortPlanNodes(node.children ?? []),
        [node.children]
    );
    return (
        <div className="space-y-2">
            <div
                className="flex items-center group p-3 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                style={{ marginLeft: `${level * 24}px` }}
            >
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
                            {stepRequiresWeight(rule, node.level) && node.weight > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100 shrink-0"
                                >
                                    {formatNodeTarget(
                                        node.weight,
                                        nodeWeightMode,
                                        node.target_unit,
                                        configuredUnits
                                    )}
                                </Badge>
                            )}
                            {hasChildren && onDrillDown && (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                                    {node.children.length} child{node.children.length !== 1 ? "ren" : ""}
                                </Badge>
                            )}
                        </div>
                        {node.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{node.description}</p>
                        )}
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
                            configuredUnits={configuredUnits}
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
}: PlanHierarchyTreeProps) {
    const { data: planningConfig } = useGetPlanningConfigurationQuery();
    const configuredUnits = planningConfig?.target_units;
    const sortedNodes = useMemo(() => sortPlanNodes(nodes), [nodes]);

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
                        configuredUnits={configuredUnits}
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
                    configuredUnits={configuredUnits}
                />
            ))}
        </div>
    );
}
