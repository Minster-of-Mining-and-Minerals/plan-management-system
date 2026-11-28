"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  useGetShortTermPlansQuery,
  useGetShortTermPlanDetailQuery,
  useGetShortTermConfigurationsQuery,
  useCreateShortTermPlanMutation,
  useAddShortTermKpiMutation,
  useUpdateShortTermKpiMutation,
  useDeleteShortTermKpiMutation,
} from "@/redux/api/shortTermPlanApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { useGetUsersQuery } from "@/redux/api/userApi";
import type {
  ShortTermPlan,
  ShortTermKpi,
  ShortTermFrequency,
  ShortTermEvaluationMode,
} from "@/redux/types/shortTermPlan";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
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
import { AssignShortTermKpiModal } from "./AssignShortTermKpiModal";
import { ShortTermConfigurationModal } from "./ShortTermConfigurationModal";
import { ShortTermDashboardTab } from "./ShortTermDashboardTab";
import { usePermissions } from "@/hooks/usePermissions";
import { actionFeedback } from "@/components/action-feedback";
import {
  Plus,
  Share2,
  Eye,
  Edit,
  Trash2,
  Settings,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Layers,
  CheckCircle2,
  TrendingUp,
  LayoutList,
  LayoutGrid,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export function ShortTermPlanView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanId = searchParams.get("planId") || "";

  const { check } = usePermissions();
  const canCreatePlan = check({ anyPermissions: ["SHORT_TERM_PLAN:CREATE"] });
  const canEditKpi = check({ anyPermissions: ["SHORT_TERM_PLAN:EDIT"] });
  const canAssignKpi = check({ anyPermissions: ["SHORT_TERM_PLAN:ASSIGN"] });
  const canDeleteKpi = check({ anyPermissions: ["SHORT_TERM_PLAN:DELETE"] });

  const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

  // Navigation mode: directory (landing) or workspace (detailed plan view)
  const [viewMode, setViewMode] = useState<"directory" | "workspace">(
    initialPlanId ? "workspace" : "directory"
  );
  const [displayFormat, setDisplayFormat] = useState<"table" | "cards">("table");
  const [planSearch, setPlanSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"kpis" | "analytics" | "config">("kpis");

  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const { data: plans = [], isLoading: isLoadingPlans } = useGetShortTermPlansQuery(
    sectorFilter !== "all" ? { government_structure_id: sectorFilter } : undefined
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId);

  const activePlanId = useMemo(() => {
    if (selectedPlanId && plans.some((p) => p.short_term_plan_id === selectedPlanId)) {
      return selectedPlanId;
    }
    return plans[0]?.short_term_plan_id || "";
  }, [selectedPlanId, plans]);

  const {
    data: planDetail,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useGetShortTermPlanDetailQuery(
    { planId: activePlanId },
    { skip: !activePlanId }
  );

  const { data: configs = [] } = useGetShortTermConfigurationsQuery();
  const { data: sectors = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  const { data: internalDepts = [] } = useGetInternalStructuresQuery({ is_active: true });
  const { data: users = [] } = useGetUsersQuery({ limit: 200 });

  const [createPlan, { isLoading: isCreatingPlan }] = useCreateShortTermPlanMutation();
  const [addKpi, { isLoading: isAddingKpi }] = useAddShortTermKpiMutation();
  const [updateKpi, { isLoading: isUpdatingKpi }] = useUpdateShortTermKpiMutation();
  const [deleteKpi] = useDeleteShortTermKpiMutation();

  // Configuration Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Table Filters
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [evalModeFilter, setEvalModeFilter] = useState<string>("all");

  // Create Plan Dialog
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    government_structure_id: "",
    configuration_id: "",
    calendar_system: "EC" as CalendarSystem,
    start_date: "2026-11-10",
    end_date: "2027-02-07",
    duration_days: 100,
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
    if (!planForm.title.trim()) {
      toast.error("Plan title is required");
      return;
    }
    if (planForm.duration_days > 365) {
      toast.error("Short-term plan duration must be less than or equal to 1 year (365 days)");
      return;
    }

    try {
      const created = await createPlan({
        ...planForm,
        configuration_id: planForm.configuration_id || null,
        government_structure_id: planForm.government_structure_id || null,
      }).unwrap();
      toast.success("Short-term plan created");
      setSelectedPlanId(created.short_term_plan_id);
      setViewMode("workspace");
      setIsCreatePlanOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create short-term plan");
    }
  };

  const filters: FilterField[] = useMemo(
    () => [
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
    [frequencyFilter, evalModeFilter]
  );

  const actions: ActionButton[] = canCreatePlan && planDetail
    ? [
        {
          label: "Add KPI",
          icon: <Plus className="h-4 w-4" />,
          variant: "default" as const,
          onClick: openCreateKpi,
        },
      ]
    : [];

  const columns: ColumnDef<ShortTermKpi>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "KPI Title",
      cell: ({ row }) => (
        <div className="max-w-md text-xs font-medium text-foreground line-clamp-2">
          {row.original.title}
        </div>
      ),
    },
    {
      id: "target_eval",
      header: "Target & Unit",
      cell: ({ row }) => {
        const kpi = row.original;
        return (
          <div className="text-xs">
            <span className="font-semibold text-foreground">{kpi.total_target ?? "—"}</span>{" "}
            <span className="text-muted-foreground">({kpi.unit})</span>
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
      header: "Assigned Entity",
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
            <div className="truncate font-medium text-foreground" title={label}>{label}</div>
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
          return <Badge className="bg-emerald-600 text-white font-mono">{summary.overall_achievement_percent}%</Badge>;
        }
        return (
          <span className="text-xs text-muted-foreground">
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
        const hasAssignment = Boolean(kpi.assignments && kpi.assignments.length > 0);
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="View Detail & Report"
              onClick={() => router.push(`/short-term-plan/kpis/${kpi.short_term_kpi_id}`)}
            >
              <Eye className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </Button>
            {canEditKpi && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title="Edit KPI"
                onClick={() => openEditKpi(kpi)}
              >
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            {canAssignKpi && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                title={hasAssignment ? "Update Assignment" : "Assign to Dept / User"}
                onClick={() => setAssigningKpi(kpi)}
              >
                <Share2 className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
            {canDeleteKpi && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                title="Delete KPI"
                onClick={() => handleDeleteKpi(kpi)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const planColumns: ColumnDef<ShortTermPlan>[] = useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Plan Name",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="max-w-md">
              <span
                className="font-bold text-xs text-primary hover:underline cursor-pointer block leading-snug"
                onClick={() => {
                  setSelectedPlanId(p.short_term_plan_id);
                  setViewMode("workspace");
                }}
              >
                {p.title}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                {p.duration_days || 100} Days Duration • {p.configuration?.title || "100-Day Standard Configuration"}
              </span>
            </div>
          );
        },
      },
      {
        id: "date_range",
        header: "Date Range & Duration",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="text-xs">
              <span className="font-semibold text-foreground">
                {p.start_date} – {p.end_date}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                ({p.calendar_system}) • {p.duration_days || 100} Days
              </span>
            </div>
          );
        },
      },
      {
        id: "mother_sector",
        header: "Mother Sector",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{p.sector?.name || "Ministry of Mines"}</span>
            </div>
          );
        },
      },
      {
        id: "total_kpis",
        header: "Total KPIs",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Badge variant="outline" className="font-mono text-xs">
              {p.stats?.kpi_count || 0} KPIs
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Badge
              variant={p.status === "active" ? "default" : "secondary"}
              className="capitalize text-xs font-semibold"
            >
              {p.status || "active"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setSelectedPlanId(p.short_term_plan_id);
                  setViewMode("workspace");
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Open Plan</span>
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const filteredPlans = useMemo(() => {
    let list = plans;
    if (planSearch.trim()) {
      const q = planSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.sector?.name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [plans, planSearch]);

  // Directory Overview Metrics
  const directoryMetrics = useMemo(() => {
    let totalKpis = 0;
    let totalAssignments = 0;
    let totalReports = 0;
    let achievementSum = 0;
    let achievementCount = 0;

    plans.forEach((p) => {
      if (p.stats) {
        totalKpis += p.stats.kpi_count || 0;
        totalAssignments += p.stats.assignment_count || 0;
        totalReports += p.stats.total_reports || 0;
        if (p.stats.avg_achievement_percent > 0) {
          achievementSum += p.stats.avg_achievement_percent;
          achievementCount += 1;
        }
      }
    });

    return {
      totalPlans: plans.length,
      activePlans: plans.filter((p) => p.status === "active").length,
      totalKpis,
      totalAssignments,
      totalReports,
      globalAvgAchievement: achievementCount > 0 ? Math.round((achievementSum / achievementCount) * 10) / 10 : 0,
    };
  }, [plans]);

  return (
    <div className="space-y-6">
      {/* 1. SHORT-TERM PLAN DIRECTORY (LANDING VIEW) */}
      {viewMode === "directory" ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    Short-Term Action Plans (የአጭር ጊዜ ዕቅዶች)
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    100-day institutional action plans, mother-sector cascading, period divisions, and live achievement reporting.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setIsConfigModalOpen(true)}
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Configurations</span>
              </Button>
              {canCreatePlan && (
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  onClick={() => setIsCreatePlanOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span>New Short-Term Plan</span>
                </Button>
              )}
            </div>
          </div>

          {/* Metrics Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Plans
                </span>
                <span className="text-lg font-bold font-mono text-foreground">{directoryMetrics.totalPlans}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Active Execution
                </span>
                <span className="text-lg font-bold font-mono text-emerald-600">{directoryMetrics.activePlans}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total KPIs
                </span>
                <span className="text-lg font-bold font-mono text-foreground">{directoryMetrics.totalKpis}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/70 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Global Achievement
                </span>
                <span className="text-lg font-bold font-mono text-primary">{directoryMetrics.globalAvgAchievement}%</span>
              </div>
            </div>
          </div>

          {/* Filter Bar with Search, Sector and Table/Grid Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/60">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  placeholder="Search plan by name or sector..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Sector:</span>
                <Select value={sectorFilter} onValueChange={setSectorFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    {sectors.map((s) => (
                      <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-muted-foreground mr-1">
                {filteredPlans.length} plan draft(s)
              </span>

              <div className="inline-flex items-center rounded-lg border border-border p-0.5 bg-slate-50 dark:bg-slate-900">
                <button
                  type="button"
                  title="Tabular Table View"
                  onClick={() => setDisplayFormat("table")}
                  className={`p-1.5 rounded-md text-xs transition-all ${
                    displayFormat === "table"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Card Grid View"
                  onClick={() => setDisplayFormat("cards")}
                  className={`p-1.5 rounded-md text-xs transition-all ${
                    displayFormat === "cards"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabular Table or Cards Display */}
          {isLoadingPlans ? (
            <div className="p-12 text-center text-xs text-muted-foreground">Loading short-term plans...</div>
          ) : filteredPlans.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
              <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">No short-term plans found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a 100-day or sub-annual action plan to begin defining KPIs and cascading targets.
              </p>
              {canCreatePlan && (
                <Button size="sm" onClick={() => setIsCreatePlanOpen(true)} className="mt-4 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Plan</span>
                </Button>
              )}
            </div>
          ) : displayFormat === "table" ? (
            /* Tabular Option (Parity with Plan Management Plan Draft Table) */
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <DataTable
                columns={planColumns}
                data={filteredPlans}
                isLoading={isLoadingPlans}
                errorMessage="Failed to load plan drafts."
                onRetry={() => {}}
                defaultPageSize={10}
              />
            </div>
          ) : (
            /* Cards Option */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlans.map((p) => {
                const achievementVal = p.stats?.avg_achievement_percent || 0;
                return (
                  <div
                    key={p.short_term_plan_id}
                    className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary text-[10px] font-semibold"
                        >
                          {p.duration_days || 100} Days Duration
                        </Badge>
                        <Badge
                          variant={p.status === "active" ? "default" : "secondary"}
                          className="capitalize text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                        {p.title}
                      </h3>

                      <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate font-medium text-foreground/80">
                            {p.sector?.name || "All Institution Sectors"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {p.start_date} – {p.end_date} ({p.calendar_system})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {p.configuration?.title || "100-Day Standard • 4 Weeks/Month"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">
                          {p.stats?.kpi_count || 0} KPIs • {p.stats?.assignment_count || 0} Assigned
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {achievementVal}% Achieved
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, achievementVal))}%` }}
                        />
                      </div>

                      <Button
                        variant="default"
                        size="sm"
                        className="w-full text-xs font-semibold gap-1.5 mt-2"
                        onClick={() => {
                          setSelectedPlanId(p.short_term_plan_id);
                          setViewMode("workspace");
                        }}
                      >
                        <span>Open Plan Workspace</span>
                        <span>→</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 2. DEDICATED PLAN WORKSPACE VIEW */
        <div className="space-y-6">
          {/* Back Header & Plan Summary */}
          <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start"
                onClick={() => setViewMode("directory")}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Plans Directory</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setIsConfigModalOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Configurations</span>
                </Button>
                {canCreatePlan && (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={openCreateKpi}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add KPI</span>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {planDetail?.title || "Short-Term Action Plan"}
                  </h2>
                  <Badge variant="outline" className="capitalize text-[10px] border-primary/30 text-primary">
                    {planDetail?.status || "active"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>Mother Sector: {planDetail?.sector?.name || "All Sectors"}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{planDetail?.start_date} – {planDetail?.end_date} ({planDetail?.calendar_system})</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{planDetail?.duration_days || 100} Days Duration</span>
                  </span>
                </div>
              </div>

              {planDetail?.configuration && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60 text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Division & Reporting Configuration
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {planDetail.configuration.title}
                  </span>
                </div>
              )}
            </div>

            {/* Standardized Outer Card Tabs with Golden Active Pill */}
            <div className="pt-2">
              <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("kpis")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === "kpis"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>KPIs & Cascaded Assignments ({allKpis.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("analytics")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === "analytics"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Status & Analytics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === "config"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Plan Configuration Rules</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab 1: KPIs & Assignments Table */}
          {activeTab === "kpis" && (
            <TableLayout
              title="KPI List & Cascaded Division Progress"
              description="Quantitative and qualitative KPIs, target allocations across periods, and performance narration."
              actions={actions}
              filters={filters}
              filterColumnsPerRow={2}
              showSearch={true}
            >
              <DataTable
                columns={columns}
                data={filteredKpis}
                isLoading={isLoadingPlans || isLoadingDetail}
                errorMessage="Failed to load short-term KPIs."
                onRetry={refetchDetail}
                resetKey={`${sectorFilter}-${activePlanId}-${frequencyFilter}-${evalModeFilter}-${searchQuery}`}
                defaultPageSize={10}
              />
            </TableLayout>
          )}

          {/* Tab 2: Status & Analytics */}
          {activeTab === "analytics" && (
            <ShortTermDashboardTab planId={activePlanId} />
          )}

          {/* Tab 3: Configuration Info */}
          {activeTab === "config" && (
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm space-y-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span>Configuration Assigned to this Plan</span>
              </h3>
              {planDetail?.configuration ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Configuration Name
                    </span>
                    <span className="text-sm font-semibold text-foreground">{planDetail.configuration.title}</span>
                    <span className="text-xs font-mono text-muted-foreground block mt-1">{planDetail.configuration.code}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Division Cadence
                    </span>
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {planDetail.configuration.subdivision_mode.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground block mt-1">
                      {planDetail.duration_days || 100} Days Plan Limit
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Reporting Window Rules
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      -{planDetail.configuration.reporting_window_before_days}d to +{planDetail.configuration.reporting_window_after_days}d
                    </span>
                    <span className="text-xs text-emerald-600 block mt-1">
                      {planDetail.configuration.require_evidence_default ? "Evidence Mandatory" : "Evidence Optional"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Using default 100-day standard action plan configuration.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="h-5 w-5 text-primary" />
              <span>Create Short-Term Action Plan</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Plan Title (Amharic / English) *</Label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder="የማዕድን ኢትዮጵያ ጂኦሎጂካል ሰርቨይ ኢንስቲትዩት የ100 ቀን ዕቅድ የድርጊት መርሃ ግብር"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mother Sector (ተቋም / ማዕከል) *</Label>
                <Select
                  value={planForm.government_structure_id}
                  onValueChange={(v) => setPlanForm({ ...planForm, government_structure_id: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Mother Sector" /></SelectTrigger>
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
                <Label className="text-xs font-semibold">Short-Term Configuration *</Label>
                <Select
                  value={planForm.configuration_id}
                  onValueChange={(v) => {
                    const matched = configs.find((c) => c.configuration_id === v);
                    setPlanForm({
                      ...planForm,
                      configuration_id: v,
                      duration_days: matched?.duration_days || planForm.duration_days,
                    });
                  }}
                >
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Configuration" /></SelectTrigger>
                  <SelectContent>
                    {configs.map((c) => (
                      <SelectItem key={c.configuration_id} value={c.configuration_id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Duration in Days (Max 365) *</Label>
                <Input
                  type="number"
                  min={10}
                  max={365}
                  value={planForm.duration_days}
                  onChange={(e) => setPlanForm({ ...planForm, duration_days: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold block mb-1">Calendar System</Label>
                <CalendarSystemSelector
                  value={planForm.calendar_system}
                  onChange={(cal) => setPlanForm({ ...planForm, calendar_system: cal })}
                  size="sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Start Date ({planForm.calendar_system}) *</Label>
                <DualCalendarDatePicker
                  value={planForm.start_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, start_date: d })}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">End Date ({planForm.calendar_system}) *</Label>
                <DualCalendarDatePicker
                  value={planForm.end_date}
                  calendarSystem={planForm.calendar_system}
                  onChange={(d) => setPlanForm({ ...planForm, end_date: d })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Scope</Label>
              <Textarea
                rows={2}
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Institutional priorities and milestones for this action plan..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatePlanOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingPlan}>
                {isCreatingPlan ? "Creating..." : "Create Short-Term Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit KPI Dialog */}
      <Dialog open={isKpiModalOpen} onOpenChange={setIsKpiModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingKpi ? `Edit KPI (${editingKpi.code})` : "Add Short-Term KPI"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveKpi} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">KPI Code *</Label>
                <Input value={kpiForm.code} onChange={(e) => setKpiForm({ ...kpiForm, code: e.target.value })} placeholder="MOM-100D-01" required />
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit *</Label>
                <Input value={kpiForm.unit} onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })} placeholder="Number / %" required />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">KPI Title *</Label>
              <Textarea value={kpiForm.title} onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })} required rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Total Target</Label>
                <Input type="number" step="any" value={kpiForm.total_target} onChange={(e) => setKpiForm({ ...kpiForm, total_target: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Evaluation Mode</Label>
                <Select value={kpiForm.evaluation_mode} onValueChange={(v) => setKpiForm({ ...kpiForm, evaluation_mode: v as ShortTermEvaluationMode })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="frequency">Frequency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Frequency</Label>
                <Select value={kpiForm.reporting_frequency} onValueChange={(v) => setKpiForm({ ...kpiForm, reporting_frequency: v as ShortTermFrequency })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsKpiModalOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isAddingKpi || isUpdatingKpi}>
                {editingKpi ? "Update KPI" : "Save KPI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign KPI Dialog (Mother Sector Constrained) */}
      <AssignShortTermKpiModal
        kpi={assigningKpi}
        planId={activePlanId}
        defaultSectorId={planDetail?.government_structure_id || ""}
        sectors={sectors}
        departments={internalDepts}
        users={users}
        onClose={() => setAssigningKpi(null)}
      />

      {/* Configuration Management Modal */}
      <ShortTermConfigurationModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        canManage={canCreatePlan}
      />
    </div>
  );
}
