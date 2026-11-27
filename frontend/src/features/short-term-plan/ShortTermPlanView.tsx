"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  useGetShortTermPlansQuery,
  useGetShortTermPlanDetailQuery,
  useCreateShortTermPlanMutation,
  useAddShortTermKpiMutation,
  useUpdateShortTermKpiMutation,
  useDeleteShortTermKpiMutation,
  useAssignShortTermKpiMutation,
} from "@/redux/api/shortTermPlanApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type {
  ShortTermKpi,
  ShortTermFrequency,
  ShortTermEvaluationMode,
} from "@/redux/types/shortTermPlan";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarSystemSelector } from "@/components/ui/calendar-system-selector";
import { DualCalendarDatePicker } from "@/components/ui/dual-calendar-date-picker";
import type { CalendarSystem } from "@/utils/calendarUtils";
import { ShortTermKpiDetailModal } from "./ShortTermKpiDetailModal";
import { actionFeedback } from "@/components/action-feedback";
import { Plus, Share2, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ShortTermPlanView() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const { data: plans = [], isLoading: isLoadingPlans } = useGetShortTermPlansQuery(
    sectorFilter !== "all" ? { government_structure_id: sectorFilter } : undefined
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const activePlanId = useMemo(() => {
    if (selectedPlanId && plans.some((p) => p.short_term_plan_id === selectedPlanId)) {
      return selectedPlanId;
    }
    return plans[0]?.short_term_plan_id || "";
  }, [selectedPlanId, plans]);

  const {
    data: planDetail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
    refetch: refetchDetail,
  } = useGetShortTermPlanDetailQuery(
    { planId: activePlanId },
    { skip: !activePlanId }
  );

  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: internalDepts = [] } = useGetInternalStructuresQuery({ is_active: true });
  const { data: users = [] } = useGetUsersQuery({ limit: 200 });

  const [createPlan, { isLoading: isCreatingPlan }] = useCreateShortTermPlanMutation();
  const [addKpi, { isLoading: isAddingKpi }] = useAddShortTermKpiMutation();
  const [updateKpi, { isLoading: isUpdatingKpi }] = useUpdateShortTermKpiMutation();
  const [deleteKpi] = useDeleteShortTermKpiMutation();
  const [assignKpi, { isLoading: isAssigning }] = useAssignShortTermKpiMutation();

  // Table Filters
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [evalModeFilter, setEvalModeFilter] = useState<string>("all");

  // KPI Detail Modal (Reporting Frequency & Reporting Section inside)
  const [detailKpiId, setDetailKpiId] = useState<string | null>(null);
  const detailKpi = useMemo(
    () => (planDetail?.kpis || []).find((k) => k.short_term_kpi_id === detailKpiId) || null,
    [planDetail?.kpis, detailKpiId]
  );

  // Create Plan Dialog
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    government_structure_id: "",
    calendar_system: "EC" as CalendarSystem,
    start_date: "2026-11-10",
    end_date: "2027-02-07",
    duration_months: 3,
    default_frequency: "weekly" as ShortTermFrequency,
  });

  // Add / Edit KPI Dialog
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<ShortTermKpi | null>(null);
  const [kpiForm, setKpiForm] = useState({
    code: "",
    title: "",
    unit: "Number",
    total_target: "",
    evaluation_mode: "number" as ShortTermEvaluationMode,
    target_mode: "cumulative" as "cumulative" | "milestone" | "continuous",
    reporting_frequency: "weekly" as ShortTermFrequency,
    allow_narrative_only_updates: true,
  });

  // Assign KPI Dialog
  const [assigningKpi, setAssigningKpi] = useState<ShortTermKpi | null>(null);
  const [assignForm, setAssignForm] = useState({
    government_structure_id: "",
    internal_structure_id: "",
    assigned_user_id: "",
    assignee_label: "",
    allocated_target: "",
    evaluation_mode_override: "" as "" | ShortTermEvaluationMode,
    reporting_frequency_override: "" as "" | ShortTermFrequency,
  });

  const allKpis = planDetail?.kpis || [];
  const filteredKpis = useMemo(() => {
    return allKpis.filter((kpi) => {
      if (frequencyFilter !== "all" && kpi.reporting_frequency !== frequencyFilter) return false;
      const mode = kpi.evaluation_mode || "number";
      if (evalModeFilter !== "all" && mode !== evalModeFilter) return false;
      if (searchQuery) {
        const assigneeText = (kpi.assignments || [])
          .map((a) => `${a.department?.name || ""} ${a.assignedUser?.full_name || ""} ${a.assignee_label || ""}`)
          .join(" ")
          .toLowerCase();
        const matches =
          kpi.code.toLowerCase().includes(searchQuery) ||
          kpi.title.toLowerCase().includes(searchQuery) ||
          assigneeText.includes(searchQuery);
        if (!matches) return false;
      }
      return true;
    });
  }, [allKpis, frequencyFilter, evalModeFilter, searchQuery]);

  const filteredDepts = useMemo(() => {
    const sectorId = assignForm.government_structure_id || planDetail?.government_structure_id;
    if (!sectorId) return internalDepts;
    return internalDepts.filter((d) => d.government_structure_id === sectorId);
  }, [internalDepts, assignForm.government_structure_id, planDetail?.government_structure_id]);

  const openCreateKpi = () => {
    setEditingKpi(null);
    setKpiForm({
      code: "",
      title: "",
      unit: "Number",
      total_target: "",
      evaluation_mode: "number",
      target_mode: "cumulative",
      reporting_frequency: planDetail?.default_frequency || "weekly",
      allow_narrative_only_updates: true,
    });
    setIsKpiModalOpen(true);
  };

  const openEditKpi = (kpi: ShortTermKpi) => {
    setEditingKpi(kpi);
    setKpiForm({
      code: kpi.code,
      title: kpi.title,
      unit: kpi.unit,
      total_target: kpi.total_target !== null && kpi.total_target !== undefined ? String(kpi.total_target) : "",
      evaluation_mode: kpi.evaluation_mode || "number",
      target_mode: kpi.target_mode || "cumulative",
      reporting_frequency: kpi.reporting_frequency || "weekly",
      allow_narrative_only_updates: kpi.allow_narrative_only_updates,
    });
    setIsKpiModalOpen(true);
  };

  const handleDeleteKpi = async (kpi: ShortTermKpi) => {
    if (!planDetail) return;
    const confirmed = await actionFeedback.confirm(
      `Delete KPI "${kpi.code}" and all its assignments/reports?`,
      { destructive: true }
    );
    if (!confirmed) return;
    try {
      await deleteKpi({ kpiId: kpi.short_term_kpi_id, planId: planDetail.short_term_plan_id }).unwrap();
      toast.success(`KPI ${kpi.code} deleted`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete KPI");
    }
  };

  const handleSaveKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanId) return;
    try {
      if (editingKpi) {
        await updateKpi({
          kpiId: editingKpi.short_term_kpi_id,
          planId: activePlanId,
          code: kpiForm.code,
          title: kpiForm.title,
          unit: kpiForm.unit,
          total_target: kpiForm.total_target ? Number(kpiForm.total_target) : null,
          evaluation_mode: kpiForm.evaluation_mode,
          reporting_frequency: kpiForm.reporting_frequency,
        }).unwrap();
        toast.success("Short-term KPI updated");
      } else {
        await addKpi({
          planId: activePlanId,
          code: kpiForm.code,
          title: kpiForm.title,
          unit: kpiForm.unit,
          total_target: kpiForm.total_target ? Number(kpiForm.total_target) : null,
          evaluation_mode: kpiForm.evaluation_mode,
          target_mode: kpiForm.target_mode,
          reporting_frequency: kpiForm.reporting_frequency,
          allow_narrative_only_updates: kpiForm.allow_narrative_only_updates,
        }).unwrap();
        toast.success("Short-term KPI added");
      }
      setIsKpiModalOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save KPI");
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createPlan({
        ...planForm,
        government_structure_id: planForm.government_structure_id || null,
      }).unwrap();
      toast.success("Short-term plan created");
      setSelectedPlanId(created.short_term_plan_id);
      setIsCreatePlanOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create short-term plan");
    }
  };

  const handleAssignKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningKpi || !planDetail) return;
    const sectorId = assignForm.government_structure_id || planDetail.government_structure_id;
    if (!sectorId) {
      toast.error("Please select a Sector");
      return;
    }
    try {
      await assignKpi({
        kpiId: assigningKpi.short_term_kpi_id,
        planId: planDetail.short_term_plan_id,
        government_structure_id: sectorId,
        internal_structure_id: assignForm.internal_structure_id || null,
        assigned_user_id: assignForm.assigned_user_id || null,
        assignee_label: assignForm.assignee_label || undefined,
        allocated_target: assignForm.allocated_target ? Number(assignForm.allocated_target) : null,
        evaluation_mode_override: assignForm.evaluation_mode_override || null,
        reporting_frequency_override: assignForm.reporting_frequency_override || null,
      }).unwrap();
      toast.success("KPI assigned successfully");
      setAssigningKpi(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to assign KPI");
    }
  };

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: "sector",
        label: "Sector",
        type: "select",
        value: sectorFilter,
        onChange: (val) => {
          setSectorFilter(val);
          setSelectedPlanId("");
        },
        options: [
          { value: "all", label: "All Sectors" },
          ...sectors.map((s) => ({
            value: s.government_structure_id,
            label: s.name,
          })),
        ],
      },
      {
        key: "plan",
        label: "Short-Term Plan",
        type: "select",
        value: activePlanId || "all",
        onChange: (val) => setSelectedPlanId(val === "all" ? "" : val),
        options:
          plans.length > 0
            ? plans.map((p) => ({
                value: p.short_term_plan_id,
                label: `${p.title} (${p.calendar_system})`,
              }))
            : [{ value: "all", label: isLoadingPlans ? "Loading plans..." : "No Plans" }],
      },
      {
        key: "frequency",
        label: "Frequency",
        type: "select",
        value: frequencyFilter,
        onChange: setFrequencyFilter,
        options: [
          { value: "all", label: "All Frequencies" },
          { value: "monthly", label: "Monthly" },
          { value: "weekly", label: "Weekly" },
          { value: "daily", label: "Daily" },
        ],
      },
      {
        key: "evaluation_mode",
        label: "Evaluation Mode",
        type: "select",
        value: evalModeFilter,
        onChange: setEvalModeFilter,
        options: [
          { value: "all", label: "All Modes" },
          { value: "number", label: "Number" },
          { value: "percentage", label: "Percentage (%)" },
          { value: "frequency", label: "Frequency" },
        ],
      },
    ],
    [sectorFilter, sectors, activePlanId, plans, isLoadingPlans, frequencyFilter, evalModeFilter]
  );

  const actions: ActionButton[] = [
    {
      label: "New Plan",
      icon: <Plus className="h-4 w-4" />,
      variant: "outline",
      onClick: () => setIsCreatePlanOpen(true),
    },
    ...(planDetail
      ? [
          {
            label: "Add KPI",
            icon: <Plus className="h-4 w-4" />,
            variant: "default" as const,
            onClick: openCreateKpi,
          },
        ]
      : []),
  ];

  const columns: ColumnDef<ShortTermKpi>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-primary">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "KPI Title",
      cell: ({ row }) => (
        <div className="max-w-md text-xs font-medium text-slate-900 line-clamp-2">
          {row.original.title}
        </div>
      ),
    },
    {
      id: "target_eval",
      header: "Target & Evaluation Mode",
      cell: ({ row }) => {
        const kpi = row.original;
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800">{kpi.total_target ?? "—"}</span>{" "}
            <span className="text-slate-500">({kpi.unit})</span>
            <div>
              <Badge variant="outline" className="capitalize text-[10px] mt-0.5">
                {kpi.evaluation_mode || "number"}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "reporting_frequency",
      header: "Frequency",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize text-[11px]">
          {row.original.reporting_frequency}
        </Badge>
      ),
    },
    {
      id: "assignee",
      header: "Assigned Dept / User",
      cell: ({ row }) => {
        const asgs = row.original.assignments || [];
        const first = asgs[0];
        const label =
          first?.department?.name ||
          first?.assignedUser?.full_name ||
          first?.assignee_label ||
          "Unassigned";
        return (
          <div className="text-xs max-w-[200px]">
            <div className="truncate" title={label}>{label}</div>
            {asgs.length > 1 && (
              <span className="text-[10px] text-primary">+{asgs.length - 1} more</span>
            )}
          </div>
        );
      },
    },
    {
      id: "achievement",
      header: "Achievement",
      cell: ({ row }) => {
        const summary = row.original.assignments?.[0]?.progress_summary;
        if (summary?.overall_achievement_percent !== null && summary?.overall_achievement_percent !== undefined) {
          return <Badge className="bg-emerald-600 text-white">{summary.overall_achievement_percent}%</Badge>;
        }
        return (
          <span className="text-xs text-slate-400">
            {summary?.reported_count ? `${summary.reported_count} updates` : "Pending"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const kpi = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="View & Report"
              onClick={() => setDetailKpiId(kpi.short_term_kpi_id)}
            >
              <Eye className="h-4 w-4 text-slate-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Edit KPI"
              onClick={() => openEditKpi(kpi)}
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Assign to Dept / User"
              onClick={() => {
                setAssigningKpi(kpi);
                setAssignForm({
                  government_structure_id: planDetail?.government_structure_id || "",
                  internal_structure_id: "",
                  assigned_user_id: "",
                  assignee_label: "",
                  allocated_target: kpi.total_target ? String(kpi.total_target) : "",
                  evaluation_mode_override: "",
                  reporting_frequency_override: "",
                });
              }}
            >
              <Share2 className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Delete KPI"
              onClick={() => handleDeleteKpi(kpi)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <TableLayout
        title="Short-Term Plan KPIs"
        description={
          planDetail
            ? `${planDetail.title} (${planDetail.calendar_system}) — Total ${filteredKpis.length} KPI(s)`
            : "Manage short-term operational KPIs, target evaluation modes, cascading assignments, and reporting."
        }
        actions={actions}
        filters={filters}
        filterColumnsPerRow={2}
        showSearch={true}
      >
        <DataTable
          columns={columns}
          data={filteredKpis}
          isLoading={isLoadingPlans || isLoadingDetail}
          isError={isDetailError}
          errorMessage="Failed to load short-term KPIs."
          onRetry={refetchDetail}
          resetKey={`${sectorFilter}-${activePlanId}-${frequencyFilter}-${evalModeFilter}-${searchQuery}`}
          defaultPageSize={10}
        />
      </TableLayout>

      {/* KPI Detail & Reporting Modal */}
      {planDetail && (
        <ShortTermKpiDetailModal
          kpi={detailKpi}
          planId={planDetail.short_term_plan_id}
          onClose={() => setDetailKpiId(null)}
        />
      )}

      {/* Create Short-Term Plan Dialog */}
      <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create Short-Term Plan (3 / 5 Months)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <Label>Plan Title *</Label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder="e.g. Mining Sector 100-Day Action Plan"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sector</Label>
                <Select
                  value={planForm.government_structure_id}
                  onValueChange={(v) => setPlanForm({ ...planForm, government_structure_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Frequency</Label>
                <Select
                  value={planForm.default_frequency}
                  onValueChange={(v) => setPlanForm({ ...planForm, default_frequency: v as ShortTermFrequency })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="block mb-1.5">Calendar System</Label>
              <CalendarSystemSelector
                value={planForm.calendar_system}
                onChange={(cal) => setPlanForm({ ...planForm, calendar_system: cal })}
                size="sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date ({planForm.calendar_system})</Label>
                <DualCalendarDatePicker
                  value={planForm.start_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, start_date: d })}
                />
              </div>
              <div>
                <Label>End Date ({planForm.calendar_system})</Label>
                <DualCalendarDatePicker
                  value={planForm.end_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, end_date: d })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreatePlanOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreatingPlan}>Create Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit KPI Dialog */}
      <Dialog open={isKpiModalOpen} onOpenChange={setIsKpiModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{editingKpi ? `Edit KPI (${editingKpi.code})` : "Add Short-Term KPI"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveKpi} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>KPI Code *</Label>
                <Input value={kpiForm.code} onChange={(e) => setKpiForm({ ...kpiForm, code: e.target.value })} placeholder="MOM-100D-01" required />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input value={kpiForm.unit} onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })} placeholder="Number / %" required />
              </div>
            </div>
            <div>
              <Label>KPI Title *</Label>
              <Textarea value={kpiForm.title} onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total Target</Label>
                <Input type="number" step="any" value={kpiForm.total_target} onChange={(e) => setKpiForm({ ...kpiForm, total_target: e.target.value })} />
              </div>
              <div>
                <Label>Evaluation Mode</Label>
                <Select value={kpiForm.evaluation_mode} onValueChange={(v) => setKpiForm({ ...kpiForm, evaluation_mode: v as ShortTermEvaluationMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="frequency">Frequency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={kpiForm.reporting_frequency} onValueChange={(v) => setKpiForm({ ...kpiForm, reporting_frequency: v as ShortTermFrequency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsKpiModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAddingKpi || isUpdatingKpi}>
                {editingKpi ? "Update KPI" : "Save KPI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign KPI Dialog */}
      <Dialog open={!!assigningKpi} onOpenChange={(o) => !o && setAssigningKpi(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Assign KPI (Sector → Department / User)</DialogTitle></DialogHeader>
          <form onSubmit={handleAssignKpi} className="space-y-3">
            <div>
              <Label>Department / Desk (Internal Structure)</Label>
              <Select value={assignForm.internal_structure_id} onValueChange={(v) => setAssignForm({ ...assignForm, internal_structure_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select department (optional)" /></SelectTrigger>
                <SelectContent>
                  {filteredDepts.map((d) => (
                    <SelectItem key={d.internal_structure_id} value={d.internal_structure_id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned User (Optional)</Label>
              <Select value={assignForm.assigned_user_id} onValueChange={(v) => setAssignForm({ ...assignForm, assigned_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select user (optional)" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Allocated Target</Label>
                <Input type="number" step="any" value={assignForm.allocated_target} onChange={(e) => setAssignForm({ ...assignForm, allocated_target: e.target.value })} />
              </div>
              <div>
                <Label>Eval Mode</Label>
                <Select value={assignForm.evaluation_mode_override || "__default__"} onValueChange={(v) => setAssignForm({ ...assignForm, evaluation_mode_override: v === "__default__" ? "" : (v as ShortTermEvaluationMode) })}>
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
                <Label>Frequency</Label>
                <Select value={assignForm.reporting_frequency_override || "__default__"} onValueChange={(v) => setAssignForm({ ...assignForm, reporting_frequency_override: v === "__default__" ? "" : (v as ShortTermFrequency) })}>
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
              <Button type="button" variant="outline" onClick={() => setAssigningKpi(null)}>Cancel</Button>
              <Button type="submit" disabled={isAssigning}>Assign KPI</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
