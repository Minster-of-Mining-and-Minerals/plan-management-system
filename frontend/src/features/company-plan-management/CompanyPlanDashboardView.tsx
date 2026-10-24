"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Layers,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building2,
  GitBranch,
  Search,
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
  useGetCompanyExecutionDashboardSummaryQuery,
  useGetCompanyExecutionDashboardProgressTreeQuery,
  useGetCompanyExecutionDashboardDepartmentUserQuery,
  useGetCompanyPlanVersionsQuery,
} from "@/redux/api/companyPlanApi";
import { CompanyPlanTabsHeader } from "./CompanyPlanTabsHeader";
import type { CompanyPlanNode } from "@/redux/types/companyPlan";

export function CompanyPlanDashboardView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const companyId = params?.id;

  const urlPlanVersionId = searchParams.get("plan_version_id") || undefined;
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState<string | undefined>(urlPlanVersionId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // 1. Fetch all master plans in this company for the dropdown
  const { data: masterPlans = [], isLoading: isPlansLoading } = useGetCompanyPlanVersionsQuery(
    { company_id: companyId, version_kind: "master" },
    { skip: !companyId }
  );

  // Set default plan version if none selected
  const effectivePlanVersionId = selectedPlanVersionId || masterPlans[0]?.company_plan_version_id;

  // 2. Fetch Dashboard Summary
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    refetch: refetchSummary,
  } = useGetCompanyExecutionDashboardSummaryQuery(
    { company_id: companyId },
    { skip: !companyId }
  );

  // 3. Fetch Department Performance
  const {
    data: deptData,
    refetch: refetchDept,
  } = useGetCompanyExecutionDashboardDepartmentUserQuery(
    { company_id: companyId, plan_version_id: effectivePlanVersionId },
    { skip: !companyId }
  );

  // 4. Fetch Progress Tree
  const {
    data: treeData,
    isLoading: isTreeLoading,
    refetch: refetchTree,
  } = useGetCompanyExecutionDashboardProgressTreeQuery(
    { company_id: companyId, plan_version_id: effectivePlanVersionId },
    { skip: !companyId || !effectivePlanVersionId }
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
    router.push(`?${p.toString()}`);
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchDept();
    refetchTree();
  };

  const filteredTree = useMemo(() => {
    if (!treeData?.tree) return [];
    if (!search && statusFilter === "all") return treeData.tree;

    const filterNode = (node: CompanyPlanNode): CompanyPlanNode | null => {
      const matchesSearch =
        search === "" ||
        node.title.toLowerCase().includes(search.toLowerCase()) ||
        node.description?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "approved" && node.period_actual_status === "approved") ||
        (statusFilter === "pending" && node.period_actual_status === "submitted") ||
        (statusFilter === "empty" && (!node.period_actual_status || node.period_actual_status === "empty"));

      let filteredChildren: CompanyPlanNode[] = [];
      if (node.children && node.children.length > 0) {
        filteredChildren = node.children
          .map(filterNode)
          .filter((c): c is CompanyPlanNode => c !== null);
      }

      if (matchesSearch && matchesStatus) {
        return { ...node, children: filteredChildren };
      }

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return treeData.tree.map(filterNode).filter((n): n is CompanyPlanNode => n !== null);
  }, [treeData, search, statusFilter]);

  if (isSummaryLoading || isPlansLoading) {
    return <Loading01 />;
  }

  const metrics = summary?.metrics;

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <CompanyPlanTabsHeader />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Company Strategic Plan Dashboard
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {summary?.company?.name || "Corporate"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Multi-year corporate strategic targets, KPI execution, milestones, and department progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {masterPlans.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Active Plan:</span>
              <select
                aria-label="Active Plan"
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                value={effectivePlanVersionId || ""}
                onChange={(e) => handleSelectPlan(e.target.value)}
              >
                {masterPlans.map((p) => (
                  <option key={p.company_plan_version_id} value={p.company_plan_version_id}>
                    {p.draft_name} ({p.start_year} - {p.end_year})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isSummaryFetching}
            className="gap-2 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSummaryFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Progress */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {metrics?.overall_execution_progress ?? 0}%
            </span>
          </div>
          <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, metrics?.overall_execution_progress || 0)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Aggregate KPI target fulfillment across registered focus areas
          </p>
        </div>

        {/* Master Plans */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Master Strategic Plans
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {metrics?.total_master_plans ?? masterPlans.length}
            </span>
            <span className="text-xs text-muted-foreground">versions</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{metrics?.total_annual_plans ?? 0} Annual Plans</span>
            <span>•</span>
            <span>{metrics?.total_execution_periods ?? 0} Periods</span>
          </div>
        </div>

        {/* Total KPIs */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monitored KPIs
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {metrics?.total_kpis ?? 0}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              ({metrics?.approved_kpis ?? 0} signed-off)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {metrics?.total_plan_nodes ?? 0} Total structural nodes defined
          </p>
        </div>

        {/* Delayed / Needs Attention */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Needs Attention
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">
              {metrics?.delayed_kpis ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">delayed KPIs</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            KPIs performing below 50% of expected target values
          </p>
        </div>
      </div>

      {/* DEPARTMENT / DIVISION PERFORMANCE */}
      {deptData?.departments && deptData.departments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Department & Division Execution Breakdown
              </h2>
              <p className="text-xs text-muted-foreground">
                Progress and node assignment breakdown by corporate division.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deptData.departments.map((dept) => (
              <div
                key={dept.company_structure_id}
                className="rounded-xl border border-border/70 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground line-clamp-1">
                    {dept.name}
                  </span>
                  <Badge
                    variant={
                      dept.status === "on_track"
                        ? "default"
                        : dept.status === "needs_attention"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-[10px] uppercase font-bold"
                  >
                    {dept.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dept.assigned_nodes_count} assigned nodes</span>
                  <span className="font-bold text-foreground">{dept.avg_progress}% avg</span>
                </div>

                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, dept.avg_progress)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIERARCHICAL EXECUTION PROGRESS TREE */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Strategic Execution Tree (SF → Goals → KPIs → Tasks)
            </h2>
            <p className="text-xs text-muted-foreground">
              Deep hierarchical tree of the active master plan showing target attainment and reporting status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                className="h-8 pl-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              aria-label="Filter status"
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Signed Off</option>
              <option value="pending">Submitted</option>
              <option value="empty">Pending Entry</option>
            </select>

            {effectivePlanVersionId && (
              <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
                <Link href={`/companies/${companyId}/plans/${effectivePlanVersionId}/hierarchy`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Full Hierarchy View
                </Link>
              </Button>
            )}
          </div>
        </div>

        {isTreeLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading execution progress tree...
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No hierarchy nodes match your criteria.</p>
            <p className="text-xs text-muted-foreground">
              Verify that the active plan version contains configured goals and indicators.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTree.map((node) => (
              <TreeNodeItem
                key={node.company_plan_node_id}
                node={node}
                level={1}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={toggleCollapse}
                companyId={companyId!}
                planVersionId={effectivePlanVersionId!}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNodeItem({
  node,
  level,
  collapsedNodes,
  onToggleCollapse,
  companyId,
  planVersionId,
}: {
  node: CompanyPlanNode;
  level: number;
  collapsedNodes: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  companyId: string;
  planVersionId: string;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = !!collapsedNodes[node.company_plan_node_id];

  const target = node.annual_target || node.period_target || 0;
  const actual = node.annual_actual || node.period_actual || 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;

  const levelBadges: Record<number, { label: string; color: string }> = {
    1: { label: "SF", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
    2: { label: "GOAL", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
    3: { label: "KPI", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
    4: { label: "TASK", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  };

  const badgeInfo = levelBadges[node.level] || { label: `L${node.level}`, color: "bg-muted text-muted-foreground" };

  return (
    <div className="space-y-1">
      <div
        className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors group"
        style={{ marginLeft: `${(level - 1) * 16}px` }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleCollapse(node.company_plan_node_id)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 ${badgeInfo.color}`}>
            {badgeInfo.label}
          </Badge>

          <span className="font-semibold text-xs text-foreground truncate">{node.title}</span>

          {node.target_unit && (
            <span className="text-[10px] text-muted-foreground font-mono">({node.target_unit})</span>
          )}
        </div>

        {/* Right side: target vs actual and status */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          {target > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                {actual} / {target}
              </span>
              <div className="w-16 bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-bold font-mono text-[11px] w-8 text-right">
                {progressPercent}%
              </span>
            </div>
          )}

          {node.period_actual_status && node.period_actual_status !== "empty" && (
            <Badge
              variant={node.period_actual_status === "approved" ? "default" : "secondary"}
              className="text-[10px] capitalize"
            >
              {node.period_actual_status}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 px-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Link href={`/companies/${companyId}/plans/${planVersionId}/hierarchy`}>
              Inspect
            </Link>
          </Button>
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="space-y-1">
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.company_plan_node_id}
              node={child}
              level={level + 1}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              companyId={companyId}
              planVersionId={planVersionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
