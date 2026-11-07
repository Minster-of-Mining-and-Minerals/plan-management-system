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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Calendar,
  Layers,
  FileText,
  ShieldCheck,
  Info,
  Clock,
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

  const [method, setMethod] = useState<string>("both");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (config) {
      setMethod(config.national_reporting_method || "node_mapping");
      setIsActive(Boolean(config.form_reporting_active));
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
          national_reporting_method: isActive ? "both" : "node_mapping",
          form_reporting_active: isActive,
          form_reporting_start_date: startDate ? startDate : null,
          form_reporting_end_date: endDate ? endDate : null,
          form_reporting_notes: notes.trim() || null,
        },
      }).unwrap();

      toast.success(
        `Reporting method updated for ${regionName}. Form-based reporting is ${
          isActive ? "Activated" : "Disabled"
        }. Regional plan-node mapping remains permanently active.`
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
      <DialogContent className="max-w-xl">
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
                Manage per-region dual reporting method controls and temporary form reporting permissions.
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

            {/* Primary Method: Regional Plan-Node Mapping (Always Active) */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    Regional Plan-Node Mapping
                  </span>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  Permanent / Always Available
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                Primary national reporting mechanism. Hierarchical plan-node linkage, target setting, execution tracking, and the regional validation gateway are permanently active and cannot be disabled.
              </p>
            </div>

            {/* Optional Method: Form-Based National Reporting */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <Label htmlFor="active-toggle" className="font-semibold text-sm cursor-pointer">
                    Enable Form-Based National Reporting
                  </Label>
                </div>
                <p className="text-xs text-slate-500">
                  Optional per-region mechanism. Allows submitting KPI targets and achievements directly via form, alongside or in addition to regional plan-node mapping.
                </p>
              </div>
              <Switch
                id="active-toggle"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Optional Temporary Expiration Dates */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="h-4 w-4 text-emerald-600" />
                Temporary Activation Window (Optional)
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
                Leave dates empty for open-ended activation until explicitly deactivated by administrators.
              </p>
            </div>

            {/* Administrative Directives / Notes */}
            <div>
              <Label htmlFor="admin-notes" className="text-xs font-semibold">
                Administrative Notes & Justification
              </Label>
              <Textarea
                id="admin-notes"
                rows={2}
                placeholder="e.g. Activated for temporary direct reporting during Q3 system onboarding..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            {/* Information Callout */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <strong>Dual Reporting Policy:</strong> Regional plan-node mapping is the permanent foundation and is always active. When Form-Based Reporting is enabled, the region can use either or both methods. Deactivating form reporting blocks new form submissions while safely preserving all historical submissions and receipts.
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isUpdating ? "Saving..." : "Save Configuration"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

