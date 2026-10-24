"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { FilterField } from "@/types/tableLayout";
import { ColumnDef } from "@tanstack/react-table";
import {
  Layers,
  Plus,
  Eye,
  Copy,
  Trash2,
  Calendar,
  CheckCircle2,
  GitBranch,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { CompanyPlanTabsHeader } from "./CompanyPlanTabsHeader";

import {
  useGetCompanyPlanVersionsQuery,
  useCreateCompanyPlanDraftMutation,
  useDeleteCompanyPlanVersionMutation,
  useDuplicateCompanyPlanDraftMutation,
  useGetCompanyPlanConfigQuery,
} from "@/redux/api/companyPlanApi";
import type { CompanyPlanVersion } from "@/redux/types/companyPlan";

export function CompanyPlanVersionTable() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const companyId = params?.id;
  const { can } = usePermissions();

  const searchParams = useSearchParams();
  const search = searchParams?.get("search") || "";
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<CompanyPlanVersion | null>(null);

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "All Status", value: "all" },
        { label: "Draft", value: "draft" },
        { label: "Finalized", value: "finalized" },
        { label: "Active", value: "active" },
      ],
    },
  ];

  // Form states
  const [draftName, setDraftName] = useState("");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [durationYears, setDurationYears] = useState(5);
  const [duplicateName, setDuplicateName] = useState("");

  const { data: config } = useGetCompanyPlanConfigQuery({ company_id: companyId }, { skip: !companyId });
  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useGetCompanyPlanVersionsQuery(
    { company_id: companyId, version_kind: "master" },
    { skip: !companyId }
  );

  const [createDraft, { isLoading: isCreating }] = useCreateCompanyPlanDraftMutation();
  const [duplicateDraft, { isLoading: isDuplicating }] = useDuplicateCompanyPlanDraftMutation();
  const [deletePlan] = useDeleteCompanyPlanVersionMutation();

  const canCreate = can("COMPANY_PLANS:CREATE") || can("COMPANY_PLANS:MANAGE") || can("COMPANIES:MANAGE");
  const canDelete = can("COMPANY_PLANS:DELETE") || can("COMPANY_PLANS:MANAGE") || can("COMPANIES:MANAGE");

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        search === "" ||
        plan.draft_name.toLowerCase().includes(search.toLowerCase()) ||
        String(plan.start_year).includes(search);
      const matchesStatus =
        statusFilter === "all" || plan.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [plans, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim()) {
      actionFeedback.error("Plan draft title is required");
      return;
    }
    try {
      const created = await createDraft({
        company_id: companyId,
        data: {
          draft_name: draftName.trim(),
          start_year: Number(startYear),
          planning_duration_years: Number(durationYears),
        },
      }).unwrap();

      actionFeedback.success("Company plan draft created successfully");
      setIsCreateOpen(false);
      setDraftName("");
      router.push(`/companies/${companyId}/plans/${created.company_plan_version_id}`);
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      actionFeedback.error(errObj?.data?.message || "Failed to create plan draft");
    }
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      const duplicated = await duplicateDraft({
        id: selectedPlan.company_plan_version_id,
        company_id: companyId,
        data: {
          draft_name: duplicateName.trim() || `${selectedPlan.draft_name} (Copy)`,
        },
      }).unwrap();

      actionFeedback.success("Company plan duplicated as a new working draft");
      setIsDuplicateOpen(false);
      setSelectedPlan(null);
      setDuplicateName("");
      router.push(`/companies/${companyId}/plans/${duplicated.company_plan_version_id}`);
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      actionFeedback.error(errObj?.data?.message || "Failed to duplicate plan draft");
    }
  };

  const handleDelete = async (plan: CompanyPlanVersion) => {
    if (plan.status === "finalized") {
      actionFeedback.error("Finalized strategic plans cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${plan.draft_name}"?`)) return;

    try {
      await deletePlan({ id: plan.company_plan_version_id, company_id: companyId }).unwrap();
      actionFeedback.success("Plan draft removed successfully");
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string } };
      actionFeedback.error(errObj?.data?.message || "Failed to delete plan version");
    }
  };

  const columns: ColumnDef<CompanyPlanVersion>[] = [
    {
      accessorKey: "draft_name",
      header: "Plan Title & Identification",
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex items-start gap-3 py-1">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <Link
                href={`/companies/${companyId}/plans/${plan.company_plan_version_id}`}
                className="font-semibold text-foreground hover:text-primary transition-colors hover:underline block"
              >
                {plan.draft_name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitBranch className="h-3 w-3" />
                  v{plan.version_number}.0
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {plan.start_year} – {plan.end_year} ({plan.planning_duration_years} yrs)
                </span>
                {plan.planRule && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0">
                      {plan.planRule.name}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status?.toLowerCase();
        if (status === "finalized") {
          return (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Finalized
            </Badge>
          );
        }
        if (status === "active") {
          return (
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
              <Sparkles className="h-3 w-3 mr-1" />
              Active
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="font-medium text-muted-foreground">
            Draft
          </Badge>
        );
      },
    },
    {
      accessorKey: "execution_status",
      header: "Execution Lifecycle",
      cell: ({ row }) => {
        const exStatus = row.original.execution_status || "open";
        return (
          <span className="capitalize text-xs font-medium text-muted-foreground">
            {exStatus.replace("_", " ")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Link href={`/companies/${companyId}/plans/${plan.company_plan_version_id}`}>
                <Eye className="h-3.5 w-3.5" />
                View & Edit
              </Link>
            </Button>

            {canCreate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Duplicate as new draft"
                onClick={() => {
                  setSelectedPlan(plan);
                  setDuplicateName(`${plan.draft_name} (Copy)`);
                  setIsDuplicateOpen(true);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}

            {canDelete && plan.status !== "finalized" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                title="Delete draft"
                onClick={() => handleDelete(plan)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <CompanyPlanTabsHeader />

      <TableLayout
        title="Company Strategic Plans"
        description="Manage multi-year corporate strategic plan versions, performance targets, and operational roadmaps."
        filters={filters}
        actions={[
          ...(canCreate
            ? [
                {
                  label: config?.create_action_label || "New Company Plan",
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => {
                    setDraftName("");
                    setStartYear(new Date().getFullYear());
                    setDurationYears(config?.min_duration_years || 5);
                    setIsCreateOpen(true);
                  },
                },
              ]
            : []),
        ]}
      >
        <DataTable
          columns={columns}
          data={filteredPlans}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          resetKey={`${search}-${statusFilter}`}
        />
      </TableLayout>

      {/* CREATE PLAN DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {config?.create_action_label || "Create New Strategic Plan"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Plan Draft Title <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Corporate Strategic Plan (2026-2030)"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">
                    {config?.start_year_label || "Start Year"}
                  </label>
                  <Input
                    type="number"
                    min={2000}
                    max={2100}
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">
                    {config?.duration_label || "Duration (Years)"}
                  </label>
                  <Input
                    type="number"
                    min={config?.min_duration_years || 1}
                    max={config?.max_duration_years || 15}
                    value={durationYears}
                    onChange={(e) => setDurationYears(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Planning Horizon:</span>
                  <span className="font-semibold text-foreground">
                    {startYear} – {startYear + durationYears - 1} ({durationYears} Years)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Initial Status:</span>
                  <Badge variant="secondary" className="text-[10px] py-0">Draft (Unlocked)</Badge>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Plan Draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DUPLICATE DIALOG */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleDuplicate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                Duplicate Plan Draft
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Creates a full deep clone of the Strategic Focus, Goals, and KPIs as an independent new draft version.
              </p>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  New Draft Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDuplicateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isDuplicating}>
                {isDuplicating ? "Duplicating..." : "Clone Draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
