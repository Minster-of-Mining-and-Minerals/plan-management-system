"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Layers,
  Plus,
  Eye,
  Copy,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  GitBranch,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Shield,
  Sliders,
  RefreshCw,
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
import { useBranding } from "@/providers/BrandingProvider";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanVersionsQuery,
  useCreateRegionalPlanDraftMutation,
  useDeleteRegionalPlanVersionMutation,
  useDuplicateRegionalPlanDraftMutation,
  useGetRegionalPlanConfigQuery,
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
  const [durationYears, setDurationYears] = useState(5);
  const [duplicateName, setDuplicateName] = useState("");

  const { data: config } = useGetRegionalPlanConfigQuery({ region_id: regionId }, { skip: !regionId });
  const {
    data: plans = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRegionalPlanVersionsQuery(
    { region_id: regionId, version_kind: "master" },
    { skip: !regionId }
  );

  const [createDraft, { isLoading: isCreating }] = useCreateRegionalPlanDraftMutation();
  const [duplicateDraft, { isLoading: isDuplicating }] = useDuplicateRegionalPlanDraftMutation();
  const [deletePlan, { isLoading: isDeleting }] = useDeleteRegionalPlanVersionMutation();

  const canCreate = can("REGIONAL_PLANS:CREATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
  const canUpdate = can("REGIONAL_PLANS:UPDATE") || can("REGIONAL_PLANS:MANAGE") || can("REGIONS:MANAGE");
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
        },
      }).unwrap();

      actionFeedback.success("Regional plan draft created successfully");
      setIsCreateOpen(false);
      setDraftName("");
      router.push(`/regions/${regionId}/plans/${created.regional_plan_version_id}`);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to create plan draft");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedPlan) return;
    try {
      const duplicated = await duplicateDraft({
        id: selectedPlan.regional_plan_version_id,
        region_id: regionId,
        data: { draft_name: duplicateName.trim() || undefined },
      }).unwrap();

      actionFeedback.success("Plan draft duplicated successfully");
      setIsDuplicateOpen(false);
      setSelectedPlan(null);
      router.push(`/regions/${regionId}/plans/${duplicated.regional_plan_version_id}`);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to duplicate plan");
    }
  };

  const handleDelete = async (plan: RegionalPlanVersion) => {
    if (!confirm(`Are you sure you want to delete "${plan.draft_name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePlan({ id: plan.regional_plan_version_id, region_id: regionId }).unwrap();
      actionFeedback.success("Plan deleted successfully");
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to delete plan");
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Layers className="h-4 w-4" />
            <span>Regional Strategic Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Regional Plan Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, develop, execute, and monitor regional strategic master plans and annual cycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                setDraftName(`Regional Strategic Plan (${new Date().getFullYear()} - ${new Date().getFullYear() + 4})`);
                setIsCreateOpen(true);
              }}
              className="gap-2 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Regional Plan
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Input
            placeholder="Search plans by title or start year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", "draft", "finalized", "active", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List Cards */}
      {filteredPlans.length === 0 ? (
        <div className="text-center p-12 border rounded-2xl bg-card/50 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No regional plans found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              {search || statusFilter !== "all"
                ? "No plans match your current search or status filter."
                : "No strategic plans have been created for this region yet. Create the first regional plan draft to begin."}
            </p>
          </div>
          {canCreate && !search && statusFilter === "all" && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Regional Plan
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => {
            const isDraft = plan.status === "draft";
            const isFinalized = plan.status === "finalized";
            const isActive = plan.status === "active";
            const isCompleted = plan.status === "completed";

            const statusBadgeColor = isDraft
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200"
              : isFinalized
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200"
              : isActive
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
              : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200";

            return (
              <div
                key={plan.regional_plan_version_id}
                className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="outline" className={`capitalize font-semibold text-xs px-2.5 py-0.5 ${statusBadgeColor}`}>
                      {plan.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      v{plan.version_number}
                    </span>
                  </div>

                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {plan.draft_name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {plan.start_year} – {plan.end_year} ({plan.planning_duration_years} Years)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        {plan.annualVersions?.length || 0} Annual Cycles Configured
                      </span>
                    </div>

                    {plan.finalized_at && (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Finalized on {new Date(plan.finalized_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Duplicate Plan"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setDuplicateName(`Copy of ${plan.draft_name}`);
                        setIsDuplicateOpen(true);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>

                    {canDelete && isDraft && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Delete Draft"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Link href={`/regions/${regionId}/plans/${plan.regional_plan_version_id}`}>
                    <Button size="sm" variant="default" className="gap-1.5 h-8">
                      <span>Manage Plan</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span>Create Regional Strategic Plan</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Plan Draft Title</label>
                <Input
                  className="mt-1"
                  placeholder="e.g., Regional 5-Year Mining Development Strategy"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground">Start Year</label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={2000}
                    max={2100}
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Duration (Years)</label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={10}
                    value={durationYears}
                    onChange={(e) => setDurationYears(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
              </div>

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
