"use client";

import React, { useState, useMemo } from "react";
import {
  useGetRegionalPlanVersionsQuery,
  useGetRegionalPlanHierarchyQuery,
  useGetRegionalPlanConfigQuery,
} from "@/redux/api/regionalPlanApi";
import {
  useCreateRegionalPotentialMappingMutation,
  useGetNationalUnitsCatalogQuery,
} from "@/redux/api/nationalReportingApi";
import {
  NationalReportingAssignment,
  RegionalRequirementMapping,
} from "@/redux/types/nationalReporting";
import { RegionalPlanNode } from "@/redux/types/regionalPlan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  Info,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assignment: NationalReportingAssignment;
  regionId: string;
}

export function RegionalMappingModal({
  isOpen,
  onClose,
  assignment,
  regionId,
}: Props) {
  const req = assignment.requirement;
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    assignment.activeMapping?.regional_plan_node_id || ""
  );
  const [notes, setNotes] = useState<string>(assignment.activeMapping?.notes || "");

  // 1. Fetch available plan versions for this region
  const { data: planVersions = [] } = useGetRegionalPlanVersionsQuery(
    { region_id: regionId },
    { skip: !isOpen || !regionId }
  );

  // Default to first active or master version if not selected
  const activeVersionId = useMemo(() => {
    if (selectedVersionId) return selectedVersionId;
    if (planVersions.length > 0) {
      const active = planVersions.find((v) => v.status === "active") || planVersions[0];
      return active.regional_plan_version_id;
    }
    return "";
  }, [selectedVersionId, planVersions]);

  // 2. Fetch hierarchy nodes for selected version
  const { data: hierarchyData, isLoading: isLoadingHierarchy } =
    useGetRegionalPlanHierarchyQuery(
      { id: activeVersionId, region_id: regionId },
      { skip: !isOpen || !activeVersionId }
    );

  const nodes: RegionalPlanNode[] = hierarchyData?.nodes || [];

  // Find selected node details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !nodes.length) return null;
    return nodes.find((n) => n.regional_plan_node_id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // Fetch planning configuration to dereference custom target unit IDs
  const { data: planConfig } = useGetRegionalPlanConfigQuery(
    { region_id: regionId },
    { skip: !isOpen || !regionId }
  );

  const resolvedUnitLabel = useMemo(() => {
    if (!selectedNode?.target_unit) return "count";
    const raw = String(selectedNode.target_unit).trim();
    if (!raw) return "count";

    if (planConfig?.target_units && Array.isArray(planConfig.target_units)) {
      for (const item of planConfig.target_units) {
        if (typeof item === "string" && item.toLowerCase() === raw.toLowerCase()) {
          return item;
        }
        if (typeof item === "object" && item) {
          const uItem = item as { id?: string; label?: string; symbol?: string };
          if (
            (uItem.id && uItem.id.toLowerCase() === raw.toLowerCase()) ||
            (uItem.label && uItem.label.toLowerCase() === raw.toLowerCase()) ||
            (uItem.symbol && uItem.symbol.toLowerCase() === raw.toLowerCase())
          ) {
            return uItem.label || uItem.symbol || uItem.id || raw;
          }
        }
      }
    }
    return raw;
  }, [selectedNode, planConfig]);

  // Unit compatibility check
  const localUnit = resolvedUnitLabel.trim().toLowerCase();
  const expectedUnit = req?.expected_unit?.trim().toLowerCase() || "kg";
  const unitCategory = req?.unit_category || "mass";

  const { data: unitsCatalog = {} } = useGetNationalUnitsCatalogQuery();

  const isCompatible = useMemo(() => {
    if (!selectedNode) return true; // not chosen yet
    if (!localUnit || !expectedUnit) return true;
    if (localUnit === expectedUnit) return true;

    // Check singular/plural stem equivalence
    const stemA = localUnit.replace(/(ies|es|s)$/, (m) => (m === "ies" ? "y" : ""));
    const stemB = expectedUnit.replace(/(ies|es|s)$/, (m) => (m === "ies" ? "y" : ""));
    if (stemA === stemB) return true;

    const allowedInCat = unitsCatalog[unitCategory]?.units || [];
    const localNorm = localUnit.replace(/[\s\-_]+/g, "_");
    const expectedNorm = expectedUnit.replace(/[\s\-_]+/g, "_");

    if (allowedInCat.includes(localNorm) && allowedInCat.includes(expectedNorm)) {
      return true;
    }

    for (const [, catData] of Object.entries(unitsCatalog)) {
      if (catData.units?.includes(localNorm) && catData.units?.includes(expectedNorm)) {
        return true;
      }
    }

    return false;
  }, [selectedNode, localUnit, expectedUnit, unitCategory, unitsCatalog]);

  const [createPotentialMapping, { isLoading: isSaving }] =
    useCreateRegionalPotentialMappingMutation();

  const handleSave = async () => {
    if (!selectedNodeId) {
      toast.error("Please select a regional plan node to map");
      return;
    }
    if (!isCompatible) {
      toast.error("Cannot save: Selected node has mathematically incompatible measurement units");
      return;
    }

    try {
      await createPotentialMapping({
        regionId,
        assignmentId: assignment.assignment_id,
        regionalPlanNodeId: selectedNodeId,
        regionalPlanVersionId: activeVersionId || null,
        notes,
      }).unwrap();
      toast.success("Potential mapping saved successfully (Stage A)");
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save mapping");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Layers className="h-5 w-5 text-emerald-600" />
            Stage A: Prepare Regional Plan Mapping
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Requirement Context Banner */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                {req?.code}
              </span>
              <Badge variant="outline" className="text-xs capitalize bg-white dark:bg-slate-900">
                {req?.category?.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {req?.title}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3 pt-1">
              <span>
                Required Unit: <strong className="text-emerald-700 dark:text-emerald-300 font-mono">{req?.expected_unit}</strong> ({unitCategory})
              </span>
              <span>•</span>
              <span>
                Frequency: <strong className="capitalize">{req?.frequency}</strong>
              </span>
            </div>
          </div>

          {/* Plan Version Selector */}
          <div>
            <Label htmlFor="version-sel">Select Regional Plan Version</Label>
            <Select
              value={activeVersionId}
              onValueChange={(val) => {
                setSelectedVersionId(val);
                setSelectedNodeId("");
              }}
            >
              <SelectTrigger id="version-sel" className="mt-1">
                <SelectValue placeholder="Choose Plan Version" />
              </SelectTrigger>
              <SelectContent>
                {planVersions.map((v) => (
                  <SelectItem
                    key={v.regional_plan_version_id}
                    value={v.regional_plan_version_id}
                  >
                    {v.draft_name} ({v.version_kind}) {v.planning_year ? `• Year ${v.planning_year}` : ""} {v.status === "active" ? "• Active" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Hierarchy Node Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="flex items-center gap-1.5">
                <FolderTree className="h-4 w-4 text-emerald-600" />
                Select Regional Plan Hierarchy Node (Any Level) *
              </Label>
              <span className="text-xs text-slate-400">
                {nodes.length} nodes available
              </span>
            </div>

            {isLoadingHierarchy ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg">
                Loading regional hierarchy nodes...
              </div>
            ) : nodes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950">
                No plan nodes found in the selected plan version.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950">
                {nodes.map((node) => {
                  const isSelected = selectedNodeId === node.regional_plan_node_id;
                  const indentLevel = Math.max(0, (node.level || 1) - 1);

                  return (
                    <div
                      key={node.regional_plan_node_id}
                      onClick={() => setSelectedNodeId(node.regional_plan_node_id)}
                      style={{ paddingLeft: `${indentLevel * 18 + 12}px` }}
                      className={`py-2.5 pr-3 cursor-pointer transition-colors text-xs flex items-center justify-between ${
                        isSelected
                          ? "bg-emerald-100/70 dark:bg-emerald-950/70 font-semibold text-emerald-900 dark:text-emerald-100 border-l-4 border-emerald-600"
                          : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] text-slate-400 uppercase">
                          L{node.level || 1}
                        </span>
                        <span className="truncate">{node.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {node.target_unit && (
                          <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[10px]">
                            {node.target_unit}
                          </span>
                        )}
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unit Compatibility Verification Banner */}
          {selectedNode && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                isCompatible
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {isCompatible ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Unit Compatibility Confirmed
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Incompatible Measurement Units
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1 font-mono">
                <span>
                  Regional Unit: <strong>{localUnit}</strong>
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>
                  National Unit: <strong>{expectedUnit}</strong>
                </span>
              </div>

              {!isCompatible ? (
                <p className="text-rose-700 dark:text-rose-300 pt-0.5">
                  The regional node unit '{localUnit}' cannot be converted to national required unit '{expectedUnit}' because they belong to incompatible measurement categories. Please select a regional node that tracks {unitCategory}.
                </p>
              ) : (
                <p className="text-emerald-700 dark:text-emerald-400 pt-0.5">
                  Automatic decimal-safe conversion will be applied when validated reports are transmitted to the National Reporting Gateway.
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="map-notes">Mapping Notes / Directives (Optional)</Label>
            <Textarea
              id="map-notes"
              placeholder="Regional justification or aggregation details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSaving || !selectedNodeId || !isCompatible}
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? "Saving..." : "Save Potential Mapping (Stage A)"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

