"use client";

import React, { useState, useEffect } from "react";
import {
  useGetRegionNationalReportingConfigQuery,
  useUpdateRegionNationalReportingConfigMutation,
} from "@/redux/api/nationalReportingApi";
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
  Settings,
  Layers,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  regionId: string;
  regionName: string;
  regionCode?: string;
}

export function RegionalReportingMethodConfigModal({
  isOpen,
  onClose,
  regionId,
  regionName,
  regionCode,
}: Props) {
  const { data: config, isLoading } = useGetRegionNationalReportingConfigQuery(
    regionId,
    { skip: !isOpen || !regionId }
  );

  const [updateConfig, { isLoading: isUpdating }] =
    useUpdateRegionNationalReportingConfigMutation();

  // Mutually exclusive: "form_based" (default) or "node_mapping"
  const [selectedMethod, setSelectedMethod] = useState<"form_based" | "node_mapping">("form_based");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (config) {
      const activeMethod =
        config.national_reporting_method === "node_mapping"
          ? "node_mapping"
          : "form_based";
      setSelectedMethod(activeMethod);
      setStartDate(config.form_reporting_start_date || "");
      setEndDate(config.form_reporting_end_date || "");
      setNotes(config.form_reporting_notes || "");
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig({
        regionId,
        data: {
          national_reporting_method: selectedMethod,
          form_reporting_active: selectedMethod === "form_based",
          form_reporting_start_date: selectedMethod === "form_based" && startDate ? startDate : null,
          form_reporting_end_date: selectedMethod === "form_based" && endDate ? endDate : null,
          form_reporting_notes: notes.trim() || null,
        },
      }).unwrap();

      toast.success(
        `Reporting method configured for ${regionName}: ${
          selectedMethod === "form_based"
            ? "Form-Based Reporting is active. Node mapping is disabled."
            : "Regional Plan-Node Mapping is active. Form-based reporting is disabled."
        }`
      );
      onClose();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to update reporting configuration"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">
                Configure National Reporting Method
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Configure allowed reporting method for this region. Methods are mutually exclusive; the default is Form-Based Reporting.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading regional reporting configuration...
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Region Details Header */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">
                  Regional State
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {regionName}
                </div>
              </div>
              {regionCode && (
                <Badge variant="outline" className="font-mono">
                  {regionCode}
                </Badge>
              )}
            </div>

            {/* Mutually Exclusive Selection Cards */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                Select Active Reporting Method (One at a time)
              </span>

              {/* Option 1: Form-Based National Reporting (Default) */}
              <div
                onClick={() => setSelectedMethod("form_based")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === "form_based"
                    ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedMethod === "form_based"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          Form-Based National Reporting
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Default / Active
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Regional users submit KPI targets and achievements directly via form with Amharic justification. Node mapping is disabled for this region.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedMethod === "form_based"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedMethod === "form_based" && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Option 2: Regional Plan-Node Mapping */}
              <div
                onClick={() => setSelectedMethod("node_mapping")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === "node_mapping"
                    ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedMethod === "node_mapping"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                      }`}
                    >
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          Regional Plan-Node Mapping
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Hierarchical Linkage
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Regional users map national KPIs to internal regional plan hierarchy nodes and record periodic execution. Direct form reporting is disabled for this region.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedMethod === "node_mapping"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedMethod === "node_mapping" && <CheckCircle2 className="h-4 w-4" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Activation Window (Only relevant for form-based) */}
            {selectedMethod === "form_based" && (
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Form Activation Validity Window (Optional)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="start-date" className="text-[11px] text-slate-500">
                      Effective Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-[11px] text-slate-500">
                      Expiration End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-0.5">
                  Leave dates empty for continuous, open-ended form reporting.
                </p>
              </div>
            )}

            {/* Admin Policy Notes */}
            <div className="space-y-1">
              <Label htmlFor="config-notes" className="text-xs">
                Administrative Notes (Optional)
              </Label>
              <Textarea
                id="config-notes"
                rows={2}
                placeholder="e.g. Form-based reporting configured for regional reporting period..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose} disabled={isUpdating} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpdating || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
          >
            {isUpdating ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
