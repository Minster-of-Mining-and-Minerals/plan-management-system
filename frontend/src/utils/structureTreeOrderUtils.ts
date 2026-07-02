import { buildSectorTree } from "@/utils/buildSectorTree";

type StructureNode = {
  parent_id?: string | null;
  name?: string;
  level?: number;
  government_structure_id?: string;
  internal_structure_id?: string;
  sector_node_id?: string;
  id?: string;
};

export function getStructureNodeId(node: StructureNode): string {
  return (
    node.internal_structure_id ||
    node.sector_node_id ||
    node.government_structure_id ||
    node.id ||
    ""
  );
}

/**
 * Orders a flat structure list depth-first: each parent immediately
 * followed by its descendants (roots first, then children top-to-bottom).
 */
export function sortStructuresByTreeDepth<T extends StructureNode>(nodes: T[]): T[] {
  if (!nodes.length) return [];

  const byId = new Map<string, T>();
  for (const node of nodes) {
    const id = getStructureNodeId(node);
    if (id) byId.set(id, node);
  }

  const roots = buildSectorTree(nodes);
  roots.sort(
    (a, b) =>
      (a.level ?? 0) - (b.level ?? 0) ||
      String(a.name ?? "").localeCompare(String(b.name ?? ""))
  );

  const ordered: T[] = [];
  const seen = new Set<string>();

  const walk = (treeNode: StructureNode & { children?: StructureNode[] }) => {
    const id = getStructureNodeId(treeNode);
    if (id && byId.has(id) && !seen.has(id)) {
      ordered.push(byId.get(id)!);
      seen.add(id);
    }

    const children = [...(treeNode.children ?? [])].sort(
      (a, b) =>
        (a.level ?? 0) - (b.level ?? 0) ||
        String(a.name ?? "").localeCompare(String(b.name ?? ""))
    );

    for (const child of children) {
      walk(child);
    }
  };

  for (const root of roots) {
    walk(root);
  }

  for (const node of nodes) {
    const id = getStructureNodeId(node);
    if (!id || seen.has(id)) continue;
    ordered.push(node);
  }

  return ordered;
}
