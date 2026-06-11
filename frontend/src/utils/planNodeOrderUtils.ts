import { PlanNode, PlanNodeHierarchy, ReorderPlanNodesPayload } from "@/redux/types/plan";

export function sortPlanNodes<T extends Pick<PlanNode, "order" | "created_at" | "plan_node_id">>(nodes: T[]): T[] {
    return [...nodes].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (aTime !== bTime) return aTime - bTime;
        return (a.plan_node_id ?? "").localeCompare(b.plan_node_id ?? "");
    });
}

/** Recursively sort hierarchy siblings at every level (same rule as draft document order). */
export function sortPlanHierarchy(nodes: PlanNodeHierarchy[]): PlanNodeHierarchy[] {
    const sorted = sortPlanNodes(nodes);
    return sorted.map((node) => ({
        ...node,
        children: node.children?.length ? sortPlanHierarchy(node.children) : node.children,
    }));
}

/** Cascaded outline numbers from sibling order, e.g. 1 → 1.1 → 1.1.1 */
export function buildHierarchyNumberMap(
    roots: PlanNodeHierarchy[]
): Map<string, string> {
    const map = new Map<string, string>();

    function walk(nodes: PlanNodeHierarchy[], parentNumber: string | null) {
        nodes.forEach((node, index) => {
            const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
            map.set(node.plan_node_id, number);
            if (node.children?.length) {
                walk(node.children, number);
            }
        });
    }

    walk(roots, null);
    return map;
}

export function getHierarchyNumber(
    map: Map<string, string>,
    nodeId: string
): string | undefined {
    return map.get(nodeId);
}

export function buildSiblingReorderPayload(
    siblings: PlanNode[],
    nodeId: string,
    direction: "up" | "down"
): ReorderPlanNodesPayload | null {
    // Siblings are already in draft order from the hierarchy API (single source of truth).
    const index = siblings.findIndex((n) => n.plan_node_id === nodeId);
    if (index < 0) return null;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return null;

    const reordered = [...siblings];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    return {
        parent_id: siblings[0]?.parent_id ?? null,
        nodeOrders: reordered.map((node, order) => ({
            plan_node_id: node.plan_node_id,
            order,
        })),
    };
}
