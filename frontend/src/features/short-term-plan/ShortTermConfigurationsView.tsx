"use client";

import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  useGetShortTermConfigurationsQuery,
  useCreateShortTermConfigurationMutation,
  useUpdateShortTermConfigurationMutation,
} from "@/redux/api/shortTermPlanApi";
import type { ShortTermPlanConfiguration } from "@/redux/types/shortTermPlan";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import type { ActionButton } from "@/types/tableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { Settings, Plus, Edit, CheckCircle2, ShieldCheck, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

export function ShortTermConfigurationsView() {
  const { check } = usePermissions();
  const canManage = check({ anyPermissions: ["SHORT_TERM_PLAN:CREATE", "SHORT_TERM_PLAN:EDIT"] });

  const { data: configs = [], isLoading, refetch } = useGetShortTermConfigurationsQuery();
  const [createConfig, { isLoading: isCreating }] = useCreateShortTermConfigurationMutation();
  const [updateConfig, { isLoading: isUpdating }] = useUpdateShortTermConfigurationMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ShortTermPlanConfiguration | null>(null);

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

  const handleOpenCreate = () => {
    setEditingConfig(null);
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
      is_default: configs.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (config: ShortTermPlanConfiguration) => {
    setEditingConfig(config);
    setForm({
      title: config.title,
      code: config.code,
      description: config.description || "",
      duration_days: config.duration_days,
      subdivision_mode: config.subdivision_mode || "weekly_4_per_month",
      reporting_window_before_days: config.reporting_window_before_days ?? 3,
      reporting_window_after_days: config.reporting_window_after_days ?? 5,
      allow_past_reporting: Boolean(config.allow_past_reporting),
      require_evidence_default: Boolean(config.require_evidence_default),
      is_default: Boolean(config.is_default),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim()) {
      toast.error("Configuration title and code are required");
      return;
    }
    if (form.duration_days > 365) {
      toast.error("Duration cannot exceed 1 year (365 days)");
      return;
    }

    try {
      if (editingConfig) {
        await updateConfig({
          configurationId: editingConfig.configuration_id,
          data: form,
        }).unwrap();
        toast.success("Short-term configuration updated successfully");
      } else {
        await createConfig(form).unwrap();
        toast.success("Short-term configuration created successfully");
      }
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Save configuration error:", err);
      toast.error(err?.data?.message || "Failed to save configuration");
    }
  };

  const handleSetDefault = async (config: ShortTermPlanConfiguration) => {
    try {
      await updateConfig({
        configurationId: config.configuration_id,
        data: { is_default: true },
      }).unwrap();
      toast.success(`"${config.title}" is now the default configuration`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update default configuration");
    }
  };

  const columns: ColumnDef<ShortTermPlanConfiguration>[] = [
    {
      accessorKey: "title",
      header: "Configuration Name",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground">{c.title}</span>
              {c.is_default && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                  Default
                </Badge>
              )}
            </div>
            {c.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{c.description}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[11px]">
          {row.getValue("code")}
        </Badge>
      ),
    },
    {
      accessorKey: "duration_days",
      header: "Duration",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {row.getValue("duration_days")} Days
        </span>
      ),
    },
    {
      accessorKey: "subdivision_mode",
      header: "Subdivision Cadence",
      cell: ({ row }) => {
        const mode = row.original.subdivision_mode;
        const labels: Record<string, string> = {
          weekly_4_per_month: "Weekly (4 per month)",
          "10_days": "10-Day Decades (3 per month)",
          "15_days": "15-Day Semi-monthly",
          monthly: "Monthly Only",
        };
        return (
          <Badge variant="secondary" className="capitalize text-xs font-medium">
            {labels[mode] || mode}
          </Badge>
        );
      },
    },
    {
      id: "reporting_window",
      header: "Window & Deadlines",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-xs space-y-0.5 text-muted-foreground">
            <div>Opens: <strong>{c.reporting_window_before_days ?? 3}d</strong> before period</div>
            <div>Closes: <strong>{c.reporting_window_after_days ?? 5}d</strong> grace period</div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {!c.is_default && canManage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-emerald-700"
                onClick={() => handleSetDefault(c)}
              >
                Set Default
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => handleOpenEdit(c)}
              >
                <Edit className="h-3.5 w-3.5 text-blue-600" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const actions: ActionButton[] = canManage
    ? [
        {
          label: "New Configuration",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: handleOpenCreate,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <TableLayout
        title="Short-Term Plan Configurations (የዕቅድ ደንቦችና ቅንብሮች)"
        description="Configure duration, reporting division modes, reporting deadlines, and default parameters for sub-annual plans."
        actions={actions}
      >
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            data={configs}
            isLoading={isLoading}
            errorMessage="Failed to load short-term configurations."
            onRetry={() => refetch()}
            defaultPageSize={10}
          />
        </div>
      </TableLayout>

      {/* Create / Edit Configuration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-emerald-600" />
              {editingConfig ? "Edit Short-Term Plan Configuration" : "New Short-Term Configuration"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 100-Day Performance Configuration"
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Code / Identifier *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. 100-day-action-plan"
                  required
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duration in Days (Max 365) *</Label>
                <Input
                  type="number"
                  min={10}
                  max={365}
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Division Subdivision Mode</Label>
                <Select
                  value={form.subdivision_mode}
                  onValueChange={(v: any) => setForm({ ...form, subdivision_mode: v })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly_4_per_month">Weekly (4 weeks / month)</SelectItem>
                    <SelectItem value="10_days">10-Day Periods (Decades)</SelectItem>
                    <SelectItem value="15_days">15-Day Periods (Semi-Monthly)</SelectItem>
                    <SelectItem value="monthly">Monthly Periods Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Window Opens (Days Before)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.reporting_window_before_days}
                  onChange={(e) => setForm({ ...form, reporting_window_before_days: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Grace Window (Days After)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={form.reporting_window_after_days}
                  onChange={(e) => setForm({ ...form, reporting_window_after_days: Number(e.target.value) })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Institutional description of the cadence and operational rules..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_default"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="is_default" className="text-xs font-medium cursor-pointer">
                Set as Default Configuration for new Short-Term Plans
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreating || isUpdating ? "Saving..." : editingConfig ? "Update Configuration" : "Create Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
