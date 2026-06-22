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
import { CustomNodeProps, D3TreeNode, HierarchyD3TreeProps } from "@/types/d3treeNode";
import { buildSectorTree } from "@/utils/buildSectorTree";
import type { PermissionKey } from "@/lib/permissions";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { CreateInternalStructureModal } from "./modals/CreateInternalStructureModal";
import { HierarchyTreeParentBadge } from "./components/HierarchyTreeParentBadge";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useSession } from "next-auth/react";
import { isStructureActive } from "@/utils/structureUtils";
import {
  departmentHierarchyPathFunc,
  DEPARTMENT_HIERARCHY_TREE_LAYOUT,
  DEPARTMENT_HIERARCHY_LINK_STYLES,
} from "@/utils/departmentHierarchyTreeLayout";
 
/**
 * Converts a StructureNode to D3Tree format
 */
function convertToD3Tree(node: any): D3TreeNode {
  const node_id = node.internal_structure_id || node.id;

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
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
            >
              {isCollapsed ? "+" : "−"}
            </button>
          </foreignObject>
        </g>
      )}

      <foreignObject x={-150} y={-90} width={300} height={150}>
        <div className="flex h-full w-full min-h-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg transition-all duration-200 hover:border-primary hover:shadow-xl">
          <div className="mb-3 flex items-start justify-between">
            <h3 className="line-clamp-2 flex-1 pr-2 text-base font-semibold text-primary">
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
              variant="department"
            />
          )}

          {nodeDatum.attributes.description && (
            <p className="text-gray-500 w-full text-sm mb-3 line-clamp-2">
              {shortenText(nodeDatum.attributes.description, 40)}
            </p>
          )}

          <div className="mt-auto flex shrink-0 flex-row justify-center gap-3">
            <button
              type="button"
              className="flex-1 rounded-lg bg-muted py-2 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-muted/80"
            >
              Details
            </button>
            {isActive && (
              <PermissionGuard requireAll={permissions}>
                <button
                  type="button"
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

const InternalHierarchyD3Tree: React.FC<HierarchyD3TreeProps> = ({
  data,
  isLoading = false,
  governmentStructureId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedGovId, setSelectedGovId] = useState("");
  const [selectedRootId, setSelectedRootId] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const userGovId = useMemo(() => {
    const userGov = session?.user?.government_structure;
    return (userGov && !Array.isArray(userGov)) ? userGov.government_structure_id : null;
  }, [session]);

  const lockedGovId = governmentStructureId || userGovId;

  const showGovFilter = !governmentStructureId && !lockedGovId;

  const { data: govStructures = [] } = useGetGovernmentStructuresQuery(
    { is_active: true },
    { skip: !showGovFilter }
  );

  const govOptions = useMemo(
    () =>
      govStructures.map((gov) => ({
        value: gov.government_structure_id,
        label: gov.name,
      })),
    [govStructures]
  );

  const handleAddChild = (parentId: string) => {
    setSelectedParentId(parentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedParentId(null);
  };

  const rootNodes = useMemo(() => {
    if (lockedGovId) return buildSectorTree(data);

    const filteredData = data.filter(
      (s) => s.government_structure_id === selectedGovId
    );
    return buildSectorTree(filteredData);
  }, [data, selectedGovId, lockedGovId]);

  const d3TreeData = useMemo(() => rootNodes.map(convertToD3Tree), [rootNodes]);

  const rootOptions = useMemo(
    () =>
      rootNodes.map((n) => ({
        value: n.internal_structure_id || n.id,
        label: n.name,
      })),
    [rootNodes]
  );

  useEffect(() => {
    if (lockedGovId) {
      setSelectedGovId(lockedGovId);
    } else if (govOptions.length > 0 && !selectedGovId) {
      setSelectedGovId(govOptions[0].value);
    }
  }, [govOptions, selectedGovId, lockedGovId]);

  useEffect(() => {
    if (rootOptions.length > 0 && (!selectedRootId || !rootOptions.find((opt) => opt.value === selectedRootId))) {
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

  const createPermission: PermissionKey[] = ["INTERNAL_STRUCTURES:CREATE"];

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
          className="w-full h-full min-h-[600px] bg-[#F9FBFC] rounded-lg border border-gray-200 overflow-hidden"
          style={{ position: "relative" }}
        >

          {(showGovFilter && govOptions.length > 0) || rootOptions.length > 1 ? (
            <div className="absolute top-0 left-0 w-full p-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="w-[350px] rounded-lg p-4 bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm pointer-events-auto space-y-4">
                {showGovFilter && govOptions.length > 0 && (
                  <div>
                    <Label className="text-secondary text-xs font-semibold mb-1.5 block uppercase tracking-wider">
                      Filter by Sector
                    </Label>
                    <Select value={selectedGovId} onValueChange={setSelectedGovId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {govOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {rootOptions.length > 1 && (
                  <div>
                    <Label className="text-secondary text-xs font-semibold mb-1.5 block uppercase tracking-wider">
                      Select Root Department
                    </Label>
                    <Select value={selectedRootId} onValueChange={setSelectedRootId}>
                      <SelectTrigger className="h-10 w-full rounded-md border border-input bg-background px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select root department" />
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
            </div>
          ) : null}

          <div className="absolute top-4 right-0 w-full p-4 z-10 flex items-center justify-end pointer-events-none">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-3 border border-gray-100 pointer-events-auto text-[11px] text-gray-500 space-y-1">
              <p className="mb-1 font-bold text-primary">Navigation:</p>
              <p>• Scroll to zoom</p>
              <p>• Drag to pan</p>
              <p>• Click nodes to toggle</p>
            </div>
          </div>

          <style>{DEPARTMENT_HIERARCHY_LINK_STYLES}</style>

          {selectedTree && selectedTree.length > 0 ? (
            <div id="tree-container" className="w-full h-full" style={{ width: "100%", height: dimensions.height || "600px" }}>
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
                <p className="text-gray-400 text-lg font-medium">No departments found</p>
                <p className="text-gray-300 text-sm mt-2">Create a new department to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CreateInternalStructureModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialParentId={selectedParentId ?? undefined}
          forcedGovernmentStructureId={governmentStructureId}
        />
      )}
    </>
  );
};

export default InternalHierarchyD3Tree;