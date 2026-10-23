"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronRight,
  RefreshCw,
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
import Loading01 from "@/features/template/component/Loading/Loading01";

import {
  useGetRegionalPlanRulesQuery,
  useCreateRegionalPlanRuleMutation,
  useUpdateRegionalPlanRuleMutation,
  useDeleteRegionalPlanRuleMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPlanRule } from "@/redux/types/regionalPlan";

export function RegionalPlanRulesView() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id;
  const { can } = usePermissions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [scoringPolicy, setScoringPolicy] = useState<"CAP_100" | "ALLOW_OVER_ACHIEVEMENT">("CAP_100");

  const {
    data: rules = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetRegionalPlanRulesQuery({ region_id: regionId }, { skip: !regionId });

  const [createRule, { isLoading: isCreating }] = useCreateRegionalPlanRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateRegionalPlanRuleMutation();
  const [deleteRule, { isLoading: isDeleting }] = useDeleteRegionalPlanRuleMutation();

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
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to create rule");
    }
  };

  const handleToggleActive = async (rule: RegionalPlanRule) => {
    try {
      await updateRule({
        id: rule.regional_plan_rule_id,
        region_id: regionId,
        data: { is_active: !rule.is_active },
      }).unwrap();

      actionFeedback.success(`Rule "${rule.name}" ${!rule.is_active ? "activated" : "deactivated"}`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to update rule");
    }
  };

  const handleDeleteRule = async (rule: RegionalPlanRule) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;
    try {
      await deleteRule({ id: rule.regional_plan_rule_id, region_id: regionId }).unwrap();
      actionFeedback.success("Rule deleted successfully");
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to delete rule");
    }
  };

  if (isLoading) return <Loading01 />;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Shield className="h-4 w-4" />
            <span>Governance & Structure Rules</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Regional Planning Rules
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure hierarchy depth, leaf weights, contribution rollups, and performance scoring policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {canManage && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              <span>New Plan Rule</span>
            </Button>
          )}
        </div>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 gap-6">
        {rules.map((rule) => (
          <div key={rule.regional_plan_rule_id} className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">{rule.name}</h3>
                  <Badge variant={rule.is_active ? "default" : "secondary"} className="text-xs">
                    {rule.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    Scoring: {rule.performance_scoring_policy}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to regional strategic cycles, validating leaf KPIs and parent rollups.
                </p>
              </div>

              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(rule)}
                    className="text-xs"
                  >
                    {rule.is_active ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule)}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Hierarchy Steps Breakdown */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Configured Hierarchy Levels
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {rule.steps && rule.steps.length > 0 ? (
                  rule.steps.map((step) => (
                    <div
                      key={step.regional_plan_rule_step_id}
                      className="p-3.5 rounded-lg border bg-muted/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-primary">
                          Level {step.level}
                        </span>
                        {step.allow_kpi && (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Targetable
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-foreground">{step.name}</p>
                      <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/60">
                        <div>Weight: {step.requires_weight ? "Required" : "Optional"}</div>
                        <div>Contribution: {step.requires_contribution_weight ? "Required (100%)" : "Optional"}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-xs text-muted-foreground">
                    Standard 4-level steps applied: Priority (L1) → Goal (L2) → KPI (L3) → Task (L4)
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Plan Rule */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Create Regional Plan Rule</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateRule} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Rule Name *</label>
              <Input
                placeholder="e.g. Standard Regional Planning Rule"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Performance Scoring Policy</label>
              <select
                value={scoringPolicy}
                onChange={(e) => setScoringPolicy(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value="CAP_100">CAP_100 (Max progress capped at 100%)</option>
                <option value="ALLOW_OVER_ACHIEVEMENT">ALLOW_OVER_ACHIEVEMENT (Permit scores &gt; 100%)</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
