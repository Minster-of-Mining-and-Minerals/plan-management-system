"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Factory,
  FilePlus2,
  Calendar,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CompanyProductionTabsHeader } from "./CompanyProductionTabsHeader";
import {
  useGetAssignmentsQuery,
  useSubmitReportMutation,
} from "@/redux/api/productionApi";
import type { CompanyProductionAssignment, ProductionItemUnit } from "@/redux/types/production";

export function CompanyDailyReportSubmitView({ companyId: propCompanyId }: { companyId?: string }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const companyId = propCompanyId || params?.id || session?.user?.company_id;
  const initialItemId = searchParams.get("item_id") || "";

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: assignments = [], isLoading: isAssignmentsLoading } = useGetAssignmentsQuery(
    { company_id: companyId as string, is_active: true },
    { skip: !companyId }
  );

  const [submitReport, { isLoading: isSubmitting }] = useSubmitReportMutation();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [quantity, setQuantity] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Select initial assignment based on query param or first assignment
  useEffect(() => {
    if (assignments.length > 0) {
      if (initialItemId) {
        const matching = assignments.find((a) => a.production_item_id === initialItemId);
        if (matching) {
          setSelectedAssignmentId(matching.assignment_id);
          return;
        }
      }
      if (!selectedAssignmentId) {
        setSelectedAssignmentId(assignments[0].assignment_id);
      }
    }
  }, [assignments, initialItemId, selectedAssignmentId]);

  // Current selected assignment
  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.assignment_id === selectedAssignmentId) || null;
  }, [assignments, selectedAssignmentId]);

  // Permitted units for this assignment's production item
  const supportedUnits: ProductionItemUnit[] = useMemo(() => {
    if (!selectedAssignment || !selectedAssignment.productionItem) return [];
    return selectedAssignment.productionItem.supportedUnits || (selectedAssignment.productionItem as any).supported_units || [];
  }, [selectedAssignment]);

  // Set default unit when assignment changes
  useEffect(() => {
    if (selectedAssignment) {
      if (selectedAssignment.default_reporting_unit_id) {
        setUnitId(selectedAssignment.default_reporting_unit_id);
      } else if (supportedUnits.length > 0) {
        setUnitId(supportedUnits[0].unit_id);
      }
    }
  }, [selectedAssignment, supportedUnits]);

  // Selected Unit details
  const selectedUnit = useMemo(() => {
    return supportedUnits.find((u) => u.unit_id === unitId) || null;
  }, [supportedUnits, unitId]);

  // Live Normalized Base Quantity Preview
  const baseNormalizedPreview = useMemo(() => {
    const qNum = parseFloat(quantity);
    if (isNaN(qNum) || qNum <= 0 || !selectedUnit) return null;

    const factor = Number(selectedUnit.conversion_factor_to_base) || 1;
    const normalized = qNum * factor;
    const baseUnitName = selectedAssignment?.productionItem?.baseUnit?.name || (selectedAssignment?.productionItem as any)?.base_unit?.name || "Base Units";
    const baseUnitSymbol = selectedAssignment?.productionItem?.baseUnit?.symbol || (selectedAssignment?.productionItem as any)?.base_unit?.symbol || "";

    return {
      normalized: Math.round(normalized * 10000) / 10000,
      baseUnitName,
      baseUnitSymbol,
      factor,
    };
  }, [quantity, selectedUnit, selectedAssignment]);

  if (isAssignmentsLoading) {
    return <Loading01 />;
  }

  if (!companyId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-bold">Unauthorized Company Context</h2>
        <p className="text-sm text-muted-foreground mt-1">
          No company context was identified for your active session.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!selectedAssignment) {
      setFormError("Please select a valid production item assignment.");
      return;
    }

    if (!reportDate) {
      setFormError("Please choose a production date.");
      return;
    }

    // Boundary check with assignment effective range
    if (selectedAssignment.effective_from && reportDate < selectedAssignment.effective_from) {
      setFormError(`Report date cannot be earlier than assignment effective start date (${selectedAssignment.effective_from}).`);
      return;
    }

    if (selectedAssignment.effective_to && reportDate > selectedAssignment.effective_to) {
      setFormError(`Report date cannot be later than assignment effective end date (${selectedAssignment.effective_to}).`);
      return;
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      setFormError("Please enter a valid positive production quantity.");
      return;
    }

    if (!unitId) {
      setFormError("Please choose a permitted measurement unit.");
      return;
    }

    try {
      await submitReport({
        company_id: companyId,
        assignment_id: selectedAssignment.assignment_id,
        production_item_id: selectedAssignment.production_item_id,
        report_date: reportDate,
        quantity_reported: numQuantity,
        reported_unit_id: unitId,
        notes: notes || null,
      }).unwrap();

      const reportedSymbol = selectedUnit?.measurementUnit?.symbol || (selectedUnit as any)?.unit?.symbol || "";
      setSuccessMessage(
        `Production report for ${reportDate} (${numQuantity.toLocaleString()} ${reportedSymbol}) successfully recorded!`
      );
      setQuantity("");
      setNotes("");
    } catch (err: any) {
      setFormError(
        err?.data?.message || err?.message || "Failed to submit production report. Please check for duplicate records."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FilePlus2 className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Submit Daily Production Report
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Record certified daily production quantities in company permitted measurement units.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/companies/${companyId}/production`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <CompanyProductionTabsHeader companyId={companyId} />

      {/* Main Form Content */}
      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">
            No Production Items Assigned
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            You cannot submit production reports until a federal administrator assigns at least one production item to your company.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Form */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Production Entry Details
            </h3>

            {formError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
                <Button asChild size="sm" variant="outline" className="text-xs h-7">
                  <Link href={`/companies/${companyId}/production/reports`}>
                    View in History
                  </Link>
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Production Item Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Production Item <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {assignments.map((a) => (
                    <option key={a.assignment_id} value={a.assignment_id}>
                      {a.productionItem?.name} ({a.productionItem?.code}) — {a.reportingFrequency?.name || "Daily"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Production Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={reportDate}
                    max={todayStr}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                    className="h-11 rounded-xl"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Today or past calendar date
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reported Quantity <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="e.g. 250.5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="h-11 rounded-xl font-mono"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Exact certified production amount
                  </span>
                </div>
              </div>

              {/* Unit Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Measurement Unit <span className="text-destructive">*</span>
                </label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {supportedUnits.map((u) => {
                    const uObj = u.measurementUnit || (u as any).unit;
                    const isDef = u.is_default || (u as any).is_default_unit;
                    return (
                      <option key={u.unit_id} value={u.unit_id}>
                        {uObj?.name} ({uObj?.symbol || uObj?.code}) {isDef ? "— (Default Unit)" : ""}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[11px] text-muted-foreground">
                  Restricted to supported units configured for this mineral commodity
                </span>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Operational Notes & Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Shift notes, production run batch numbers, or extraction variance explanations..."
                  className="w-full p-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  {isSubmitting ? (
                    <>Submitting Production Report...</>
                  ) : (
                    <>
                      <FilePlus2 className="h-5 w-5" />
                      Submit Production Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Information & Live Conversion Card */}
          <div className="space-y-6">
            {/* Live Conversion Preview */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Unit Normalization
              </h4>

              {baseNormalizedPreview ? (
                <div className="space-y-3 bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <div className="text-xs text-muted-foreground">
                    Normalized Base Quantity:
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {baseNormalizedPreview.normalized.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-foreground">
                      {baseNormalizedPreview.baseUnitSymbol}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Conversion Rule: 1 {selectedUnit?.measurementUnit?.name || (selectedUnit as any)?.unit?.name || "unit"} = {baseNormalizedPreview.factor}{" "}
                    {baseNormalizedPreview.baseUnitName}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/40 p-4 rounded-xl">
                  Enter quantity to preview normalized calculation in commodity base unit.
                </div>
              )}
            </div>

            {/* Assignment Context Card */}
            {selectedAssignment && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-3 text-xs">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Assigned Reporting Parameters
                </h4>

                <div className="space-y-2 text-muted-foreground divide-y divide-border/60">
                  <div className="pt-2 flex justify-between">
                    <span>Frequency:</span>
                    <strong className="text-foreground capitalize">
                      {selectedAssignment.reportingFrequency?.name || "Daily"}
                    </strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span>Target Depth:</span>
                    <strong className="text-foreground capitalize">
                      {selectedAssignment.target_allocation_depth}
                    </strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span>Base Unit:</span>
                    <strong className="text-foreground">
                      {selectedAssignment.productionItem?.baseUnit?.name || (selectedAssignment.productionItem as any)?.base_unit?.name} ({selectedAssignment.productionItem?.baseUnit?.symbol || (selectedAssignment.productionItem as any)?.base_unit?.symbol})
                    </strong>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span>Approval Required:</span>
                    <strong className="text-foreground">
                      {selectedAssignment.requires_review ? "Yes (Federal Review)" : "No (Auto-approved)"}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
