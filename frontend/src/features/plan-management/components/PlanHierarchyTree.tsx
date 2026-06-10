"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlanNodeHierarchy, PlanNode, PlanRule } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import {
    formatNodeTarget,
    getStepLabel,
    stepRequiresWeight,
} from "@/utils/planRuleUtils";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeActions } from "./PlanNodeActions";
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";

interface NodeItemProps {
    node: PlanNodeHierarchy;
    level: number;
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown?: (node: PlanNodeHierarchy) => void;
    readOnly?: boolean;
    configuredUnits?: TargetUnit[];
}

const NodeItem = ({
    node,
    level,
    rule,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onDrillDown,
    readOnly = false,
    configuredUnits,
}: NodeItemProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const levelLabel = getStepLabel(rule, node.level);
    const nodeWeightMode = node.weight_mode;

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
                    readOnly={readOnly}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
            </div>

            {isExpanded && hasChildren && (
                <div className="space-y-2">
                    {node.children.map((child) => (
                        <NodeItem
                            key={child.plan_node_id}
                            node={child}
                            level={level + 1}
                            rule={rule}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onViewDetails={onViewDetails}
                            onDrillDown={onDrillDown}
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
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown?: (node: PlanNodeHierarchy) => void;
    /** When true, only render direct nodes without expanding nested children inline */
    scoped?: boolean;
    readOnly?: boolean;
}

export function PlanHierarchyTree({
    nodes,
    rule,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onDrillDown,
    scoped = false,
    readOnly = false,
}: PlanHierarchyTreeProps) {
    const { data: planningConfig } = useGetPlanningConfigurationQuery();
    const configuredUnits = planningConfig?.target_units;

    if (scoped) {
        return (
            <div className="space-y-2">
                {nodes.map((node) => (
                    <NodeItem
                        key={node.plan_node_id}
                        node={{ ...node, children: [] }}
                        level={0}
                        rule={rule}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        onDrillDown={onDrillDown}
                        readOnly={readOnly}
                        configuredUnits={configuredUnits}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {nodes.map((node) => (
                <NodeItem
                    key={node.plan_node_id}
                    node={node}
                    level={0}
                    rule={rule}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetails={onViewDetails}
                    onDrillDown={onDrillDown}
                    readOnly={readOnly}
                    configuredUnits={configuredUnits}
                />
            ))}
        </div>
    );
}
