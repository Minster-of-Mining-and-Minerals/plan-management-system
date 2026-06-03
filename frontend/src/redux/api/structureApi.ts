/**
 * Legacy re-exports — endpoints live in governmentStructureApi / internalStructureApi.
 * Do not inject endpoints here (causes RTK Query duplicate endpoint warnings).
 */

export interface StructureNode {
  government_structure_id?: string;
  internal_structure_id?: string;
  name: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  children?: StructureNode[];
}

export { useGetGovernmentStructuresQuery } from "./governmentStructureApi";
export { useGetInternalStructuresQuery } from "./internalStructureApi";
