"use strict";
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
import type { CompanyStructure } from "@/redux/types/company";
import { Users, Plus, Edit, Building2 } from "lucide-react";

export interface CompanyStructureHierarchyProps {
  data: CompanyStructure[];
  isLoading?: boolean;
  companyName?: string;
  onAddChild?: (parentId: string) => void;
  onEdit?: (structure: CompanyStructure) => void;
  canAddChild?: boolean;
  canUpdate?: boolean;
}

/**
 * Converts a CompanyStructure node to D3Tree format
 */
function convertToD3Tree(node: any): D3TreeNode {
  const node_id = node.company_structure_id || node.id;
  const builtChildren = Array.isArray(node.children) ? node.children : [];

  return {
    name: node.name || "Unnamed",
    attributes: {
      node_id,
      code: node.code || "",
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

interface CompanyCustomNodeProps {
  nodeDatum: D3TreeNode & { __rd3t?: { collapsed?: boolean } };
  toggleNode: () => void;
  selectedNodeId: string | null;
  onSelectNode: (node: D3TreeNode) => void;
  onAddChild?: (parentId: string) => void;
  onEdit?: (structure: CompanyStructure) => void;
  canAddChild?: boolean;
  canUpdate?: boolean;
}

const CompanyCustomNode: React.FC<CompanyCustomNodeProps> = ({
  nodeDatum,
  toggleNode,
  selectedNodeId,
  onSelectNode,
  onAddChild,
  onEdit,
  canAddChild,
  canUpdate,
}) => {
  const isSelected = selectedNodeId === nodeDatum.attributes?.node_id;
  const hasChildren = Boolean(nodeDatum.children && nodeDatum.children.length > 0);
  const isCollapsed = Boolean(nodeDatum.__rd3t?.collapsed);
  const usersCount = Number(nodeDatum.attributes?.users_count || 0);
  const isActive = Boolean(nodeDatum.attributes?.is_active);
  const originalNode = nodeDatum.attributes?.originalNode as CompanyStructure;

  const nodeWidth = 240;
  const nodeHeight = 84;

  return (
    <g>
      {/* Node Card Background */}
      <rect
        width={nodeWidth}
        height={nodeHeight}
        x={-nodeWidth / 2}
        y={-nodeHeight / 2}
        rx={10}
        ry={10}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected
            ? "fill-card stroke-primary stroke-2"
            : "fill-card stroke-border hover:stroke-primary/50"
        } ${!isActive ? "opacity-60" : ""}`}
        filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05))"
        onClick={() => onSelectNode(nodeDatum)}
      />

      {/* Top Accent Strip */}
      <rect
        width={nodeWidth}
        height={4}
        x={-nodeWidth / 2}
        y={-nodeHeight / 2}
        rx={2}
        className={isActive ? "fill-primary" : "fill-muted"}
      />

      {/* Node Label / Name */}
      <text
        x={-nodeWidth / 2 + 14}
        y={-nodeHeight / 2 + 24}
        className="text-xs font-semibold fill-foreground pointer-events-none select-none"
      >
        {shortenText(nodeDatum.name, 26)}
      </text>

      {/* Level and Code Badge */}
      <text
        x={-nodeWidth / 2 + 14}
        y={-nodeHeight / 2 + 42}
        className="text-[10px] fill-muted-foreground pointer-events-none select-none"
      >
        Level {nodeDatum.attributes?.level}
        {nodeDatum.attributes?.code ? ` • ${nodeDatum.attributes.code}` : ""}
      </text>

      {/* Users Count Indicator */}
      <g
        transform={`translate(${-nodeWidth / 2 + 14}, ${-nodeHeight / 2 + 54})`}
        className="pointer-events-none select-none"
      >
        <circle cx={4} cy={4} r={3} className="fill-primary/20" />
        <text x={12} y={7} className="text-[10px] fill-muted-foreground font-mono">
          {usersCount} {usersCount === 1 ? "user" : "users"}
        </text>
      </g>

      {/* Action Buttons in Card */}
      <g transform={`translate(${nodeWidth / 2 - 58}, ${-nodeHeight / 2 + 16})`}>
        {canAddChild && (
          <g
            className="cursor-pointer hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              if (nodeDatum.attributes?.node_id) {
                onAddChild?.(nodeDatum.attributes.node_id);
              }
            }}
          >
            <circle cx={10} cy={10} r={11} className="fill-muted hover:fill-primary/10" />
            <Plus className="w-3.5 h-3.5 text-primary" x={3.25} y={3.25} />
          </g>
        )}
        {canUpdate && originalNode && (
          <g
            transform="translate(26, 0)"
            className="cursor-pointer hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(originalNode);
            }}
          >
            <circle cx={10} cy={10} r={11} className="fill-muted hover:fill-primary/10" />
            <Edit className="w-3.5 h-3.5 text-muted-foreground" x={3.25} y={3.25} />
          </g>
        )}
      </g>

      {/* Expand / Collapse Button if node has children */}
      {hasChildren && (
        <g
          transform={`translate(0, ${nodeHeight / 2})`}
          className="cursor-pointer hover:opacity-80"
          onClick={(e) => {
            e.stopPropagation();
            toggleNode();
          }}
        >
          <circle cx={0} cy={0} r={9} className="fill-background stroke-primary stroke-2" />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            className="text-[11px] font-bold fill-primary pointer-events-none select-none"
          >
            {isCollapsed ? "+" : "−"}
          </text>
        </g>
      )}
    </g>
  );
};

export default function CompanyStructureHierarchy({
  data = [],
  isLoading = false,
  companyName = "Company",
  onAddChild,
  onEdit,
  canAddChild = false,
  canUpdate = false,
}: CompanyStructureHierarchyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<string>("all");

  const treeData = useMemo(() => {
    if (!data.length) return [];
    const nested = buildSectorTree(data);
    return nested.map(convertToD3Tree);
  }, [data]);

  const rootOptions = useMemo(() => {
    return data.filter((item) => !item.parent_id);
  }, [data]);

  const activeTreeData = useMemo(() => {
    if (selectedRootId === "all") return treeData;
    return treeData.filter((t) => t.attributes?.node_id === selectedRootId);
  }, [treeData, selectedRootId]);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      setTranslate({ x: clientWidth / 2, y: 80 });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center border rounded-lg bg-card text-muted-foreground">
        Loading organizational tree...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border rounded-lg bg-card text-muted-foreground p-6 text-center">
        <Building2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="font-medium text-foreground">No organizational structures defined</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Create the company root department or organizational division to visualize the organizational tree.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rootOptions.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm">Filter Tree Root:</Label>
          <Select value={selectedRootId} onValueChange={setSelectedRootId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entire Organizational Tree</SelectItem>
              {rootOptions.map((root) => (
                <SelectItem key={root.company_structure_id} value={root.company_structure_id}>
                  {root.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-[600px] border border-border rounded-xl bg-card overflow-hidden shadow-inner relative"
      >
        <Tree
          data={activeTreeData.length === 1 ? (activeTreeData[0] as unknown as RawNodeDatum) : (activeTreeData as unknown as RawNodeDatum[])}
          translate={translate}
          orientation="vertical"
          pathFunc={departmentHierarchyPathFunc}
          nodeSize={DEPARTMENT_HIERARCHY_TREE_LAYOUT.nodeSize}
          separation={DEPARTMENT_HIERARCHY_TREE_LAYOUT.separation}
          renderCustomNodeElement={(rd3tProps) => (
            <CompanyCustomNode
              nodeDatum={rd3tProps.nodeDatum as unknown as D3TreeNode & { __rd3t?: { collapsed?: boolean } }}
              toggleNode={rd3tProps.toggleNode}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node.attributes?.node_id || null)}
              onAddChild={onAddChild}
              onEdit={onEdit}
              canAddChild={canAddChild}
              canUpdate={canUpdate}
            />
          )}
          enableLegacyTransitions
          transitionDuration={300}
        />
      </div>
    </div>
  );
}
