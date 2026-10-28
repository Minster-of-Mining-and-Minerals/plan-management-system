"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
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
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranding } from "@/providers/BrandingProvider";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";

import {
  useGetRegionalPlanVersionsQuery,
  useCreateRegionalPlanDraftMutation,
  useDeleteRegionalPlanVersionMutation,
  useDuplicateRegionalPlanDraftMutation,
  useGetRegionalPlanConfigQuery,
  useGetRegionalPlanRulesQuery,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanVersion } from "@/redux/types/regionalPlan";

export function RegionalPlanVersionTable() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();
  const { branding } = useBranding();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RegionalPlanVersion | null>(null);

  // Form states
  const [draftName, setDraftName] = useState("");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [durationYears, setDurationYears] = useState(5);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [basedOnVersionId, setBasedOnVersionId] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  const { data: config } = useGetRegionalPlanConfigQuery({ region_id: regionId }, { skip: !regionId });
  const { data: rules = [] } = useGetRegionalPlanRulesQuery({ region_id: regionId }, { skip: !regionId });
  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useGetRegionalPlanVersionsQuery(
    { region_id: regionId, version_kind: "master" },
    { skip: !regionId }
  );

  const [createDraft, { isLoading: isCreating }] = useCreateRegionalPlanDraftMutation();
  const [duplicateDraft, { isLoading: isDuplicating }] = useDuplicateRegionalPlanDraftMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeleteRegionalPlanVersionMutation();

  const canCreate = can("REGIONAL_PLANS:CREATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canDelete = can("REGIONAL_PLANS:DELETE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");

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
        region_id: regionId,
        data: {
          draft_name: draftName.trim(),
          start_year: Number(startYear),
          planning_duration_years: Number(durationYears),
          planning_start_date: startDate,
          regional_plan_rule_id: selectedRuleId && selectedRuleId !== "default" ? selectedRuleId : undefined,
          based_on_version_id: basedOnVersionId && basedOnVersionId !== "none" ? basedOnVersionId : undefined,
        },
      }).unwrap();

      actionFeedback.success("Plan draft created successfully");
      setIsCreateOpen(false);
      setDraftName("");
      router.push(`/regions/${regionId}/plans/${created.regional_plan_version_id}`);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to create plan draft");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedPlan) return;
    try {
      const duplicated = await duplicateDraft({
        id: selectedPlan.regional_plan_version_id,
        region_id: regionId,
        data: {
          draft_name: duplicateName.trim() || `Copy of ${selectedPlan.draft_name}`,
        },
      }).unwrap();

      actionFeedback.success("Plan duplicated as draft");
      setIsDuplicateOpen(false);
      setSelectedPlan(null);
      router.push(`/regions/${regionId}/plans/${duplicated.regional_plan_version_id}`);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to duplicate plan");
    }
  };

  const handleDelete = async (plan: RegionalPlanVersion) => {
    if (!confirm(`Are you sure you want to delete "${plan.draft_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deletePlan({
        id: plan.regional_plan_version_id,
        region_id: regionId,
      }).unwrap();

      actionFeedback.success("Regional plan deleted successfully");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to delete plan");
    }
  };

  const columns: ColumnDef<RegionalPlanVersion>[] = useMemo(
    () => [
      {
        accessorKey: "draft_name",
        header: "Plan Title & Version",
        cell: ({ row }) => {
          const plan = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Link
                    href={`/regions/${regionId}/plans/${plan.regional_plan_version_id}`}
                    className="hover:underline hover:text-primary transition-colors"
                  >
                    {plan.draft_name}
                  </Link>
                  <Badge variant="outline" className="text-[10px] font-mono py-0">
                    v{plan.version_number}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Regional Strategic Master Hierarchy
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "planning_duration_years",
        header: "Strategic Cycle",
        cell: ({ row }) => {
          const plan = row.original;
          return (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-foreground font-mono">
                  {plan.start_year} – {plan.end_year}
                </div>
                <div className="text-muted-foreground">{plan.planning_duration_years} Years Duration</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "annualVersions",
        header: "Annual Breakdown",
        cell: ({ row }) => {
          const count = row.original.annualVersions?.length || 0;
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">{count} Annual Cycles</span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const isDraft = status === "draft";
          const isFinalized = status === "finalized";
          const isActive = status === "active";

          const badgeClass = isDraft
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200"
            : isFinalized
            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200"
            : isActive
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
            : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200";

          return (
            <Badge variant="outline" className={`capitalize font-semibold text-xs px-2.5 py-0.5 ${badgeClass}`}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "finalized_at",
        header: "Finalized / Created",
        cell: ({ row }) => {
          const plan = row.original;
          return (
            <div className="text-xs text-muted-foreground">
              {plan.finalized_at ? (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{new Date(plan.finalized_at).toLocaleDateString()}</span>
                </div>
              ) : plan.created_at ? (
                <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
              ) : (
                "Draft"
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const plan = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Link href={`/regions/${regionId}/plans/${plan.regional_plan_version_id}`}>
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                title="Duplicate Plan"
                onClick={() => {
                  setSelectedPlan(plan);
                  setDuplicateName(`Copy of ${plan.draft_name}`);
                  setIsDuplicateOpen(true);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>

              {canDelete && plan.status === "draft" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                  title="Delete Plan"
                  onClick={() => handleDelete(plan)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [regionId, canDelete]
  );

  return (
    <div className="space-y-6">
      <TableLayout
        title="Plan Drafts"
        description="Multi-year development cycles, strategic goals, indicators, and organizational contribution hierarchies."
        actions={
          canCreate
            ? [
                {
                  label: "New Plan Draft",
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => setIsCreateOpen(true),
                },
              ]
            : []
        }
      >
        <div className="p-4 border-b border-border bg-card/50 flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-sm w-full">
            <Input
              placeholder="Search plans by title or start year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="h-9 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredPlans}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      </TableLayout>

      {/* Create Plan Draft Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <span>Create Strategic Plan Draft</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Plan Draft Title *</label>
                <Input
                  className="mt-1"
                  placeholder="e.g. 5-Year Growth & Transformation Plan"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Planning Start Date *</label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value) {
                        const y = new Date(e.target.value).getFullYear();
                        if (!isNaN(y)) setStartYear(y);
                      }
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Duration (Years) *</label>
                  <Input
                    type="number"
                    min={config?.min_duration_years || 1}
                    max={config?.max_duration_years || 10}
                    className="mt-1"
                    value={durationYears}
                    onChange={(e) => setDurationYears(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {rules.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground">Applicable Plan Rule</label>
                  <Select
                    value={selectedRuleId || "default"}
                    onValueChange={(val) => setSelectedRuleId(val === "default" ? "" : val)}
                  >
                    <SelectTrigger className="w-full mt-1 text-xs">
                      <SelectValue placeholder="Standard Rule (Default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Standard Rule (Default)</SelectItem>
                      {rules.map((r) => (
                        <SelectItem key={r.regional_plan_rule_id} value={r.regional_plan_rule_id}>
                          {r.name} ({r.steps?.length || 4} levels)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {plans.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-foreground">Base On Existing Version (Optional)</label>
                  <Select
                    value={basedOnVersionId || "none"}
                    onValueChange={(val) => setBasedOnVersionId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full mt-1 text-xs">
                      <SelectValue placeholder="Start from blank structure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Blank Structure</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.regional_plan_version_id} value={p.regional_plan_version_id}>
                          {p.draft_name} (v{p.version_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Creating a plan generates a draft master hierarchy. Once structured and finalized,
                  annual plans and execution periods will be initialized automatically.
                </span>
              </div>
            </div>

            <DialogFooter>
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

      {/* Duplicate Plan Modal */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              <span>Duplicate Regional Plan</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-foreground">New Plan Name</label>
              <Input
                className="mt-1"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will create an independent copy of the plan hierarchy, assignments, and targets with draft status.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={isDuplicating}>
              {isDuplicating ? "Duplicating..." : "Duplicate Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
