"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
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
import {
  useGetRegionalPlanRulesQuery,
  useCreateRegionalPlanRuleMutation,
  useUpdateRegionalPlanRuleMutation,
  useDeleteRegionalPlanRuleMutation,
} from "@/redux/api/regionalPlanApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { RegionalPlanTabsHeader } from "./RegionalPlanTabsHeader";
import type { RegionalPlanRule } from "@/redux/types/regionalPlan";

export function RegionalPlanRulesView() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [scoringPolicy, setScoringPolicy] = useState<"CAP_100" | "ALLOW_OVER_ACHIEVEMENT">("CAP_100");
  const [search, setSearch] = useState("");

  const {
    data: rules = [],
    isLoading,
    isError,
    refetch,
  } = useGetRegionalPlanRulesQuery({ region_id: regionId }, { skip: !regionId });

  const [createRule, { isLoading: isCreating }] = useCreateRegionalPlanRuleMutation();
  const [updateRule] = useUpdateRegionalPlanRuleMutation();
  const [deleteRule] = useDeleteRegionalPlanRuleMutation();

  const canManage = can("REGIONAL_PLAN_RULES:CREATE") || can("REGIONAL_PLANS:UPDATE") || can("REGIONS:MANAGE");

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      actionFeedback.error("Rule name is required");
      return;
    }
    try {
      await createRule({
        region_id: regionId,
        data: {
          name: ruleName.trim(),
          performance_scoring_policy: scoringPolicy,
          is_active: true,
        },
      }).unwrap();

      actionFeedback.success("Regional plan rule created successfully");
      setIsCreateOpen(false);
      setRuleName("");
      setScoringPolicy("CAP_100");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to create rule");
    }
  };

  const handleToggleActive = async (rule: RegionalPlanRule) => {
    if (!regionId) return;
    try {
      await updateRule({
        id: rule.regional_plan_rule_id,
        region_id: regionId,
        data: {
          is_active: !rule.is_active,
        },
      }).unwrap();

      actionFeedback.success(`Rule "${rule.name}" ${!rule.is_active ? "activated" : "deactivated"}`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to toggle rule");
    }
  };

  const handleDeleteRule = async (rule: RegionalPlanRule) => {
    if (!regionId) return;
    if (!confirm(`Are you sure you want to delete rule "${rule.name}"?`)) return;

    try {
      await deleteRule({
        id: rule.regional_plan_rule_id,
        region_id: regionId,
      }).unwrap();

      actionFeedback.success(`Rule "${rule.name}" deleted`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to delete rule");
    }
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return rules;
    const term = search.toLowerCase();
    return rules.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.performance_scoring_policy.toLowerCase().includes(term)
    );
  }, [rules, search]);

  const columns: ColumnDef<RegionalPlanRule>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Planning Rule & Hierarchy",
        cell: ({ row }) => {
          const rule = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{rule.name}</div>
                <div className="text-xs text-muted-foreground">
                  Applied to regional strategic cycles, validating leaf KPIs and parent rollups
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "performance_scoring_policy",
        header: "Scoring Policy",
        cell: ({ row }) => {
          const policy = row.original.performance_scoring_policy;
          const isCap100 = policy === "CAP_100";
          return (
            <Badge
              variant="outline"
              className={
                isCap100
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 text-xs font-semibold"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 text-xs font-semibold"
              }
            >
              {isCap100 ? "Capped at 100%" : "Allow Over-achievement"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "steps",
        header: "Hierarchy Depth & Step Colors",
        cell: ({ row }) => {
          const steps = row.original.steps || [];
          if (steps.length === 0) {
            return <span className="text-xs text-muted-foreground">Standard 4-level hierarchy</span>;
          }
          return (
            <div className="space-y-1">
              <span className="font-semibold text-xs text-foreground">{steps.length} Levels</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {steps.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border"
                    style={{
                      borderColor: (s.color_hex || "#6B7280") + "40",
                      backgroundColor: (s.color_hex || "#6B7280") + "15",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color_hex || "#6B7280" }}
                    />
                    <span>{s.name}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const active = row.original.is_active;
          return (
            <Badge
              variant={active ? "default" : "secondary"}
              className={
                active
                  ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold"
                  : "text-[10px]"
              }
            >
              {active ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const rule = row.original;
          if (!canManage) return null;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(rule)}
                className="h-8 text-xs"
              >
                {rule.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteRule(rule)}
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                title="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage]
  );

  return (
    <div className="space-y-6">
      <RegionalPlanTabsHeader />

      <TableLayout
        title="Plan Rules"
        description="Configure hierarchy depth, leaf weights, contribution rollups, step colors, and performance scoring policies for strategic planning cycles."
        actions={
          canManage
            ? [
                {
                  label: "New Plan Rule",
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => setIsCreateOpen(true),
                },
              ]
            : []
        }
      >
        <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <div className="max-w-sm w-full">
            <Input
              placeholder="Search plan rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-9 px-2 text-xs">
              Clear
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      </TableLayout>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Create Plan Rule
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Rule Name</label>
              <Input
                placeholder="e.g. Standard Regional Strategic Rule"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Performance Scoring Policy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScoringPolicy("CAP_100")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scoringPolicy === "CAP_100"
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="font-semibold text-xs text-foreground">CAP 100%</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Scores cannot exceed 100% of target
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScoringPolicy("ALLOW_OVER_ACHIEVEMENT")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scoringPolicy === "ALLOW_OVER_ACHIEVEMENT"
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <p className="font-semibold text-xs text-foreground">Over-achievement</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Allow achievement exceeding 100%
                  </p>
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
