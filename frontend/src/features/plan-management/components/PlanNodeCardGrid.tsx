"use client";

import { ChevronRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlanNodeHierarchy, PlanNode, PlanRule } from "@/redux/types/plan";
import {
    formatNodeWeight,
    getStepLabel,
    stepRequiresWeight,
} from "@/utils/planRuleUtils";
import { PlanNodeIcon } from "./PlanNodeIcon";
import { PlanNodeActions } from "./PlanNodeActions";

interface PlanNodeCardGridProps {
    nodes: PlanNodeHierarchy[];
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails: (nodeId: string) => void;
    onDrillDown: (node: PlanNodeHierarchy) => void;
}

export function PlanNodeCardGrid({
    nodes,
    rule,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    onDrillDown,
}: PlanNodeCardGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {nodes.map((node) => {
                const hasChildren = node.children && node.children.length > 0;
                const levelLabel = getStepLabel(rule, node.level);
                const nodeWeightMode = node.weight_mode;

                return (
                    <Card
                        key={node.plan_node_id}
                        className={`group relative overflow-hidden border border-gray-100 bg-white transition-all duration-200 hover:border-primary/40 hover:shadow-md ${hasChildren ? "cursor-pointer" : ""}`}
                        onClick={() => {
                            if (hasChildren) onDrillDown(node);
                        }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/80 to-primary/30" />
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="p-2.5 rounded-xl bg-gray-50 group-hover:bg-primary/10 transition-colors">
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
                                        size="sm"
                                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                                        {levelLabel}
                                    </Badge>
                                    {stepRequiresWeight(rule, node.level) && node.weight > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100"
                                        >
                                            {formatNodeWeight(node.weight, nodeWeightMode)}
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                                    {node.title}
                                </h3>
                                {node.description ? (
                                    <p className="text-sm text-gray-500 line-clamp-2">{node.description}</p>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No description</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                {hasChildren ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                                        <Layers className="h-3.5 w-3.5" />
                                        {node.children.length} item{node.children.length !== 1 ? "s" : ""}
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
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
