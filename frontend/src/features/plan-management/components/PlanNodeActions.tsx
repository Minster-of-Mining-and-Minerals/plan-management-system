"use client";

import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, Eye } from "lucide-react";
import { PlanNode, PlanRule } from "@/redux/types/plan";
import { canAddChild } from "@/utils/planRuleUtils";
import { PlanNodeOrderControls } from "./PlanNodeOrderControls";
import { PermissionGuard } from "@/utils/PermissionGuard";
import {
    PLAN_PERMISSIONS,
    PLAN_READ_PERMISSIONS,
    PLAN_STRUCTURE_MUTATION_PERMISSIONS,
} from "@/utils/planPermissionUtils";
import { RaiseIssueButton } from "./RaiseIssueButton";
import { planNodeTypeToIssueEntityType } from "@/utils/planReviewUtils";

interface PlanNodeActionsProps {
    node: PlanNode;
    rule?: PlanRule | null;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
    onViewDetails?: (nodeId: string) => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isReordering?: boolean;
    readOnly?: boolean;
    dangerMode?: boolean;
    showRaiseIssue?: boolean;
    size?: "sm" | "md";
    className?: string;
}

export function PlanNodeActions({
    node,
    rule,
    onAddChild,
    onEdit,
    onDelete,
    onViewDetails,
    canMoveUp = false,
    canMoveDown = false,
    onMoveUp,
    onMoveDown,
    isReordering = false,
    readOnly = false,
    dangerMode = false,
    showRaiseIssue = false,
    size = "md",
    className = "",
}: PlanNodeActionsProps) {
    const showAddChild = !readOnly && canAddChild(rule, node);
    const showOrderControls =
        !readOnly && !!onMoveUp && !!onMoveDown && (canMoveUp || canMoveDown);
    const iconClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";
    const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    const handleView = () => {
        if (onViewDetails) {
            onViewDetails(node.plan_node_id);
        }
    };

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {showOrderControls && (
                <PermissionGuard requireAny={PLAN_STRUCTURE_MUTATION_PERMISSIONS}>
                    <PlanNodeOrderControls
                        size={size}
                        canMoveUp={canMoveUp}
                        canMoveDown={canMoveDown}
                        disabled={isReordering}
                        onMoveUp={onMoveUp!}
                        onMoveDown={onMoveDown!}
                    />
                </PermissionGuard>
            )}
            {showRaiseIssue && (
                <RaiseIssueButton
                    entityType={planNodeTypeToIssueEntityType(node.type)}
                    entityId={node.plan_node_id}
                    size="icon"
                    variant="ghost"
                    iconOnly
                    className={`${iconClass} text-amber-600 hover:text-amber-700 hover:bg-amber-50`}
                />
            )}
            <PermissionGuard requireAny={PLAN_READ_PERMISSIONS}>
                <Button
                    onClick={handleView}
                    variant="ghost"
                    size="icon"
                    className={`${iconClass} text-blue-600 hover:text-blue-700 hover:bg-blue-50`}
                    title="View Details"
                >
                    <Eye className={iconSize} />
                </Button>
            </PermissionGuard>
            {showAddChild && (
                <PermissionGuard requireAny={PLAN_STRUCTURE_MUTATION_PERMISSIONS}>
                    <Button
                        onClick={() => onAddChild(node)}
                        variant="ghost"
                        size="icon"
                        className={`${iconClass} ${
                            dangerMode
                                ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                                : "text-primary"
                        }`}
                        title="Add Child"
                    >
                        <Plus className={iconSize} />
                    </Button>
                </PermissionGuard>
            )}
            {!readOnly && (
                <PermissionGuard requireAny={PLAN_STRUCTURE_MUTATION_PERMISSIONS}>
                    <>
                        <Button
                            onClick={() => onEdit(node)}
                            variant="ghost"
                            size="icon"
                            className={`${iconClass} ${
                                dangerMode
                                    ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                                    : "text-gray-600"
                            }`}
                            title="Edit"
                        >
                            <Edit className={iconSize} />
                        </Button>
                        <Button
                            onClick={() => onDelete(node.plan_node_id)}
                            variant="ghost"
                            size="icon"
                            className={`${iconClass} text-red-500 hover:text-red-700 hover:bg-red-50`}
                            title="Delete"
                        >
                            <Trash className={iconSize} />
                        </Button>
                    </>
                </PermissionGuard>
            )}
        </div>
    );
}
