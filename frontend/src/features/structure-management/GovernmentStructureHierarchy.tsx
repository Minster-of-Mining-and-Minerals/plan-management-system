"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Tree, { RawNodeDatum } from "react-d3-tree";
import { shortenText } from "@/utils/shortenText";
import { CustomNodeProps, D3TreeNode, HierarchyD3TreeProps } from "@/types/d3treeNode";
import { buildSectorTree } from "@/utils/buildSectorTree";
import type { PermissionKey } from "@/lib/permissions";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { CreateGovernmentStructureModal } from "./modals/CreateGovernmentStructureModal";
import { HierarchyTreeParentBadge } from "./components/HierarchyTreeParentBadge";
import { SectorLogo } from "@/components/common/SectorLogo";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { isStructureActive } from "@/utils/structureUtils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
 
/**
 * Converts a StructureNode to D3Tree format
 */
function convertToD3Tree(node: any): D3TreeNode {
  const node_id = node.government_structure_id || node.sector_node_id || node.id;

  return {
    name: node.name || "Unnamed",
    attributes: {
      node_id: node_id,
      description: node.description || "",
      parent_id: node.parent_id ?? null,
      parent_name: node.parent?.name || null,
      level: node.level,
      is_active: node.is_active,
      logo_path: node.logo_path || null,
    },
    children: node.children?.length
      ? node.children.map(convertToD3Tree)
      : undefined,
  };
}

const CustomNode: React.FC<CustomNodeProps> = ({
  nodeDatum,
  toggleNode,
  onAddChild,
  onViewDetails,
  permissions = [],
}) => {
  const hasChildren = !!nodeDatum.children?.length;
  const isActive = isStructureActive(nodeDatum.attributes.is_active);
  const isCollapsed = nodeDatum.__rd3t?.collapsed ?? false;
  const logoPath = nodeDatum.attributes.logo_path as string | null | undefined;

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) {
      onAddChild(nodeDatum.attributes.node_id);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(nodeDatum.attributes.node_id);
  };

  return (
    <g>
      {hasChildren && (
        <g transform={`translate(-160, -70)`}>
          <foreignObject x={-10} y={-10} width={20} height={20}>
            <button
              onClick={toggleNode}
              className="w-5 h-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer text-sm"
            >
              {isCollapsed ? "+" : "−"}
            </button>
          </foreignObject>
        </g>
      )}

      <foreignObject x={-150} y={-100} width={300} height={170}>
        <div className="group/card flex h-full w-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl cursor-pointer">
          <div className="mb-2 flex items-start gap-3">
            <div className="relative shrink-0 transition-transform duration-300 group-hover/card:scale-105">
              <SectorLogo
                name={nodeDatum.name}
                logoPath={logoPath}
                size="lg"
                showRing={Boolean(logoPath)}
              />
              {logoPath ? (
                <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/5 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 flex-1 pr-1 text-base font-semibold text-foreground">
                  {nodeDatum.name}
                </h3>
                <span
                  className={`flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {nodeDatum.attributes.parent_name && (
                <div className="mt-1.5">
                  <HierarchyTreeParentBadge
                    parentName={nodeDatum.attributes.parent_name}
                    variant="government"
                  />
                </div>
              )}
            </div>
          </div>

          {nodeDatum.attributes.description && (
            <p className="mb-2 line-clamp-2 w-full text-xs text-muted-foreground">
              {shortenText(nodeDatum.attributes.description, 40)}
            </p>
          )}

          <div className="mt-auto flex shrink-0 flex-row justify-center gap-2">
            <button
              type="button"
              onClick={handleViewDetails}
              className="flex-1 rounded-lg bg-muted py-2 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-muted/80"
            >
              Details
            </button>
            {isActive && (
              <PermissionGuard requireAll={permissions}>
                <button
                  onClick={handleAddChild}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
                >
                  Add Child
                </button>
              </PermissionGuard>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

const GovernmentHierarchyD3Tree: React.FC<HierarchyD3TreeProps> = ({
  data,
  isLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedRootId, setSelectedRootId] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const handleAddChild = (parentId: string) => {
    setSelectedParentId(parentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedParentId("");
  };

  const handleViewDetails = (nodeId: string) => {
    router.push(`/government-structures/${nodeId}`);
  };

  const userGovId = useMemo(() => {
    const userGov = session?.user?.government_structure;
    return (userGov && !Array.isArray(userGov)) ? userGov.government_structure_id : null;
  }, [session]);

  const rootNodes = useMemo(() => buildSectorTree(data), [data]);
  const d3TreeData = useMemo(() => rootNodes.map(convertToD3Tree), [rootNodes]);

  const rootOptions = useMemo(() => {
    return rootNodes.map((n) => ({
      value: n.government_structure_id || n.sector_node_id,
      label: n.name,
    }));
  }, [rootNodes]);

  useEffect(() => {
    if (rootOptions.length > 0 && (!selectedRootId || !rootOptions.find((opt) => opt.value === selectedRootId))) {
      setSelectedRootId(rootOptions[0].value);
    }
  }, [rootOptions, selectedRootId]);

  const selectedTree = useMemo(() => {
    if (!d3TreeData || !Array.isArray(d3TreeData) || d3TreeData.length === 0) return null;
    
    // If we have a selected root (either from dropdown or the only root returned by API)
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

  const createPermission: PermissionKey[] = ["GOVERNMENT_STRUCTURES:CREATE"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-lg text-primary">Loading hierarchy tree...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-4">
        <div
          ref={containerRef}
          className="w-full h-full min-h-[600px] bg-background rounded-lg border border-border overflow-hidden"
          style={{ position: "relative" }}
        >
          <div className="absolute top-0 left-0 w-full p-4 z-10 flex items-center justify-between pointer-events-none">
            {rootOptions.length > 1 && (
              <div className="w-[350px] rounded-lg p-4 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm pointer-events-auto">
                <Label className="text-secondary text-xs font-semibold mb-1.5 block uppercase tracking-wider">
                  Select Root Sector
                </Label>
                <Select value={selectedRootId} onValueChange={setSelectedRootId}>
                  <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select root sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {rootOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="absolute top-4 right-0 w-full p-4 z-10 flex items-center justify-end pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-gray-100 pointer-events-auto text-[11px] text-gray-500 space-y-1">
              <p className="mb-1 font-bold text-primary">Navigation:</p>
              <p>• Scroll to zoom</p>
              <p>• Drag to pan</p>
              <p>• Click nodes to toggle</p>
            </div>
          </div>

          <style>{`.rd3t-link { stroke: #CBD5E1 !important; stroke-width: 2.5px !important; fill: none !important; transition: all 0.3s ease; }`}</style>

          {selectedTree && selectedTree.length > 0 ? (
            <div id="tree-container" className="w-full h-full" style={{ width: "100%", height: dimensions.height || "600px" }}>
              <Tree
                data={selectedTree as unknown as RawNodeDatum[]}
                translate={translate}
                orientation="vertical"
                pathFunc="straight"
                separation={{ siblings: 2.5, nonSiblings: 2 }}
                nodeSize={{ x: 220, y: 280 }}
                zoom={0.75}
                scaleExtent={{ min: 0.1, max: 2 }}
                enableLegacyTransitions={true}
                transitionDuration={300}
                renderCustomNodeElement={(props) => (
                  <CustomNode
                    nodeDatum={props.nodeDatum as unknown as D3TreeNode & { __rd3t?: { collapsed?: boolean } }}
                    toggleNode={props.toggleNode}
                    onAddChild={handleAddChild}
                    onViewDetails={handleViewDetails}
                    permissions={createPermission}
                  />
                )}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 h-full min-h-[600px]">
              <div className="text-center">
                <p className="text-gray-400 text-lg font-medium">No sectors found</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGovernmentStructureModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialParentId={selectedParentId}
      />
    </>
  );
};

export default GovernmentHierarchyD3Tree;