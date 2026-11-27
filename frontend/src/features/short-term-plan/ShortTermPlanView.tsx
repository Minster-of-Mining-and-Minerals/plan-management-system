"use client";

import React, { useMemo, useState } from "react";
import {
  useGetShortTermPlansQuery,
  useGetShortTermPlanDetailQuery,
  useCreateShortTermPlanMutation,
  useAddShortTermKpiMutation,
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { CalendarDateDisplay } from "@/components/ui/calendar-date-display";
import type { CalendarSystem } from "@/utils/calendarUtils";
import { ShortTermKpiDetailModal } from "./ShortTermKpiDetailModal";
import { ShortTermDashboardTab } from "./ShortTermDashboardTab";
import {
  Plus,
  Share2,
  Search,
  BarChart3,
  ListChecks,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export function ShortTermPlanView() {
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

  const { data: planDetail, isLoading: isLoadingDetail } = useGetShortTermPlanDetailQuery(
    { planId: activePlanId },
    { skip: !activePlanId }
  );

  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: internalDepts = [] } = useGetInternalStructuresQuery({ is_active: true });
  const { data: users = [] } = useGetUsersQuery({ limit: 200 });

  const [createPlan, { isLoading: isCreatingPlan }] = useCreateShortTermPlanMutation();
  const [addKpi, { isLoading: isAddingKpi }] = useAddShortTermKpiMutation();
  const [assignKpi, { isLoading: isAssigning }] = useAssignShortTermKpiMutation();

  // Table Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [evalModeFilter, setEvalModeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // KPI Detail Modal (contains Reporting Frequency & Reporting Section inside)
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

  // Add KPI Dialog
  const [isAddKpiOpen, setIsAddKpiOpen] = useState(false);
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
    const q = searchQuery.trim().toLowerCase();
    return allKpis.filter((kpi) => {
      if (frequencyFilter !== "all" && kpi.reporting_frequency !== frequencyFilter) return false;
      const mode = kpi.evaluation_mode || "number";
      if (evalModeFilter !== "all" && mode !== evalModeFilter) return false;
      if (q) {
        const assigneeText = (kpi.assignments || [])
          .map((a) => `${a.department?.name || ""} ${a.assignedUser?.full_name || ""} ${a.assignee_label || ""}`)
          .join(" ")
          .toLowerCase();
        const matches =
          kpi.code.toLowerCase().includes(q) ||
          kpi.title.toLowerCase().includes(q) ||
          assigneeText.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allKpis, frequencyFilter, evalModeFilter, searchQuery]);

  const totalFiltered = filteredKpis.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedKpis = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return filteredKpis.slice(startIdx, startIdx + pageSize);
  }, [filteredKpis, safePage, pageSize]);

  const filteredDepts = useMemo(() => {
    const sectorId = assignForm.government_structure_id || planDetail?.government_structure_id;
    if (!sectorId) return internalDepts;
    return internalDepts.filter((d) => d.government_structure_id === sectorId);
  }, [internalDepts, assignForm.government_structure_id, planDetail?.government_structure_id]);

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

  const handleAddKpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanId) return;
    try {
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
      setIsAddKpiOpen(false);
      setKpiForm({
        code: "",
        title: "",
        unit: "Number",
        total_target: "",
        evaluation_mode: "number",
        target_mode: "cumulative",
        reporting_frequency: "weekly",
        allow_narrative_only_updates: true,
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add KPI");
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

  const startEntry = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endEntry = Math.min(safePage * pageSize, totalFiltered);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Internal Short-Term Planning &amp; KPI Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sector-cascaded short-term plans (3 / 5 months) with target evaluation modes (Number, Percentage, Frequency) and click-through KPI reporting.
          </p>
        </div>
        <Button onClick={() => setIsCreatePlanOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Short-Term Plan
        </Button>
      </div>

      {/* Sector Filter + Plan Selector */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <Label className="text-xs text-slate-500">Filter by Sector</Label>
            <Select
              value={sectorFilter}
              onValueChange={(v) => {
                setSectorFilter(v);
                setSelectedPlanId("");
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Internal Sectors</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-5">
            <Label className="text-xs text-slate-500">Short-Term Plan</Label>
            <Select
              value={activePlanId}
              onValueChange={(v) => {
                setSelectedPlanId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={isLoadingPlans ? "Loading plans..." : "Select a Short-Term Plan"} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.short_term_plan_id} value={p.short_term_plan_id}>
                    {p.title} ({p.calendar_system})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center justify-between md:justify-end gap-2">
            {planDetail && (
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <Badge variant="outline">{planDetail.calendar_system}</Badge>
                <CalendarDateDisplay
                  date={planDetail.start_date}
                  endDate={planDetail.end_date}
                  calendarSystem={planDetail.calendar_system}
                />
              </div>
            )}
            {planDetail && (
              <Button variant="outline" size="sm" onClick={() => setIsAddKpiOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add KPI
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs: Tabular KPIs vs Dashboard Analytics */}
      <Tabs defaultValue="kpis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kpis" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            KPI Catalog &amp; Reporting ({totalFiltered})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Dashboard Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-4">
          {/* Table Filter Controls */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search KPI code, title, or assignee..."
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <Select
                  value={frequencyFilter}
                  onValueChange={(v) => {
                    setFrequencyFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={evalModeFilter}
                  onValueChange={(v) => {
                    setEvalModeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Evaluation Mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Evaluation Modes</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="frequency">Frequency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* KPI Table */}
              {isLoadingDetail ? (
                <div className="py-10 text-center text-sm text-slate-500">Loading KPIs...</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Code</TableHead>
                        <TableHead>KPI Title</TableHead>
                        <TableHead>Target &amp; Eval Mode</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Assigned Dept / User</TableHead>
                        <TableHead className="text-right">Achievement</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedKpis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs text-slate-500 py-8">
                            No KPIs match the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedKpis.map((kpi) => {
                          const firstAsg = kpi.assignments?.[0];
                          const summary = firstAsg?.progress_summary;
                          const assigneeLabel =
                            firstAsg?.department?.name ||
                            firstAsg?.assignedUser?.full_name ||
                            firstAsg?.assignee_label ||
                            "Unassigned";
                          const extraCount = (kpi.assignments?.length || 0) - 1;

                          return (
                            <TableRow
                              key={kpi.short_term_kpi_id}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => setDetailKpiId(kpi.short_term_kpi_id)}
                            >
                              <TableCell className="font-mono text-xs font-medium">{kpi.code}</TableCell>
                              <TableCell className="text-xs max-w-md">
                                <div className="line-clamp-2 font-medium text-slate-900">{kpi.title}</div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-semibold text-slate-800">
                                  {kpi.total_target ?? "—"} <span className="font-normal text-slate-500">({kpi.unit})</span>
                                </div>
                                <Badge variant="outline" className="capitalize text-[10px] mt-0.5">
                                  {kpi.evaluation_mode || "number"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize text-[11px]">
                                  {kpi.reporting_frequency}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 max-w-[200px]">
                                <div className="truncate" title={assigneeLabel}>{assigneeLabel}</div>
                                {extraCount > 0 && (
                                  <span className="text-[10px] text-primary">+{extraCount} more</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-xs">
                                {summary?.overall_achievement_percent !== null && summary?.overall_achievement_percent !== undefined ? (
                                  <Badge className="bg-emerald-600 text-white">
                                    {summary.overall_achievement_percent}%
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">
                                    {summary?.reported_count ? `${summary.reported_count} updates` : "No reports"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => setDetailKpiId(kpi.short_term_kpi_id)}
                                  >
                                    <Eye className="h-3 w-3" />
                                    Report
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs gap-1"
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
                                    <Share2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination with Filtered Total Count */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-600">
                <div>
                  Showing <strong>{startEntry}–{endEntry}</strong> of <strong>{totalFiltered}</strong>{" "}
                  {totalFiltered !== allKpis.length ? `(filtered from ${allKpis.length} total)` : "KPIs"}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-1">
                    Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <ShortTermDashboardTab
            planId={activePlanId || undefined}
            sectorId={sectorFilter !== "all" ? sectorFilter : undefined}
          />
        </TabsContent>
      </Tabs>

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

      {/* Add KPI Dialog */}
      <Dialog open={isAddKpiOpen} onOpenChange={setIsAddKpiOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Add Short-Term KPI</DialogTitle></DialogHeader>
          <form onSubmit={handleAddKpi} className="space-y-3">
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
              <Button type="button" variant="outline" onClick={() => setIsAddKpiOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isAddingKpi}>Save KPI</Button>
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
