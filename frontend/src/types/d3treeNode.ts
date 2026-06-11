import { RawNodeDatum } from "react-d3-tree";

export interface D3TreeNode extends RawNodeDatum {
  name: string;
  attributes: {
    node_id: string;
    description: string;
    parent_id: string | null;
    level: number;
    is_active: boolean;
    [key: string]: any;
  };
  children?: D3TreeNode[];
}

import type { PermissionKey } from "@/lib/permissions";

export interface CustomNodeProps {
  nodeDatum: D3TreeNode & { __rd3t?: { collapsed?: boolean } };
  toggleNode: () => void;
  onAddChild?: (parentId: string) => void;
  permissions?: PermissionKey[];
}

export interface HierarchyD3TreeProps {
  data: any[];
  isLoading?: boolean;
  type: 'government' | 'internal';
  governmentStructureId?: string;
}
