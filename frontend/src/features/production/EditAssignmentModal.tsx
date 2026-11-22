"use client";

import React, { useState, useEffect } from "react";
import {
  Factory,
  Calendar,
  AlertCircle,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useGetFrequenciesQuery,
  useUpdateAssignmentMutation,
} from "@/redux/api/productionApi";
import type { CompanyProductionAssignment } from "@/redux/types/production";
import { toast } from "sonner";

interface EditAssignmentModalProps {
  assignment: CompanyProductionAssignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditAssignmentModal({
  assignment,
  open,
  onOpenChange,
  onSuccess,
}: EditAssignmentModalProps) {
  const { data: frequencies = [], isLoading: freqsLoading } = useGetFrequenciesQuery();
  const [updateAssignment, { isLoading: isSubmitting }] = useUpdateAssignmentMutation();

  const [selectedFrequencyId, setSelectedFrequencyId] = useState("");
  const [targetDepth, setTargetDepth] = useState<"annual" | "semi_annual" | "quarterly" | "monthly" | "daily">("quarterly");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-07-08");
  const [effectiveTo, setEffectiveTo] = useState("2027-07-07");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const lastInitializedIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (open && assignment && lastInitializedIdRef.current !== assignment.assignment_id) {
      lastInitializedIdRef.current = assignment.assignment_id;
      setSelectedFrequencyId(assignment.reporting_frequency_id || "");
      setTargetDepth(assignment.target_allocation_depth || "quarterly");
      setSelectedUnitId(assignment.default_reporting_unit_id || "");
      setEffectiveFrom(assignment.effective_from || "2026-07-08");
      setEffectiveTo(assignment.effective_to || "2027-07-07");
      setIsActive(assignment.is_active ?? true);
      setNotes(assignment.notes || "");
    } else if (!open) {
      lastInitializedIdRef.current = null;
    }
  }, [open, assignment]);

  if (!assignment) return null;

  const item = assignment.productionItem;
  const supportedUnits = item?.supportedUnits?.map((u) => u.measurementUnit).filter(Boolean) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFrequencyId) {
      toast.error("Please select a reporting frequency.");
      return;
    }

    try {
      await updateAssignment({
        id: assignment.assignment_id,
        data: {
          reporting_frequency_id: selectedFrequencyId,
          target_allocation_depth: targetDepth,
          default_reporting_unit_id: selectedUnitId || undefined,
          effective_from: effectiveFrom,
          effective_to: effectiveTo || null,
          is_active: isActive,
          notes: notes || null,
        },
      }).unwrap();

      toast.success("Production reporting configuration updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to update configuration.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Edit Production Reporting Configuration
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Update reporting parameters for {item?.name || "Production Item"}.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Item details (read-only) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Production Item</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {item?.name} ({item?.code})
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {item?.category || "Mineral"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Reporting Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reporting Frequency *</Label>
              <Select
                value={selectedFrequencyId}
                onValueChange={setSelectedFrequencyId}
                disabled={freqsLoading}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((f) => (
                    <SelectItem key={f.frequency_id} value={f.frequency_id} className="text-xs">
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Allocation Depth */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Allocation Depth</Label>
              <Select
                value={targetDepth}
                onValueChange={(val: any) => setTargetDepth(val)}
              >
                <SelectTrigger className="text-xs capitalize">
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
          </div>

          {/* Default Reporting Unit */}
          {supportedUnits.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default Reporting Unit</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Measurement Unit" />
                </SelectTrigger>
                <SelectContent>
                  {supportedUnits.map((u: any) => (
                    <SelectItem key={u.unit_id} value={u.unit_id} className="text-xs">
                      {u.name} ({u.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Effective Validity Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Effective From *
              </Label>
              <Input
                type="date"
                className="text-xs font-mono"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Effective To
              </Label>
              <Input
                type="date"
                className="text-xs font-mono"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div>
              <Label className="text-xs font-semibold">Active Reporting Assignment</Label>
              <p className="text-[11px] text-slate-500">
                Inactive configurations pause production target monitoring and reporting.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              className="text-xs"
              placeholder="Optional remarks regarding this reporting configuration..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
