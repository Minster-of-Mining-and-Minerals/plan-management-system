"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Target,
  Layers,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import { matchesSearchQuery } from "@/utils/tableUtils";

import {
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useSaveTargetHierarchyMutation,
  useGetProductionItemsQuery,
  useGetFrequenciesQuery,
  useGetTargetPeriodsQuery,
} from "@/redux/api/productionApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";
import type { CompanyProductionAssignment, TargetPeriodNode } from "@/redux/types/production";

export function CompanyProductionAssignmentsView() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [companyFilter, setCompanyFilter] = useState("all");

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedFrequencyId, setSelectedFrequencyId] = useState("");
  const [allocationDepth, setAllocationDepth] = useState<string>("quarterly");
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [effectiveTo, setEffectiveTo] = useState(`${new Date().getFullYear()}-12-31`);
  const [requiresReview, setRequiresReview] = useState(false);
  const [notes, setNotes] = useState("");
  const [assignError, setAssignError] = useState("");

  // Target Hierarchy Configuration Modal
  const [targetModalAssignment, setTargetModalAssignment] = useState<CompanyProductionAssignment | null>(null);
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [annualQuantity, setAnnualQuantity] = useState<string>("");
  const [childQuantities, setChildQuantities] = useState<Record<string, string>>({});
  const [revisionReason, setRevisionReason] = useState("");
  const [targetError, setTargetError] = useState("");

  const { data: assignments = [], isLoading, isError, refetch } = useGetAssignmentsQuery();
  const { data: companies = [] } = useGetCompaniesQuery();
  const { data: items = [] } = useGetProductionItemsQuery();
  const { data: frequencies = [] } = useGetFrequenciesQuery();

  const [createAssignment, { isLoading: isCreatingAssignment }] = useCreateAssignmentMutation();
  const [saveTargetHierarchy, { isLoading: isSavingTargets }] = useSaveTargetHierarchyMutation();

  // Dynamic target period generator query for target hierarchy modal
  const { data: generatedPeriods = [] } = useGetTargetPeriodsQuery(
    {
      year: targetYear,
      allocationDepth: targetModalAssignment ? targetModalAssignment.target_allocation_depth : "quarterly",
    },
    { skip: !targetModalAssignment }
  );

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const companyName = a.company?.name || "";
      const itemName = a.productionItem?.name || "";
      const matchesSearch = matchesSearchQuery(searchQuery, [companyName, itemName, a.company?.code || ""]);
      const matchesCompany = companyFilter === "all" || a.company_id === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [assignments, searchQuery, companyFilter]);

  const handleOpenAssignModal = () => {
    setSelectedCompanyId(companies[0]?.company_id || "");
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

    if (!selectedCompanyId || !selectedItemId || !selectedFrequencyId || !effectiveFrom) {
      setAssignError("Please fill out all required fields.");
      return;
    }

    try {
      await createAssignment({
        company_id: selectedCompanyId,
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

  const calculatedChildSum = useMemo(() => {
    let sum = 0;
    Object.values(childQuantities).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num)) sum += num;
    });
    return sum;
  }, [childQuantities]);

  const parentQuantityNum = parseFloat(annualQuantity) || 0;
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

  const columns: ColumnDef<CompanyProductionAssignment>[] = [
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            {row.original.company?.name}
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {row.original.company?.code}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "productionItem",
      header: "Production Item",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">
            {row.original.productionItem?.name}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Unit: {row.original.defaultReportingUnit?.name || row.original.productionItem?.baseUnit?.name || "Standard"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "reportingFrequency",
      header: "Reporting Frequency",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize bg-muted/40 text-xs">
          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
          {row.original.reportingFrequency?.name || "Daily"}
        </Badge>
      ),
    },
    {
      accessorKey: "target_allocation_depth",
      header: "Target Allocation Depth",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 font-medium capitalize text-teal-700 dark:text-teal-300 text-xs">
          <Layers className="h-3 w-3" />
          {row.original.target_allocation_depth?.replace("_", " ")}
        </span>
      ),
    },
    {
      id: "currentPublishedTarget",
      header: "Current Published Target",
      cell: ({ row }) => {
        const rootTarget = row.original.targets?.find((t) => t.target_period_type === "year");
        const childTargets = row.original.targets?.filter((t) => t.target_period_type !== "year") || [];
        if (rootTarget) {
          return (
            <div>
              <div className="font-bold text-foreground text-xs">
                {Number(rootTarget.target_quantity).toLocaleString()}{" "}
                {rootTarget.unit?.symbol || "units"}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span>v{rootTarget.version_number}</span>
                {childTargets.length > 0 && <span>• {childTargets.length} Sub-periods</span>}
              </div>
            </div>
          );
        }
        return (
          <span className="text-amber-600 dark:text-amber-400 italic flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Target Not Configured
          </span>
        );
      },
    },
    {
      id: "effectiveDates",
      header: "Effective Dates",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-[11px]">
          {row.original.effective_from} → {row.original.effective_to || "Indefinite"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rootTarget = row.original.targets?.find((t) => t.target_period_type === "year");
        return (
          <div className="text-right">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenTargetModal(row.original)}
              className="h-8 text-xs flex items-center gap-1.5 font-medium bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-200"
            >
              <Target className="h-3.5 w-3.5 text-teal-600" />
              {rootTarget ? "Reallocate / Revise" : "Configure Targets"}
            </Button>
          </div>
        );
      },
    },
  ];

  const filters: FilterField[] = [
    ...(companies.length > 0
      ? [
          {
            key: "company",
            label: "Company",
            type: "select" as const,
            placeholder: "All Companies",
            value: companyFilter,
            onChange: setCompanyFilter,
            options: [
              { label: "All Companies", value: "all" },
              ...companies.map((c) => ({
                label: `${c.name} (${c.code})`,
                value: c.company_id,
              })),
            ],
          },
        ]
      : []),
  ];

  const actions: ActionButton[] = [
    {
      label: "Assign Production Item",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: handleOpenAssignModal,
    },
  ];

  return (
    <>
      <TableLayout
        title="Company Production Assignments & Targets"
        description="Assign production items to registered companies and configure flexible target period hierarchies."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={filteredAssignments}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load company production assignments."
          onRetry={refetch}
          resetKey={`${searchQuery}-${companyFilter}`}
        />
      </TableLayout>

      {/* Modal 1: Assign Production Item */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold mb-1">Assign Production Item to Company</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Authorize a company to report production and establish their reporting schedule.
            </p>

            {assignError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {assignError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium mb-1">Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Production Item *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {items.map((i) => (
                    <option key={i.production_item_id} value={i.production_item_id}>
                      {i.name} ({i.code}) — Base: {i.baseUnit?.symbol || i.baseUnit?.name}
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
                  id="requiresReviewCheck"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="requiresReviewCheck" className="text-xs cursor-pointer">
                  Require Federal Review & Approval for Daily Reports
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Optional assignment instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  disabled={isCreatingAssignment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={isCreatingAssignment}
                >
                  {isCreatingAssignment ? "Assigning..." : "Assign Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Configure / Revise Target Hierarchy */}
      {targetModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-2xl p-6 text-foreground animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold">Configure Target Allocation Hierarchy</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Company: <span className="font-semibold text-foreground">{targetModalAssignment.company?.name}</span> • Item:{" "}
                  <span className="font-semibold text-foreground">{targetModalAssignment.productionItem?.name}</span>
                </p>
              </div>
              <Badge variant="outline" className="capitalize bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                Depth: {targetModalAssignment.target_allocation_depth.replace("_", " ")}
              </Badge>
            </div>

            {targetError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {targetError}
              </div>
            )}

            <form onSubmit={handleSaveTargets} className="space-y-4 text-sm mt-3">
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
                  <label className="block text-xs font-medium mb-1">Target Measurement Unit</label>
                  <div className="h-8 px-3 rounded-md bg-card border flex items-center text-xs font-medium text-foreground">
                    {targetModalAssignment.defaultReportingUnit?.name || targetModalAssignment.productionItem?.baseUnit?.name}{" "}
                    ({targetModalAssignment.defaultReportingUnit?.symbol || targetModalAssignment.productionItem?.baseUnit?.symbol})
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
                <label className="block text-xs font-bold text-teal-950 dark:text-teal-200 mb-1">
                  Approved Annual Target ({targetYear}) *
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="e.g., 12000"
                    value={annualQuantity}
                    onChange={(e) => setAnnualQuantity(e.target.value)}
                    className="font-bold text-base bg-card"
                  />
                  <span className="font-semibold text-xs text-muted-foreground whitespace-nowrap">
                    {targetModalAssignment.defaultReportingUnit?.symbol || targetModalAssignment.productionItem?.baseUnit?.symbol}
                  </span>
                </div>
              </div>

              {generatedPeriods[0]?.children && generatedPeriods[0].children.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Sub-Period Target Allocations ({targetModalAssignment.target_allocation_depth.replace("_", " ")})
                    </label>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Allocated: </span>
                      <span className={`font-mono font-bold ${isOverAllocated ? "text-destructive" : "text-teal-600"}`}>
                        {calculatedChildSum.toLocaleString()} / {parentQuantityNum.toLocaleString()}
                      </span>
                      {unallocatedRemainder > 0 && (
                        <span className="text-muted-foreground text-[11px] ml-1.5">
                          ({unallocatedRemainder.toLocaleString()} unallocated)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto p-2 border rounded-lg bg-card">
                    {generatedPeriods[0].children.map((child) => (
                      <div key={child.period_label} className="p-2.5 rounded-md border bg-muted/20">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs">{child.period_label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {child.period_start_date.slice(5)} to {child.period_end_date.slice(5)}
                          </span>
                        </div>
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
                <label className="block text-xs font-medium mb-1">
                  Revision Reason / Audit Note
                </label>
                <Input
                  placeholder="e.g., Initial approved target configuration, or Mid-year expansion adjustment"
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
                  {isSavingTargets ? "Publishing Targets..." : "Publish Approved Targets"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
