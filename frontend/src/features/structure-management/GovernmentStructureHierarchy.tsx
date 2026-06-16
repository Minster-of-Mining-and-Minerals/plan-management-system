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
import { useSession } from "next-auth/react";
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
  permissions = [],
}) => {
  const hasChildren = !!nodeDatum.children?.length;
  const isActive = isStructureActive(nodeDatum.attributes.is_active);
  const isCollapsed = nodeDatum.__rd3t?.collapsed ?? false;

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddChild) {
      onAddChild(nodeDatum.attributes.node_id);
    }
  };

  return (
    <g>
      {hasChildren && (
        <g transform={`translate(-160, -70)`}>
          <foreignObject x={-10} y={-10} width={20} height={20}>
            <button
              onClick={toggleNode}
              className="w-5 h-5 rounded-full bg-[#073954] hover:bg-[#0a4d70] text-white font-semibold flex items-center justify-center transition-colors duration-200 cursor-pointer text-sm"
            >
              {isCollapsed ? "+" : "−"}
            </button>
          </foreignObject>
        </g>
      )}

      <foreignObject x={-150} y={-90} width={300} height={150}>
        <div className="flex h-full w-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-lg transition-all duration-200 hover:border-[#073954] hover:shadow-xl cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-[#073954] text-base font-semibold flex-1 pr-2 line-clamp-2">
              {nodeDatum.name}
            </h3>
            <span
              className={`px-3 py-1 flex items-center justify-center rounded-full text-xs font-semibold whitespace-nowrap ${isActive ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"
                }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {nodeDatum.attributes.parent_name && (
            <HierarchyTreeParentBadge
              parentName={nodeDatum.attributes.parent_name}
              variant="government"
            />
          )}

          {nodeDatum.attributes.description && (
            <p className="text-gray-500 w-full text-sm mb-3 line-clamp-2">
              {shortenText(nodeDatum.attributes.description, 40)}
            </p>
          )}

          <div className="mt-auto flex shrink-0 flex-row justify-center gap-3">
            <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#073954] font-semibold py-2 rounded-lg transition-colors duration-200 text-xs">
              Details
            </button>
            {isActive && (
              <PermissionGuard requireAll={permissions}>
                <button
                  onClick={handleAddChild}
                  className="flex-1 bg-[#073954] hover:bg-[#0a4d70] text-white font-semibold py-2 rounded-lg transition-colors duration-200 text-xs"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#073954] mx-auto mb-4"></div>
          <p className="text-[#073954] text-lg">Loading hierarchy tree...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-4">
        <div
          ref={containerRef}
          className="w-full h-full min-h-[600px] bg-[#F9FBFC] rounded-lg border border-gray-200 overflow-hidden"
          style={{ position: "relative" }}
        >
          <div className="absolute top-0 left-0 w-full p-4 z-10 flex items-center justify-between pointer-events-none">
            {rootOptions.length > 1 && (
              <div className="w-[350px] rounded-lg p-4 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm pointer-events-auto">
                <Label className="text-secondary text-xs font-semibold mb-1.5 block uppercase tracking-wider">
                  Select Root Sector
                </Label>
                <Select value={selectedRootId} onValueChange={setSelectedRootId}>
                  <SelectTrigger className="w-full h-10 border border-gray-200 px-4 py-3 rounded-md focus:ring-2 focus:ring-[#073954]/20 transition-all duration-200 outline-none bg-white">
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
              <p className="font-bold text-[#073954] mb-1">Navigation:</p>
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
                nodeSize={{ x: 220, y: 250 }}
                zoom={0.75}
                scaleExtent={{ min: 0.1, max: 2 }}
                enableLegacyTransitions={true}
                transitionDuration={300}
                renderCustomNodeElement={(props) => (
                  <CustomNode
                    nodeDatum={props.nodeDatum as unknown as D3TreeNode & { __rd3t?: { collapsed?: boolean } }}
                    toggleNode={props.toggleNode}
                    onAddChild={handleAddChild}
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