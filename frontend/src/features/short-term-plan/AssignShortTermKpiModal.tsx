"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AssignmentTargetSelector,
  AssignmentTargetSelection,
  createEmptySelection,
  getSelectionId,
} from "@/components/assignment-selectors";
import {
  useAssignShortTermKpiMutation,
  useUpdateShortTermAssignmentMutation,
} from "@/redux/api/shortTermPlanApi";
import type {
  ShortTermEvaluationMode,
  ShortTermFrequency,
  ShortTermKpi,
} from "@/redux/types/shortTermPlan";
import { Building2, Filter, GitBranch } from "lucide-react";
import { toast } from "sonner";

interface AssignShortTermKpiModalProps {
  kpi: ShortTermKpi | null;
  planId: string;
  defaultSectorId?: string;
  sectors: Array<{ government_structure_id: string; name: string }>;
  departments: Array<{ internal_structure_id: string; name: string; government_structure_id: string; level?: number; parent_id?: string | null }>;
  users: Array<{ user_id: string; full_name: string; email: string; government_structure_id?: string | null; internal_structure_id?: string | null }>;
  onClose: () => void;
}

export function AssignShortTermKpiModal({
  kpi,
  planId,
  defaultSectorId = "",
  sectors,
  departments,
  users,
  onClose,
}: AssignShortTermKpiModalProps) {
  const [assignKpi, { isLoading: isAssigning }] = useAssignShortTermKpiMutation();
  const [updateAssignment, { isLoading: isUpdatingAssignment }] = useUpdateShortTermAssignmentMutation();

  const existingAssignment = kpi?.assignments?.[0] || null;
  const isUpdating = Boolean(existingAssignment);
  const isSaving = isAssigning || isUpdatingAssignment;

  const [selectedSectorId, setSelectedSectorId] = useState<string>(defaultSectorId);
  const [userDeptFilterId, setUserDeptFilterId] = useState<string>("all");
  const [targetSelection, setTargetSelection] = useState<AssignmentTargetSelection>(
    createEmptySelection("department")
  );
  const [allocatedTarget, setAllocatedTarget] = useState<string>("");
  const [evalModeOverride, setEvalModeOverride] = useState<"" | ShortTermEvaluationMode>("");
  const [freqOverride, setFreqOverride] = useState<"" | ShortTermFrequency>("");

  useEffect(() => {
    if (!kpi) return;
    if (existingAssignment) {
      const initSector =
        existingAssignment.government_structure_id ||
        defaultSectorId ||
        sectors[0]?.government_structure_id ||
        "";
      setSelectedSectorId(initSector);
      if (existingAssignment.assigned_user_id) {
        setUserDeptFilterId(existingAssignment.internal_structure_id || "all");
        setTargetSelection({
          ...createEmptySelection("user"),
          userId: existingAssignment.assigned_user_id,
        });
      } else if (existingAssignment.internal_structure_id) {
        setUserDeptFilterId(existingAssignment.internal_structure_id);
        setTargetSelection({
          ...createEmptySelection("department"),
          internalStructureId: existingAssignment.internal_structure_id,
        });
      } else {
        setUserDeptFilterId("all");
        setTargetSelection(createEmptySelection("department"));
      }
      const targetVal = existingAssignment.allocated_target ?? kpi.total_target;
      setAllocatedTarget(targetVal !== null && targetVal !== undefined ? String(targetVal) : "");
      setEvalModeOverride(existingAssignment.evaluation_mode_override || "");
      setFreqOverride(existingAssignment.reporting_frequency_override || "");
    } else {
      const initSector = defaultSectorId || sectors[0]?.government_structure_id || "";
      setSelectedSectorId(initSector);
      setUserDeptFilterId("all");
      setTargetSelection(createEmptySelection("department"));
      setAllocatedTarget(kpi.total_target !== null && kpi.total_target !== undefined ? String(kpi.total_target) : "");
      setEvalModeOverride("");
      setFreqOverride("");
    }
  }, [kpi, existingAssignment, defaultSectorId, sectors]);

  // Departments scoped to selected Sector
  const sectorDepartments = useMemo(() => {
    if (!selectedSectorId) return [];
    return departments
      .filter((d) => d.government_structure_id === selectedSectorId)
      .map((d) => ({
        internal_structure_id: d.internal_structure_id,
        name: d.name,
        level: d.level ?? 1,
        government_structure_id: d.government_structure_id,
        parent_id: d.parent_id ?? null,
      }));
  }, [departments, selectedSectorId]);

  // Users scoped strictly to selected Sector -> selected Department (when department is selected)
  const scopedUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (selectedSectorId && u.government_structure_id && u.government_structure_id !== selectedSectorId) {
          return false;
        }
        if (userDeptFilterId !== "all" && u.internal_structure_id !== userDeptFilterId) {
          return false;
        }
        return true;
      })
      .map((u) => ({
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        government_structure_id: u.government_structure_id ?? null,
        internal_structure_id: u.internal_structure_id ?? null,
      }));
  }, [users, selectedSectorId, userDeptFilterId]);

  const handleSectorChange = (sectorId: string) => {
    setSelectedSectorId(sectorId);
    setUserDeptFilterId("all");
    setTargetSelection(createEmptySelection(targetSelection.type));
  };

  const handleUserDeptFilterChange = (deptId: string) => {
    setUserDeptFilterId(deptId);
    if (targetSelection.type === "user") {
      setTargetSelection(createEmptySelection("user"));
    }
  };

  const handleTargetChange = (next: AssignmentTargetSelection) => {
    setTargetSelection(next);
    // If user switches to User tab after picking a Department, carry over the department filter!
    if (next.type === "user" && targetSelection.type === "department" && targetSelection.internalStructureId) {
      setUserDeptFilterId(targetSelection.internalStructureId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpi) return;
    if (!selectedSectorId) {
      toast.error("Please select a Sector first");
      return;
    }

    const selectedId = getSelectionId(targetSelection);
    if (!selectedId) {
      toast.error("Please select a Department or a specific User");
      return;
    }

    const isUser = targetSelection.type === "user";
    const selectedDeptId = isUser
      ? (userDeptFilterId !== "all"
          ? userDeptFilterId
          : users.find((u) => u.user_id === selectedId)?.internal_structure_id || null)
      : selectedId;

    const selectedDeptObj = departments.find((d) => d.internal_structure_id === selectedDeptId);
    const selectedUserObj = isUser ? users.find((u) => u.user_id === selectedId) : null;

    const payload = {
      government_structure_id: selectedSectorId,
      internal_structure_id: selectedDeptId,
      assigned_user_id: isUser ? selectedId : null,
      assignee_label: isUser
        ? selectedUserObj?.full_name || ""
        : selectedDeptObj?.name || "",
      allocated_target: allocatedTarget !== "" ? Number(allocatedTarget) : null,
      evaluation_mode_override: evalModeOverride || null,
      reporting_frequency_override: freqOverride || null,
    };

    try {
      if (existingAssignment) {
        await updateAssignment({
          assignmentId: existingAssignment.assignment_id,
          planId,
          ...payload,
        }).unwrap();
        toast.success(
          isUser
            ? `Assignment updated to ${selectedUserObj?.full_name || "user"}`
            : `Assignment updated to department ${selectedDeptObj?.name || ""}`
        );
      } else {
        await assignKpi({
          kpiId: kpi.short_term_kpi_id,
          planId,
          ...payload,
        }).unwrap();
        toast.success(
          isUser
            ? `KPI assigned specifically to ${selectedUserObj?.full_name || "user"}`
            : `KPI assigned to department ${selectedDeptObj?.name || ""}`
        );
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || (isUpdating ? "Failed to update assignment" : "Failed to assign KPI"));
    }
  };

  return (
    <Dialog open={!!kpi} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-emerald-600" />
            <span>
              {isUpdating ? "Update Assignment" : "Assign Short-Term KPI"} {kpi ? `(${kpi.code})` : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Sector Selection */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Step 1 — Target Sector *
            </Label>
            <Select value={selectedSectorId} onValueChange={handleSectorChange}>
              <SelectTrigger className="bg-white dark:bg-slate-900">
                <SelectValue placeholder="Select Sector" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Department / User Cascaded Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Step 2 — Assign to Department or Specific User *
              </Label>
              <span className="text-[11px] text-slate-500">
                {targetSelection.type === "department"
                  ? "Any user in the selected department can report"
                  : "Only the selected user can report"}
              </span>
            </div>

            {targetSelection.type === "user" && (
              <div className="flex items-center gap-2 rounded-md border bg-slate-50 dark:bg-slate-900 p-2">
                <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-600 shrink-0">Filter by Department:</span>
                <Select value={userDeptFilterId} onValueChange={handleUserDeptFilterChange}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Department to filter users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sector Departments ({sectorDepartments.length})</SelectItem>
                    {sectorDepartments.map((d) => (
                      <SelectItem key={d.internal_structure_id} value={d.internal_structure_id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <AssignmentTargetSelector
              users={scopedUsers}
              departments={sectorDepartments}
              roles={[]}
              permissionGroups={[]}
              allowDepartment={true}
              allowUser={true}
              allowRole={false}
              value={targetSelection}
              onChange={handleTargetChange}
            />
          </div>

          {/* Step 3: Target & Evaluation Overrides */}
          <div className="grid grid-cols-3 gap-3 pt-1 border-t">
            <div>
              <Label className="text-xs">Allocated Target</Label>
              <Input
                type="number"
                step="any"
                value={allocatedTarget}
                onChange={(e) => setAllocatedTarget(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Eval Mode</Label>
              <Select
                value={evalModeOverride || "__default__"}
                onValueChange={(v) =>
                  setEvalModeOverride(v === "__default__" ? "" : (v as ShortTermEvaluationMode))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Use KPI Default</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="frequency">Frequency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select
                value={freqOverride || "__default__"}
                onValueChange={(v) =>
                  setFreqOverride(v === "__default__" ? "" : (v as ShortTermFrequency))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">Use KPI Default</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? isUpdating
                  ? "Updating..."
                  : "Assigning..."
                : isUpdating
                  ? "Update Assignment"
                  : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
