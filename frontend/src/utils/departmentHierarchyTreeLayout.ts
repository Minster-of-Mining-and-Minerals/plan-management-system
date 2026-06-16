import type { PathFunction } from "react-d3-tree";

/**
 * Orthogonal connectors for department hierarchy (L / T shapes).
 * - Same column: vertical drop (L)
 * - Siblings: shared horizontal bus then vertical to each child (T)
 */
export const departmentHierarchyPathFunc: PathFunction = (linkDatum, orientation) => {
    const { source, target } = linkDatum;

    if (orientation === "horizontal") {
        const deltaX = target.x - source.x;
        const busX = source.y + deltaX / 2;
        return `M${source.y},${source.x} H${busX} V${target.x} H${target.y}`;
    }

    const deltaY = target.y - source.y;
    const sameColumn = Math.abs(target.x - source.x) < 1;

    if (sameColumn) {
        return `M${source.x},${source.y} V${target.y}`;
    }

    const busY = source.y + deltaY * 0.42;
    return `M${source.x},${source.y} V${busY} H${target.x} V${target.y}`;
};

/** Tighter spacing than sector view — wide department trees stay readable. */
export const DEPARTMENT_HIERARCHY_TREE_LAYOUT = {
    separation: { siblings: 1.55, nonSiblings: 1.75 },
    nodeSize: { x: 205, y: 235 },
    zoom: 0.78,
} as const;

export const DEPARTMENT_HIERARCHY_LINK_STYLES = `
  .rd3t-link {
    stroke: #CBD5E1 !important;
    stroke-width: 2px !important;
    fill: none !important;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: all 0.3s ease;
  }
`;
