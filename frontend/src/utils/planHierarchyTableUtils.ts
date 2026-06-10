import { PlanNodeHierarchy } from "@/redux/types/plan";
import { sortPlanNodes } from "@/utils/planNodeOrderUtils";

export interface FlatPlanNodeRow {
    node: PlanNodeHierarchy;
    depth: number;
    siblings: PlanNodeHierarchy[];
    siblingIndex: number;
}

export function flattenPlanSubtree(root: PlanNodeHierarchy): FlatPlanNodeRow[] {
    const rows: FlatPlanNodeRow[] = [];
    const sortedRoots = sortPlanNodes([root]);

    function walk(
        node: PlanNodeHierarchy,
        depth: number,
        siblings: PlanNodeHierarchy[],
        siblingIndex: number
    ) {
        rows.push({ node, depth, siblings, siblingIndex });
        const children = sortPlanNodes(node.children ?? []);
        children.forEach((child, index) => {
            walk(child, depth + 1, children, index);
        });
    }

    walk(root, 0, sortedRoots, 0);
    return rows;
}

export function countPlanSubtreeNodes(root: PlanNodeHierarchy): number {
    return flattenPlanSubtree(root).length;
}
