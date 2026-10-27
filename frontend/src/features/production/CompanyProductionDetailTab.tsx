"use client";

import { useState } from "react";
import {
  Scale,
  Plus,
  Target,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useSaveTargetHierarchyMutation,
  useGetProductionItemsQuery,
  useGetFrequenciesQuery,
  useGetTargetPeriodsQuery,
} from "@/redux/api/productionApi";
import type { CompanyProductionAssignment, TargetPeriodNode } from "@/redux/types/production";

export function CompanyProductionDetailTab({ companyId }: { companyId: string }) {
  const { data: assignments = [], isLoading, refetch } = useGetAssignmentsQuery({ company_id: companyId });
  const { data: items = [] } = useGetProductionItemsQuery();
  const { data: frequencies = [] } = useGetFrequenciesQuery();

  const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateAssignmentMutation();
  const [saveTargetHierarchy, { isLoading: isSavingTargets }] = useSaveTargetHierarchyMutation();

  // Edit Assignment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CompanyProductionAssignment | null>(null);
  const [editFrequencyId, setEditFrequencyId] = useState("");
  const [editDefaultUnitId, setEditDefaultUnitId] = useState("");
  const [editEffectiveFrom, setEditEffectiveFrom] = useState("");
  const [editEffectiveTo, setEditEffectiveTo] = useState("");
  const [editRequiresReview, setEditRequiresReview] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState("");

  // New Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedFrequencyId, setSelectedFrequencyId] = useState("");
  const [allocationDepth, setAllocationDepth] = useState<string>("quarterly");
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [effectiveTo, setEffectiveTo] = useState(`${new Date().getFullYear()}-12-31`);
  const [requiresReview, setRequiresReview] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignError, setAssignError] = useState("");

  // Target Hierarchy Modal State
  const [targetModalAssignment, setTargetModalAssignment] = useState<CompanyProductionAssignment | null>(null);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [annualQuantity, setAnnualQuantity] = useState<string>("");
  const [childQuantities, setChildQuantities] = useState<Record<string, string>>({});
  const [revisionReason, setRevisionReason] = useState("");
  const [targetError, setTargetError] = useState("");

  const { data: generatedPeriods = [] } = useGetTargetPeriodsQuery(
    {
      year: targetYear,
      allocationDepth: targetModalAssignment ? targetModalAssignment.target_allocation_depth : "quarterly",
    },
    { skip: !targetModalAssignment }
  );

  const handleOpenAssignModal = () => {
    setSelectedItemId(items[0]?.production_item_id || "");
    const daily = frequencies.find((f) => f.code === "daily") || frequencies[0];
    setSelectedFrequencyId(daily?.frequency_id || "");
    setAllocationDepth("quarterly");
    setEffectiveFrom(`${new Date().getFullYear()}-01-01`);
    setEffectiveTo(`${new Date().getFullYear()}-12-31`);
    setRequiresReview(false);
    setNotes("");
    setAssignError("");
    setIsAssignModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");

    if (!selectedItemId || !selectedFrequencyId || !effectiveFrom) {
      setAssignError("Item, Frequency, and Effective date are required.");
      return;
    }

    try {
      await createAssignment({
        company_id: companyId,
        production_item_id: selectedItemId,
        reporting_frequency_id: selectedFrequencyId,
        target_allocation_depth: allocationDepth as any,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        requires_review: requiresReview,
        notes: notes ? notes.trim() : null,
      }).unwrap();

      setIsAssignModalOpen(false);
      refetch();
    } catch (err: any) {
      setAssignError(err.data?.message || err.message || "Failed to create assignment.");
    }
  };

  const handleOpenEditModal = (assignment: CompanyProductionAssignment) => {
    setEditingAssignment(assignment);
    setEditFrequencyId(assignment.reporting_frequency_id || "");
    setEditDefaultUnitId(assignment.default_reporting_unit_id || "");
    setEditEffectiveFrom(assignment.effective_from || "");
    setEditEffectiveTo(assignment.effective_to || "");
    setEditRequiresReview(!!assignment.requires_review);
    setEditNotes(assignment.notes || "");
    setEditIsActive(assignment.is_active !== false);
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!editingAssignment) return;

    if (!editFrequencyId || !editEffectiveFrom) {
      setEditError("Frequency and effective start date are required.");
      return;
    }

    if (editEffectiveTo && new Date(editEffectiveTo) < new Date(editEffectiveFrom)) {
      setEditError("Effective end date cannot be earlier than start date.");
      return;
    }

    try {
      await updateAssignment({
        id: editingAssignment.assignment_id,
        data: {
          reporting_frequency_id: editFrequencyId,
          default_reporting_unit_id: editDefaultUnitId || null,
          effective_from: editEffectiveFrom,
          effective_to: editEffectiveTo || null,
          requires_review: editRequiresReview,
          notes: editNotes ? editNotes.trim() : null,
          is_active: editIsActive,
        },
      }).unwrap();

      setIsEditModalOpen(false);
      setEditingAssignment(null);
      refetch();
    } catch (err: any) {
      setEditError(err.data?.message || err.message || "Failed to update assignment.");
    }
  };

  const handleOpenTargetModal = (assignment: CompanyProductionAssignment) => {
    setTargetModalAssignment(assignment);
    setTargetYear(new Date().getFullYear());
    setTargetError("");
    setRevisionReason("");

    const rootTarget = assignment.targets?.find((t) => t.target_period_type === "year");
    if (rootTarget) {
      setAnnualQuantity(String(rootTarget.target_quantity));
      const childMap: Record<string, string> = {};
      assignment.targets?.forEach((t) => {
        if (t.target_period_type !== "year") {
          childMap[t.period_label] = String(t.target_quantity);
        }
      });
      setChildQuantities(childMap);
    } else {
      setAnnualQuantity("");
      setChildQuantities({});
    }
  };

  const parentQuantityNum = parseFloat(annualQuantity) || 0;
  let calculatedChildSum = 0;
  Object.values(childQuantities).forEach((val) => {
    const num = parseFloat(val);
    if (!isNaN(num)) calculatedChildSum += num;
  });
  const unallocatedRemainder = parentQuantityNum - calculatedChildSum;
  const isOverAllocated = calculatedChildSum > parentQuantityNum + 0.0001;

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setTargetError("");

    if (!targetModalAssignment) return;
    if (!parentQuantityNum || parentQuantityNum <= 0) {
      setTargetError("Annual Target quantity must be a positive number.");
      return;
    }

    if (isOverAllocated) {
      setTargetError(
        `Sum of child targets (${calculatedChildSum}) exceeds Annual Target (${parentQuantityNum}).`
      );
      return;
    }

    const rootPeriod = generatedPeriods[0] || {
      target_period_type: "year",
      period_label: String(targetYear),
      period_start_date: `${targetYear}-01-01`,
      period_end_date: `${targetYear}-12-31`,
      children: [],
    };

    const childrenPayload: TargetPeriodNode[] = (rootPeriod.children || []).map((cp) => ({
      target_period_type: cp.target_period_type,
      period_label: cp.period_label,
      period_start_date: cp.period_start_date,
      period_end_date: cp.period_end_date,
      target_quantity: parseFloat(childQuantities[cp.period_label]) || 0,
      unit_id: targetModalAssignment.default_reporting_unit_id || targetModalAssignment.productionItem?.base_unit_id,
    }));

    const targetsPayload: TargetPeriodNode[] = [
      {
        target_period_type: "year",
        period_label: String(targetYear),
        period_start_date: rootPeriod.period_start_date,
        period_end_date: rootPeriod.period_end_date,
        target_quantity: parentQuantityNum,
        unit_id: targetModalAssignment.default_reporting_unit_id || targetModalAssignment.productionItem?.base_unit_id,
        children: childrenPayload,
      },
    ];

    try {
      await saveTargetHierarchy({
        id: targetModalAssignment.assignment_id,
        targets: targetsPayload,
        revision_reason: revisionReason.trim() || undefined,
      }).unwrap();

      setTargetModalAssignment(null);
      refetch();
    } catch (err: any) {
      setTargetError(err.data?.message || err.message || "Failed to save targets.");
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Production Reporting Configuration</h2>
          <p className="text-xs text-muted-foreground">
            Manage commodities assigned to this company, reporting intervals, and approved target structures.
          </p>
        </div>
        <Button
          onClick={handleOpenAssignModal}
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Assign Production Item
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center bg-card/40">
          <Scale className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
          <h4 className="font-semibold text-sm">No production items assigned to this company</h4>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Assign an item to begin daily or scheduled production tracking.
          </p>
          <Button onClick={handleOpenAssignModal} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Assign Item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const rootTarget = a.targets?.find((t) => t.target_period_type === "year");
            const childTargets = a.targets?.filter((t) => t.target_period_type !== "year") || [];

            return (
              <div
                key={a.assignment_id}
                className="rounded-xl border bg-card p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      <Scale className="h-4 w-4 text-teal-600" />
                      {a.productionItem?.name}
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {a.productionItem?.code}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize bg-muted/40">
                        {a.reportingFrequency?.name} Reporting
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        Target Allocation: {a.target_allocation_depth.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(a)}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Edit Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTargetModal(a)}
                      className="text-xs flex items-center gap-1.5 font-medium bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-200"
                    >
                      <Target className="h-3.5 w-3.5 text-teal-600" />
                      {rootTarget ? "Reallocate / Revise Targets" : "Configure Targets"}
                    </Button>
                  </div>
                </div>

                {/* Target Summary */}
                <div className="p-3 rounded-lg bg-muted/30 border text-xs">
                  {rootTarget ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-muted-foreground">
                          Annual Target ({rootTarget.period_label}):
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {Number(rootTarget.target_quantity).toLocaleString()}{" "}
                          {rootTarget.unit?.symbol || "units"} (v{rootTarget.version_number})
                        </span>
                      </div>

                      {childTargets.length > 0 && (
                        <div className="pt-2 border-t flex flex-wrap gap-2">
                          {childTargets.map((ct) => (
                            <span
                              key={ct.target_id}
                              className="px-2 py-1 rounded bg-card border text-[11px] font-medium"
                            >
                              <span className="text-muted-foreground mr-1">{ct.period_label}:</span>
                              <span className="font-bold font-mono">
                                {Number(ct.target_quantity).toLocaleString()} {ct.unit?.symbol}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Production target not yet configured for this assignment.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">Assign Production Item</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Configure reporting frequency and target hierarchy depth for this company.
            </p>

            {assignError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {assignError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">Production Item *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {items.map((i) => (
                    <option key={i.production_item_id} value={i.production_item_id}>
                      {i.name} ({i.code}) — Base: {i.baseUnit?.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Reporting Frequency *</label>
                  <select
                    value={selectedFrequencyId}
                    onChange={(e) => setSelectedFrequencyId(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {frequencies.map((f) => (
                      <option key={f.frequency_id} value={f.frequency_id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Target Allocation Depth *</label>
                  <select
                    value={allocationDepth}
                    onChange={(e) => setAllocationDepth(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="annual">Annual Target Only</option>
                    <option value="semi_annual">Annual → Semiannual</option>
                    <option value="quarterly">Annual → Quarterly</option>
                    <option value="monthly">Annual → Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Effective From *</label>
                  <Input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Effective To</label>
                  <Input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tabRequiresReviewCheck"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="tabRequiresReviewCheck" className="text-xs cursor-pointer">
                  Require Federal Review & Approval for Daily Reports
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={isCreating}
                >
                  {isCreating ? "Assigning..." : "Assign Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target Hierarchy Modal */}
      {targetModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">Configure Target Allocation Hierarchy</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Item: <span className="font-semibold text-foreground">{targetModalAssignment.productionItem?.name}</span> •{" "}
              Depth: <span className="font-semibold text-foreground capitalize">{targetModalAssignment.target_allocation_depth.replace("_", " ")}</span>
            </p>

            {targetError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {targetError}
              </div>
            )}

            <form onSubmit={handleSaveTargets} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <label className="block text-xs font-medium mb-1">Target Year</label>
                  <Input
                    type="number"
                    value={targetYear}
                    onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 2026)}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Target Unit</label>
                  <div className="h-8 px-3 rounded-md bg-card border flex items-center text-xs font-medium text-foreground">
                    {targetModalAssignment.defaultReportingUnit?.name || targetModalAssignment.productionItem?.baseUnit?.name}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
                <label className="block text-xs font-bold text-teal-950 dark:text-teal-200 mb-1">
                  Approved Annual Target ({targetYear}) *
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="e.g. 12000"
                  value={annualQuantity}
                  onChange={(e) => setAnnualQuantity(e.target.value)}
                  className="font-bold text-base bg-card"
                />
              </div>

              {generatedPeriods[0]?.children && generatedPeriods[0].children.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Sub-period Allocations:</span>
                    <span className={`font-mono font-bold ${isOverAllocated ? "text-destructive" : "text-teal-600"}`}>
                      {calculatedChildSum.toLocaleString()} / {parentQuantityNum.toLocaleString()}
                      {unallocatedRemainder > 0 && ` (${unallocatedRemainder.toLocaleString()} remainder)`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-card">
                    {generatedPeriods[0].children.map((child) => (
                      <div key={child.period_label} className="p-2 rounded border bg-muted/20 text-xs">
                        <span className="font-bold block mb-1">{child.period_label}</span>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 2000"
                          value={childQuantities[child.period_label] || ""}
                          onChange={(e) =>
                            setChildQuantities((prev) => ({
                              ...prev,
                              [child.period_label]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">Revision Reason</label>
                <Input
                  placeholder="e.g. Annual target approved"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTargetModalAssignment(null)}
                  disabled={isSavingTargets}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingTargets || isOverAllocated}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSavingTargets ? "Publishing..." : "Publish Targets"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {isEditModalOpen && editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">Edit Assignment Settings</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Modify reporting schedule, permitted units, review policies, or status for this assignment.
            </p>

            {editError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateAssignment} className="space-y-4 text-sm">
              <div className="bg-muted/30 p-3 rounded-lg border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Production Item</span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block">
                  {editingAssignment.productionItem?.name} ({editingAssignment.productionItem?.code})
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Base Unit: {editingAssignment.productionItem?.baseUnit?.name || "Standard"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Reporting Frequency *</label>
                  <select
                    value={editFrequencyId}
                    onChange={(e) => setEditFrequencyId(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {frequencies.map((f) => (
                      <option key={f.frequency_id} value={f.frequency_id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Default Reporting Unit</label>
                  <select
                    value={editDefaultUnitId}
                    onChange={(e) => setEditDefaultUnitId(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Standard (Base Unit)</option>
                    {(editingAssignment.productionItem?.supportedUnits || []).map((u: any) => (
                      <option key={u.unit_id} value={u.unit_id}>
                        {u.measurementUnit?.name || u.unit?.name || "Unit"} ({u.measurementUnit?.symbol || u.unit?.symbol || ""})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Effective From *</label>
                  <Input
                    type="date"
                    required
                    value={editEffectiveFrom}
                    onChange={(e) => setEditEffectiveFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Effective To</label>
                  <Input
                    type="date"
                    value={editEffectiveTo}
                    onChange={(e) => setEditEffectiveTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editTabRequiresReviewCheck"
                    checked={editRequiresReview}
                    onChange={(e) => setEditRequiresReview(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="editTabRequiresReviewCheck" className="text-xs cursor-pointer">
                    Require Federal Review & Approval for Reports
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editTabIsActiveCheck"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="editTabIsActiveCheck" className="text-xs cursor-pointer font-medium">
                    Assignment is Active
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional assignment instructions..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Saving Changes..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
