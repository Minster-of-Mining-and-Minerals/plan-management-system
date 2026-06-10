import { PlanNode, ReorderPlanNodesPayload } from "@/redux/types/plan";

export function sortPlanNodes<T extends Pick<PlanNode, "order" | "created_at">>(nodes: T[]): T[] {
    return [...nodes].sort((a, b) => {
        const orderDiff = (a.order ?? 0) - (b.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
    });
}

export function buildSiblingReorderPayload(
    siblings: PlanNode[],
    nodeId: string,
    direction: "up" | "down"
): ReorderPlanNodesPayload | null {
    const sorted = sortPlanNodes(siblings);
    const index = sorted.findIndex((n) => n.plan_node_id === nodeId);
    if (index < 0) return null;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return null;

    const reordered = [...sorted];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    return {
        parent_id: sorted[0]?.parent_id ?? null,
        nodeOrders: reordered.map((node, order) => ({
            plan_node_id: node.plan_node_id,
            order,
        })),
    };
}
