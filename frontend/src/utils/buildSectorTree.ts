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
export function buildSectorTree(nodes: any[]): any[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  // Create a map for quick lookup by ID
  const nodeMap = new Map<string, any>();

  // Determine the ID field (handle government_structure_id, internal_structure_id, etc.)
  const getId = (node: any) => 
    node.internal_structure_id || 
    node.government_structure_id || 
    node.sector_node_id || 
    node.id;

  // First pass: Create a copy of each node without children and add to map
  nodes.forEach((node) => {
    const id = getId(node);
    if (id) {
      nodeMap.set(id, {
        ...node,
        logo_path: node.logo_path ?? null,
        children: [],
      });
    }
  });

  // Second pass: Build the tree by linking children to parents
  const rootNodes: any[] = [];

  nodes.forEach((node) => {
    const id = getId(node);
    const currentNode = nodeMap.get(id);

    if (!currentNode) return;

    // If this node has a parent, add it to the parent's children
    if (node.parent_id) {
      const parentNode = nodeMap.get(node.parent_id);
      if (parentNode) {
        if (!parentNode.children) parentNode.children = [];
        parentNode.children.push(currentNode);
      } else {
        // Parent not found in this batch, treat as root or skip
        rootNodes.push(currentNode);
      }
    } else {
      // This is a root node (no parent)
      rootNodes.push(currentNode);
    }
  });

  return rootNodes;
}
