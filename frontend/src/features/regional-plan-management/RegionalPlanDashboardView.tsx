"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Layers,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  GitBranch,
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalExecutionDashboardSummaryQuery,
  useGetRegionalExecutionDashboardProgressTreeQuery,
  useGetRegionalExecutionDashboardDepartmentUserQuery,
  useGetRegionalPlanVersionsQuery,
} from "@/redux/api/regionalPlanApi";
import { RegionalPlanTabsHeader } from "./RegionalPlanTabsHeader";
import type { RegionalPlanNode, RegionalPlanVersion } from "@/redux/types/regionalPlan";

export function RegionalPlanDashboardView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const regionId = params?.id;

  const urlPlanVersionId = searchParams.get("plan_version_id") || undefined;
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<string | undefined>(urlPlanVersionId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // 1. Fetch all master plans in this region for the dropdown
  const { data: masterPlans = [], isLoading: isPlansLoading } = useGetRegionalPlanVersionsQuery(
    { region_id: regionId, version_kind: "master" },
    { skip: !regionId }
  );

  // Set default plan version if none selected
  const effectivePlanVersionId = selectedPlanVersionId || masterPlans[0]?.regional_plan_version_id;

  // 2. Fetch Dashboard Summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    refetch: refetchSummary,
  } = useGetRegionalExecutionDashboardSummaryQuery(
    { region_id: regionId },
    { skip: !regionId }
  );

  // 3. Fetch Department Performance
  const {
    data: deptData,
    isLoading: isDeptLoading,
    refetch: refetchDept,
  } = useGetRegionalExecutionDashboardDepartmentUserQuery(
    { region_id: regionId, plan_version_id: effectivePlanVersionId },
    { skip: !regionId }
  );

  // 4. Fetch Progress Tree
  const {
    data: treeData,
    isLoading: isTreeLoading,
    refetch: refetchTree,
  } = useGetRegionalExecutionDashboardProgressTreeQuery(
    { region_id: regionId, plan_version_id: effectivePlanVersionId },
    { skip: !regionId || !effectivePlanVersionId }
  );

  const toggleCollapse = (id: string) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectPlan = (id: string) => {
    setSelectedPlanVersionId(id);
    const p = new URLSearchParams(searchParams.toString());
    if (id) {
      p.set("plan_version_id", id);
    } else {
      p.delete("plan_version_id");
    }
    router.push(`/regions/${regionId}/plans/dashboard?${p.toString()}`);
  };

  const refetchAll = () => {
    refetchSummary();
    refetchDept();
    refetchTree();
  };

  const departments = deptData?.departments || [];
  const rawNodes = treeData?.tree || [];
  const activePlan = treeData?.version || masterPlans.find((p) => p.regional_plan_version_id === effectivePlanVersionId);

  // Build recursive progress tree
  const { treeRoots } = useMemo(() => {
    const map = new Map<string, RegionalPlanNode & { children: any[] }>();
    rawNodes.forEach((n) => {
      map.set(n.regional_plan_node_id, { ...n, children: [] });
    });

    const roots: (RegionalPlanNode & { children: any[] })[] = [];
    rawNodes.forEach((n) => {
      const current = map.get(n.regional_plan_node_id)!;
      if (n.parent_id && map.has(n.parent_id)) {
        map.get(n.parent_id)!.children.push(current);
      } else {
        roots.push(current);
      }
    });

    return { treeRoots: roots };
  }, [rawNodes]);

  if (isPlansLoading || isSummaryLoading) return <Loading01 />;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <RegionalPlanTabsHeader />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <LayoutDashboard className="h-4 w-4" />
            <span>Strategic Performance Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Plan Execution Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time execution rollups, milestone achievement, and directorate scorecard analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Plan Selector Dropdown */}
          <select
            value={effectivePlanVersionId || ""}
            onChange={(e) => handleSelectPlan(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground shadow-xs focus:ring-1 focus:ring-ring"
          >
            {masterPlans.map((plan) => (
              <option key={plan.regional_plan_version_id} value={plan.regional_plan_version_id}>
                {plan.draft_name} ({plan.start_year} - {plan.end_year})
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={refetchAll} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isSummaryFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {effectivePlanVersionId && (
            <Link href={`/regions/${regionId}/plans/${effectivePlanVersionId}/hierarchy`}>
              <Button size="sm" className="gap-2 shadow-xs">
                <GitBranch className="h-4 w-4" />
                <span>Open Hierarchy</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plans */}
        <div className="rounded-xl border bg-card p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Strategic Plans
            </span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.summary?.total_plans ?? summary?.total_plans ?? masterPlans.length}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              {summary?.summary?.status_breakdown?.active_plans ?? summary?.active_plans ?? 0} actively executing cycles
            </span>
          </div>
        </div>

        {/* Portfolio Average Progress */}
        <div className="rounded-xl border bg-card p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Portfolio Progress
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.summary?.avg_progress ?? summary?.portfolio_progress_percent ?? 0}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              confirmed rollups
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${Math.min(100, summary?.summary?.avg_progress ?? summary?.portfolio_progress_percent ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Active Milestones */}
        <div className="rounded-xl border bg-card p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Milestones
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary?.summary?.active_milestones ?? summary?.active_milestones ?? rawNodes.length}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Hierarchical goals & leaf KPIs
            </span>
          </div>
        </div>

        {/* Delayed Execution Indicators */}
        <div className="rounded-xl border bg-card p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Delayed KPIs
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-rose-600">
              {summary?.summary?.delayed_kpis ?? summary?.delayed_kpis ?? 0}
            </span>
            <span className="text-xs text-muted-foreground block mt-1">
              Behind target schedule
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Department Scorecard & Progress Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Directorate Performance Leaderboard (1 Col) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Directorate Performance
              </h3>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {departments.length} Units
            </Badge>
          </div>

          {departments.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No department milestones recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {departments.map((dept, idx) => (
                <div key={dept.regional_structure_id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {dept.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {dept.assigned_nodes_count} assigned milestones
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-foreground shrink-0">
                      {dept.avg_progress}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        dept.avg_progress >= 100
                          ? "bg-emerald-600"
                          : dept.avg_progress > 50
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, dept.avg_progress)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2 & 3: Detailed Progress Tree (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">
                  Strategic Milestone Progress Tree
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activePlan ? activePlan.draft_name : "Select a plan version"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-40">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter nodes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 pl-7 text-xs"
                />
              </div>

              {effectivePlanVersionId && (
                <Link href={`/regions/${regionId}/plans/${effectivePlanVersionId}/hierarchy`}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                    <span>Manage</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {treeRoots.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No milestones found for the selected plan.
            </div>
          ) : (
            <div className="space-y-2">
              {treeRoots.map((root, index) => (
                <DashboardTreeRow
                  key={root.regional_plan_node_id}
                  node={root}
                  indexPrefix={`${index + 1}`}
                  collapsedNodes={collapsedNodes}
                  toggleCollapse={toggleCollapse}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTreeRow({
  node,
  indexPrefix,
  collapsedNodes,
  toggleCollapse,
}: {
  node: RegionalPlanNode & { children?: RegionalPlanNode[] };
  indexPrefix: string;
  collapsedNodes: Record<string, boolean>;
  toggleCollapse: (id: string) => void;
}) {
  const isCollapsed = collapsedNodes[node.regional_plan_node_id];
  const hasChildren = node.children && node.children.length > 0;
  const progress = (node as any).execution_progress_percent ?? 0;
  const status = (node as any).evaluation_status || "not_started";
  const achievementStatus = node.period_actual_status || "empty";

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
          node.level > 1 ? "ml-4 sm:ml-6" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => toggleCollapse(node.regional_plan_node_id)}
              className="p-0.5 hover:bg-muted rounded text-muted-foreground"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
            {indexPrefix}
          </span>

          <span className="font-medium text-xs text-foreground truncate max-w-xs sm:max-w-sm">
            {node.title}
          </span>

          {node.target_unit && (
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {node.target_unit}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Status Badge */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
              status === "completed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : status === "in_progress"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {status.replace("_", " ")}
          </span>

          {/* Progress */}
          <div className="w-16 text-right">
            <span className="font-mono font-bold text-xs text-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      {!isCollapsed && hasChildren && (
        <div className="space-y-1">
          {node.children!.map((child, cIdx) => (
            <DashboardTreeRow
              key={child.regional_plan_node_id}
              node={child}
              indexPrefix={`${indexPrefix}.${cIdx + 1}`}
              collapsedNodes={collapsedNodes}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
