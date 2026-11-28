"use strict";
"use client";

import React, { useState } from "react";
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
  useGetShortTermConfigurationsQuery,
  useCreateShortTermConfigurationMutation,
} from "@/redux/api/shortTermPlanApi";
import type { ShortTermPlanConfiguration } from "@/redux/types/shortTermPlan";
import { Settings, Plus, CheckCircle2, Clock, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface ShortTermConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export function ShortTermConfigurationModal({
  open,
  onOpenChange,
  canManage = false,
}: ShortTermConfigurationModalProps) {
  const { data: configs = [], isLoading } = useGetShortTermConfigurationsQuery();
  const [createConfig, { isLoading: isCreating }] = useCreateShortTermConfigurationMutation();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [form, setForm] = useState({
    title: "",
    code: "",
    description: "",
    duration_days: 100,
    subdivision_mode: "weekly_4_per_month" as "weekly_4_per_month" | "10_days" | "15_days" | "monthly",
    reporting_window_before_days: 3,
    reporting_window_after_days: 5,
    allow_past_reporting: false,
    require_evidence_default: false,
    is_default: false,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim()) {
      toast.error("Title and Code are required");
      return;
    }
    if (form.duration_days > 365) {
      toast.error("Duration cannot exceed 1 year (365 days)");
      return;
    }

    try {
      await createConfig(form).unwrap();
      toast.success("Short-term configuration created");
      setIsCreatingNew(false);
      setForm({
        title: "",
        code: "",
        description: "",
        duration_days: 100,
        subdivision_mode: "weekly_4_per_month",
        reporting_window_before_days: 3,
        reporting_window_after_days: 5,
        allow_past_reporting: false,
        require_evidence_default: false,
        is_default: false,
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create configuration");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Settings className="h-5 w-5 text-primary" />
            <span>Short-Term Plan Configurations</span>
          </DialogTitle>
        </DialogHeader>

        {isCreatingNew ? (
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground border border-primary/20">
              Define division cadence, duration limit (&lt; 1 year), and reporting window offsets for short-term plans.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Configuration Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 100-Day Standard Plan Configuration"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unique Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="CONF-100D-01"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subdivision Cadence</Label>
                <Select
                  value={form.subdivision_mode}
                  onValueChange={(val: any) => setForm({ ...form, subdivision_mode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_4_per_month">4 Weeks per Month (100-Day Standard)</SelectItem>
                    <SelectItem value="10_days">10-Day Decadal (3 per Month)</SelectItem>
                    <SelectItem value="15_days">15-Day Semi-Monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Duration (Days, Max 365) *</Label>
                <Input
                  type="number"
                  min={10}
                  max={365}
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Opens Before Period End (Days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.reporting_window_before_days}
                  onChange={(e) => setForm({ ...form, reporting_window_before_days: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Closes After Period End (Days)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={form.reporting_window_after_days}
                  onChange={(e) => setForm({ ...form, reporting_window_after_days: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Operational purpose and guidelines for this configuration..."
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-primary"
                />
                <span>Set as System Default for Short-Term Plans</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingNew(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? "Saving..." : "Save Configuration"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                {configs.length} active configuration(s) available
              </span>
              {canManage && (
                <Button size="sm" variant="default" onClick={() => setIsCreatingNew(true)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Configuration</span>
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading configurations...</div>
            ) : configs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No configurations found.</div>
            ) : (
              <div className="space-y-2.5">
                {configs.map((conf) => (
                  <div
                    key={conf.configuration_id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:border-primary/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{conf.title}</span>
                          {conf.is_default && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground block">{conf.code}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {conf.subdivision_mode.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {conf.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{conf.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{conf.duration_days} days max duration</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Window: -{conf.reporting_window_before_days}d to +{conf.reporting_window_after_days}d
                        </span>
                      </div>
                      {conf.require_evidence_default && (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Evidence Mandatory</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
