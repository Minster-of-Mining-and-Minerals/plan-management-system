import { SectorNode } from "@/redux/types/sectorNode";

/**
 * Builds a hierarchical tree structure from a flat array of structure nodes.
 * This function ensures all children are properly nested, even if the API
 * returns a flat array with incomplete nested children.
 *
 * @param nodes - Flat array of structure nodes from the API
 * @returns Array of root nodes (parent_id === null) with fully populated children
 *
 * @example
 * const flatNodes = [
 *   { structure_node_id: "1", parent_id: null, name: "Root", ... },
 *   { structure_node_id: "2", parent_id: "1", name: "Child", ... },
 * ];
 * const tree = buildSectorTree(flatNodes);
 * // Returns: [{ structure_node_id: "1", ..., children: [{ structure_node_id: "2", ... }] }]
 */
export function buildSectorTree(nodes: SectorNode[]): SectorNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  // Create a map for quick lookup by ID
  const nodeMap = new Map<string, SectorNode>();

  // First pass: Create a copy of each node without children and add to map
  nodes.forEach((node) => {
    nodeMap.set(node.sector_node_id, {
      ...node,
      children: [], // Initialize empty children array
    });
  });

  // Second pass: Build the tree by linking children to parents
  const rootNodes: SectorNode[] = [];

  nodes.forEach((node) => {
    const currentNode = nodeMap.get(node.sector_node_id);

    if (!currentNode) return;

    // If this node has a parent, add it to the parent's children
    if (node.parent_id) {
      const parentNode = nodeMap.get(node.parent_id);
      if (parentNode && parentNode.children) {
        parentNode.children.push(currentNode);
      }
    } else {
      // This is a root node (no parent)
      rootNodes.push(currentNode);
    }
  });

  // Recursively sort children if needed (optional - can be removed if not needed)
  const sortChildren = (node: SectorNode): void => {
    if (node.children && node.children.length > 0) {
      node.children.forEach(sortChildren);
      // Optionally sort by name or created_at
      // node.children.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  rootNodes.forEach(sortChildren);

  return rootNodes;
}
