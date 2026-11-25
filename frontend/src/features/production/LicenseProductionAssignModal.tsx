"use client";

import React, { useState, useEffect } from "react";
import {
  Factory,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Gem,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useGetProductionItemsQuery,
  useGetFrequenciesQuery,
  useCreateAssignmentMutation,
} from "@/redux/api/productionApi";
import type { CompanyLicense } from "@/redux/types/license";
import type { ProductionReportingFrequency } from "@/redux/types/production";
import { toast } from "sonner";

interface LicenseProductionAssignModalProps {
  license: CompanyLicense;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LicenseProductionAssignModal({
  license,
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: LicenseProductionAssignModalProps) {
  const { data: productionItems = [], isLoading: itemsLoading } = useGetProductionItemsQuery({
    is_active: true,
  });
  const { data: frequencies = [], isLoading: freqsLoading } = useGetFrequenciesQuery();
  const [createAssignment, { isLoading: isSubmitting }] = useCreateAssignmentMutation();

  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedFrequencyId, setSelectedFrequencyId] = useState("");
  const [targetDepth, setTargetDepth] = useState<"annual" | "semi_annual" | "quarterly" | "monthly">("quarterly");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [requiresReview, setRequiresReview] = useState(false);
  const [allowPastReporting, setAllowPastReporting] = useState(false);
  const [pastReportingDuration, setPastReportingDuration] = useState("7");
  const [pastReportingUnit, setPastReportingUnit] = useState<"days" | "months" | "quarters" | "years">("days");
  const [allowReportUpdates, setAllowReportUpdates] = useState(false);
  const [notes, setNotes] = useState("");

  const licenseStart = license.effective_start_date || (license.effective_year_from ? `${license.effective_year_from}-01-01` : "");
  const licenseEnd = license.effective_end_date || (license.effective_year_to ? `${license.effective_year_to}-12-31` : "");

  useEffect(() => {
    if (open) {
      // Default to license start and end dates
      setEffectiveFrom(licenseStart || new Date().toISOString().slice(0, 10));
      setEffectiveTo(licenseEnd || "");
      setSelectedItemId("");
      setSelectedFrequencyId("");
      setSelectedUnitId("");
      setTargetDepth("quarterly");
      setRequiresReview(false);
      setAllowPastReporting(false);
      setPastReportingDuration("7");
      setPastReportingUnit("days");
      setNotes("");
    }
  }, [open, licenseStart, licenseEnd]);

  const selectedItem = productionItems.find((i) => i.production_item_id === selectedItemId);

  // Available units for the selected item
  const supportedUnits = selectedItem?.supportedUnits?.map((u) => u.measurementUnit).filter(Boolean) || [];
  const baseUnit = selectedItem?.baseUnit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) {
      toast.error("Please select a production item.");
      return;
    }
    if (!selectedFrequencyId) {
      toast.error("Please select a reporting frequency.");
      return;
    }
    if (!effectiveFrom) {
      toast.error("Effective start date is required.");
      return;
    }

    // License validity boundary check
    if (licenseStart && new Date(effectiveFrom) < new Date(licenseStart)) {
      toast.error(`Effective start date cannot precede license start date (${licenseStart}).`);
      return;
    }
    if (licenseEnd && effectiveTo && new Date(effectiveTo) > new Date(licenseEnd)) {
      toast.error(`Effective end date cannot exceed license end date (${licenseEnd}).`);
      return;
    }
    if (effectiveTo && new Date(effectiveTo) < new Date(effectiveFrom)) {
      toast.error("Effective end date cannot be earlier than start date.");
      return;
    }

    try {
      await createAssignment({
        company_id: companyId,
        license_id: license.license_id,
        production_item_id: selectedItemId,
        reporting_frequency_id: selectedFrequencyId,
        target_allocation_depth: targetDepth,
        default_reporting_unit_id: selectedUnitId || selectedItem?.default_reporting_unit_id || selectedItem?.base_unit_id,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        requires_review: requiresReview,
        allow_past_reporting: allowPastReporting,
        past_reporting_duration: allowPastReporting ? Number(pastReportingDuration) || 0 : 0,
        past_reporting_unit: allowPastReporting ? pastReportingUnit : "days",
        allow_report_updates: allowReportUpdates,
        notes: notes.trim() || null,
      }).unwrap();

      toast.success("Production reporting configured successfully for this license!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to configure production assignment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-emerald-600" />
            Configure License Production Reporting
          </DialogTitle>
        </DialogHeader>

        {/* License Context Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>{license.license_number}</span>
              <Badge variant="outline" className="text-[10px]">
                {license.licenseType?.name || "License"}
              </Badge>
            </div>
            <Badge
              variant={license.status === "active" ? "default" : "secondary"}
              className={license.status === "active" ? "bg-emerald-100 text-emerald-800" : ""}
            >
              {license.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Mineral:</span>{" "}
              {license.mineral_type || "N/A"}
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Location:</span>{" "}
              {[license.region, license.woreda].filter(Boolean).join(", ") || "N/A"}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-2 rounded border border-blue-200 dark:border-blue-900">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>License Validity Period:</strong> {licenseStart || "Start"} &rarr; {licenseEnd || "Indefinite"}.
              Reporting assignments are strictly bounded by these dates.
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Production Item */}
            <div>
              <Label className="text-xs font-semibold">
                Production Item <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId} required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {productionItems.map((item) => (
                    <SelectItem key={item.production_item_id} value={item.production_item_id}>
                      {item.name} ({item.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporting Frequency */}
            <div>
              <Label className="text-xs font-semibold">
                Reporting Frequency <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedFrequencyId} onValueChange={setSelectedFrequencyId} required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select frequency..." />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((f: ProductionReportingFrequency) => (
                    <SelectItem key={f.frequency_id} value={f.frequency_id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Allocation Depth */}
            <div>
              <Label className="text-xs font-semibold">Target Allocation Depth</Label>
              <Select
                value={targetDepth}
                onValueChange={(val: any) => setTargetDepth(val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual" className="text-xs">Annual Target Only</SelectItem>
                  <SelectItem value="semi_annual" className="text-xs">Annual → Semiannual</SelectItem>
                  <SelectItem value="quarterly" className="text-xs">Annual → Quarterly</SelectItem>
                  <SelectItem value="monthly" className="text-xs">Annual → Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reporting Unit */}
            <div>
              <Label className="text-xs font-semibold">Default Reporting Unit</Label>
              <Select
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                disabled={!selectedItem}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={baseUnit ? `${baseUnit.name} (${baseUnit.symbol})` : "Select unit"} />
                </SelectTrigger>
                <SelectContent>
                  {baseUnit && (
                    <SelectItem value={baseUnit.unit_id}>
                      {baseUnit.name} ({baseUnit.symbol}) — Base Unit
                    </SelectItem>
                  )}
                  {supportedUnits
                    .filter((u) => u?.unit_id !== baseUnit?.unit_id)
                    .map((u) => (
                      <SelectItem key={u!.unit_id} value={u!.unit_id}>
                        {u!.name} ({u!.symbol})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configuration Explanation Badge */}
          <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              Targets will be allocated <strong>{targetDepth.replace("_", "-")}</strong>. Actual production must be submitted{" "}
              <strong>{frequencies.find((f: any) => f.frequency_id === selectedFrequencyId)?.name || "periodically"}</strong>.
              {allowPastReporting && (
                <> Past reporting permitted for up to <strong>{pastReportingDuration} {pastReportingUnit}</strong>.</>
              )}
            </span>
          </div>

          {/* Past Reporting Allowance Section */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowPast" className="text-xs font-semibold cursor-pointer">
                  Past Reporting Allowance
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Permit submitting historical production reports within a rolling access window
                </p>
              </div>
              <input
                type="checkbox"
                id="allowPast"
                checked={allowPastReporting}
                onChange={(e) => setAllowPastReporting(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {allowPastReporting && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <Label className="text-[11px] font-medium">Allowed Past Duration</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={pastReportingDuration}
                    onChange={(e) => setPastReportingDuration(e.target.value)}
                    className="h-8 text-xs mt-1"
                    placeholder="e.g. 7"
                    required={allowPastReporting}
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium">Duration Unit</Label>
                  <Select
                    value={pastReportingUnit}
                    onValueChange={(val: any) => setPastReportingUnit(val)}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days" className="text-xs">Days (Rolling calendar days)</SelectItem>
                      <SelectItem value="months" className="text-xs">Months (Calendar months)</SelectItem>
                      <SelectItem value="quarters" className="text-xs">Quarters</SelectItem>
                      <SelectItem value="years" className="text-xs">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Allow Monthly Report Updates / Revisions Policy */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-foreground">
                  Allow Monthly Report Updates
                </Label>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  Allow company cashiers/operators to submit versionized updates for reported months. Revisions require an explicit reason and do not affect official calculations until approved.
                </p>
              </div>
              <Switch
                checked={allowReportUpdates}
                onCheckedChange={setAllowReportUpdates}
              />
            </div>
          </div>

          {/* Effective Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-3">
            <div>
              <Label className="text-xs font-semibold">
                Effective Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                min={licenseStart || undefined}
                max={licenseEnd || undefined}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
                className="mt-1"
              />
              <span className="text-[10px] text-slate-500">Min date: {licenseStart || "None"}</span>
            </div>

            <div>
              <Label className="text-xs font-semibold">Effective End Date</Label>
              <Input
                type="date"
                min={effectiveFrom || licenseStart || undefined}
                max={licenseEnd || undefined}
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="mt-1"
              />
              <span className="text-[10px] text-slate-500">Max date: {licenseEnd || "None"}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="reqReview"
              checked={requiresReview}
              onChange={(e) => setRequiresReview(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="reqReview" className="text-xs font-medium cursor-pointer">
              Requires Formal Review and Approval for Submitted Reports
            </Label>
          </div>

          <div>
            <Label className="text-xs">Assignment Notes</Label>
            <Textarea
              placeholder="Operational instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? "Configuring..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
