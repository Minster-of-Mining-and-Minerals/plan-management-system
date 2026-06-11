import { PlanNodeHierarchy } from "@/redux/types/plan";

export interface FlatPlanNodeRow {
    node: PlanNodeHierarchy;
    depth: number;
    siblings: PlanNodeHierarchy[];
    siblingIndex: number;
}

export function flattenPlanSubtree(root: PlanNodeHierarchy): FlatPlanNodeRow[] {
    const rows: FlatPlanNodeRow[] = [];

    function walk(
        node: PlanNodeHierarchy,
        depth: number,
        siblings: PlanNodeHierarchy[],
        siblingIndex: number
    ) {
        rows.push({ node, depth, siblings, siblingIndex });
        const children = node.children ?? [];
        children.forEach((child, index) => {
            walk(child, depth + 1, children, index);
        });
    }

    walk(root, 0, [root], 0);
    return rows;
}

export function countPlanSubtreeNodes(root: PlanNodeHierarchy): number {
    return flattenPlanSubtree(root).length;
}
