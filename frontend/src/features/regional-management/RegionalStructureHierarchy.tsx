"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Tree, { RawNodeDatum } from "react-d3-tree";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { shortenText } from "@/utils/shortenText";
import { D3TreeNode } from "@/types/d3treeNode";
import { buildSectorTree } from "@/utils/buildSectorTree";
import { HierarchyTreeParentBadge } from "@/features/structure-management/components/HierarchyTreeParentBadge";
import {
  departmentHierarchyPathFunc,
  DEPARTMENT_HIERARCHY_TREE_LAYOUT,
  DEPARTMENT_HIERARCHY_LINK_STYLES,
} from "@/utils/departmentHierarchyTreeLayout";
import type { RegionalStructure } from "@/redux/types/region";
import { Users, Plus, Edit } from "lucide-react";

export interface RegionalStructureHierarchyProps {
  data: RegionalStructure[];
  isLoading?: boolean;
  regionName?: string;
  onAddChild?: (parentId: string) => void;
  onEdit?: (structure: RegionalStructure) => void;
  canAddChild?: boolean;
  canUpdate?: boolean;
}

/**
 * Converts a RegionalStructure node to D3Tree format
 */
function convertToD3Tree(node: any): D3TreeNode {
  const node_id = node.regional_structure_id || node.id;
  const builtChildren = Array.isArray(node.children) ? node.children : [];

  return {
    name: node.name || "Unnamed",
    attributes: {
      node_id,
      description: node.description || "",
      parent_id: node.parent_id ?? null,
      parent_name: node.parent?.name || null,
      level: node.level ?? 1,
      is_active: node.is_active !== undefined ? node.is_active : true,
      users_count: node.users_count || 0,
      originalNode: node,
    },
    children: builtChildren.length ? builtChildren.map(convertToD3Tree) : undefined,
  };
}

interface RegionalCustomNodeProps {
  nodeDatum: D3TreeNode & { __rd3t?: { collapsed?: boolean } };
  toggleNode: () => void;
  onAddChild?: (parentId: string) => void;
  onEdit?: (structure: RegionalStructure) => void;
  canAddChild?: boolean;
  canUpdate?: boolean;
}

const RegionalCustomNode: React.FC<RegionalCustomNodeProps> = ({
  nodeDatum,
  toggleNode,
  onAddChild,
  onEdit,
  canAddChild = true,
  canUpdate = true,
}) => {
  const hasChildren = !!nodeDatum.children?.length;
  const isActive = Boolean(nodeDatum.attributes.is_active);
  const isCollapsed = nodeDatum.__rd3t?.collapsed ?? false;
  const originalNode = nodeDatum.attributes.originalNode as RegionalStructure;

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) {
      onAddChild(nodeDatum.attributes.node_id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit && originalNode) {
      onEdit(originalNode);
    }
  };

  return (
    <g>
      {hasChildren && (
        <g transform={`translate(-160, -70)`}>
          <foreignObject x={-10} y={-10} width={20} height={20}>
            <button
              onClick={toggleNode}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 shadow-sm"
              title={isCollapsed ? "Expand Sub-departments" : "Collapse Sub-departments"}
            >
              {isCollapsed ? "+" : "−"}
            </button>
          </foreignObject>
        </g>
      )}

      <foreignObject x={-150} y={-95} width={300} height={165}>
        <div className="flex h-full w-full min-h-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-lg transition-all duration-200 hover:border-primary hover:shadow-xl">
          <div>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 flex-1 pr-1 text-sm font-bold text-primary">
                {nodeDatum.name}
              </h3>
              <span
                className={`px-2 py-0.5 flex items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>

            {nodeDatum.attributes.parent_name && (
              <HierarchyTreeParentBadge
                parentName={nodeDatum.attributes.parent_name}
                variant="department"
              />
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="font-semibold text-foreground/80">
                Level {nodeDatum.attributes.level}
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Users className="h-3 w-3 text-blue-600" />
                <span>{nodeDatum.attributes.users_count || 0} Staff</span>
              </span>
            </div>

            {nodeDatum.attributes.description && (
              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                {shortenText(nodeDatum.attributes.description, 35)}
              </p>
            )}
          </div>

          <div className="mt-2 flex shrink-0 items-center gap-2 pt-2 border-t border-border/40">
            {canUpdate && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-muted py-1.5 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-muted/80"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            )}
            {isActive && canAddChild && (
              <button
                type="button"
                onClick={handleAddChild}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Child</span>
              </button>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function RegionalStructureHierarchy({
  data,
  isLoading = false,
  regionName,
  onAddChild,
  onEdit,
  canAddChild = true,
  canUpdate = true,
}: RegionalStructureHierarchyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedRootId, setSelectedRootId] = useState("");

  const rootNodes = useMemo(() => buildSectorTree(data), [data]);
  const d3TreeData = useMemo(() => rootNodes.map(convertToD3Tree), [rootNodes]);

  const rootOptions = useMemo(() => {
    return rootNodes.map((n) => ({
      value: n.regional_structure_id || n.id,
      label: n.name,
    }));
  }, [rootNodes]);

  useEffect(() => {
    if (
      rootOptions.length > 0 &&
      (!selectedRootId || !rootOptions.find((opt) => opt.value === selectedRootId))
    ) {
      setSelectedRootId(rootOptions[0].value);
    }
  }, [rootOptions, selectedRootId]);

  const selectedTree = useMemo(() => {
    if (!d3TreeData || !Array.isArray(d3TreeData) || d3TreeData.length === 0) return null;
    if (!selectedRootId) return [d3TreeData[0]];
    const node = d3TreeData.find((n) => n.attributes.node_id === selectedRootId);
    return node ? [node] : [d3TreeData[0]];
  }, [d3TreeData, selectedRootId]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
        setTranslate({ x: width / 2, y: 80 });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [selectedTree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[500px]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm font-medium text-primary">Loading regional organogram...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div
        ref={containerRef}
        className="w-full h-full min-h-[550px] bg-[#F9FBFC] rounded-lg border border-border overflow-hidden"
        style={{ position: "relative" }}
      >
        {rootOptions.length > 1 && (
          <div className="absolute top-0 left-0 p-4 z-10 pointer-events-none">
            <div className="w-[300px] rounded-lg p-3 bg-white/90 backdrop-blur-sm border border-border shadow-sm pointer-events-auto">
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block uppercase tracking-wider">
                Select Root Department
              </Label>
              <Select value={selectedRootId} onValueChange={setSelectedRootId}>
                <SelectTrigger className="h-9 w-full bg-background text-sm">
                  <SelectValue placeholder="Select root department" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {rootOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-border pointer-events-auto text-[11px] text-muted-foreground space-y-0.5">
            <p className="font-bold text-primary mb-1">Navigation:</p>
            <p>• Scroll to zoom</p>
            <p>• Drag to pan</p>
            <p>• Click +/− to toggle branches</p>
          </div>
        </div>

        <style>{DEPARTMENT_HIERARCHY_LINK_STYLES}</style>

        {selectedTree && selectedTree.length > 0 ? (
          <div
            id="tree-container"
            className="w-full h-full"
            style={{ width: "100%", height: dimensions.height || "550px" }}
          >
            <Tree
              data={selectedTree as unknown as RawNodeDatum[]}
              translate={translate}
              orientation="vertical"
              pathFunc={departmentHierarchyPathFunc}
              separation={DEPARTMENT_HIERARCHY_TREE_LAYOUT.separation}
              nodeSize={DEPARTMENT_HIERARCHY_TREE_LAYOUT.nodeSize}
              zoom={DEPARTMENT_HIERARCHY_TREE_LAYOUT.zoom}
              scaleExtent={{ min: 0.1, max: 2 }}
              enableLegacyTransitions={true}
              transitionDuration={300}
              renderCustomNodeElement={(props) => (
                <RegionalCustomNode
                  nodeDatum={
                    props.nodeDatum as unknown as D3TreeNode & {
                      __rd3t?: { collapsed?: boolean };
                    }
                  }
                  toggleNode={props.toggleNode}
                  onAddChild={onAddChild}
                  onEdit={onEdit}
                  canAddChild={canAddChild}
                  canUpdate={canUpdate}
                />
              )}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 h-full min-h-[550px]">
            <div className="text-center max-w-md">
              <p className="text-muted-foreground text-base font-medium">No departments found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {regionName
                  ? `There are no departments registered for ${regionName} yet.`
                  : "Add your first regional department to view the organogram."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
