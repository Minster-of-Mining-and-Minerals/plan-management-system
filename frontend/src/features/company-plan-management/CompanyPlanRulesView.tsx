"use client";

import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Shield,
  Plus,
  Trash2,
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
  useGetCompanyPlanRulesQuery,
  useCreateCompanyPlanRuleMutation,
  useUpdateCompanyPlanRuleMutation,
  useDeleteCompanyPlanRuleMutation,
} from "@/redux/api/companyPlanApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { CompanyPlanTabsHeader } from "./CompanyPlanTabsHeader";
import type { CompanyPlanRule } from "@/redux/types/companyPlan";

export function CompanyPlanRulesView() {
  const params = useParams<{ id: string }>();
  const companyId = params?.id;
  const { can } = usePermissions();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [scoringPolicy, setScoringPolicy] = useState<"CAP_100" | "ALLOW_OVER_ACHIEVEMENT">("CAP_100");
  const searchParams = useSearchParams();
  const search = searchParams?.get("search") || "";

  const {
    data: rules = [],
    isLoading,
    isError,
    refetch,
  } = useGetCompanyPlanRulesQuery({ company_id: companyId }, { skip: !companyId });

  const [createRule, { isLoading: isCreating }] = useCreateCompanyPlanRuleMutation();
  const [updateRule] = useUpdateCompanyPlanRuleMutation();
  const [deleteRule] = useDeleteCompanyPlanRuleMutation();

  const canManage = can("COMPANY_PLAN_RULES:CREATE") || can("COMPANY_PLANS:UPDATE") || can("COMPANIES:MANAGE");

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      actionFeedback.error("Rule name is required");
      return;
    }
    try {
      await createRule({
        company_id: companyId,
        data: {
          name: ruleName.trim(),
          performance_scoring_policy: scoringPolicy,
          is_active: true,
        },
      }).unwrap();

      actionFeedback.success("Company plan rule created successfully");
      setIsCreateOpen(false);
      setRuleName("");
      setScoringPolicy("CAP_100");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to create rule");
    }
  };

  const handleToggleActive = async (rule: CompanyPlanRule) => {
    if (!companyId) return;
    try {
      await updateRule({
        id: rule.company_plan_rule_id,
        company_id: companyId,
        data: {
          is_active: !rule.is_active,
        },
      }).unwrap();

      actionFeedback.success(`Rule "${rule.name}" ${!rule.is_active ? "activated" : "deactivated"}`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Failed to update rule status");
    }
  };

  const handleDeleteRule = async (rule: CompanyPlanRule) => {
    if (!companyId) return;
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return;

    try {
      await deleteRule({ id: rule.company_plan_rule_id, company_id: companyId }).unwrap();
      actionFeedback.success("Company plan rule deleted");
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      actionFeedback.error(errorObj?.data?.message || errorObj?.message || "Cannot delete rule (it may be in use)");
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      return (
        search === "" ||
        rule.name.toLowerCase().includes(search.toLowerCase()) ||
        rule.performance_scoring_policy.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [rules, search]);

  const columns: ColumnDef<CompanyPlanRule>[] = [
    {
      accessorKey: "name",
      header: "Rule Name & Details",
      cell: ({ row }) => {
        const rule = row.original;
        return (
          <div className="flex items-start gap-3 py-1">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span>{rule.name}</span>
                {rule.is_active ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Policy: <span className="font-mono">{rule.performance_scoring_policy}</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "steps",
      header: "Configured Hierarchy Levels",
      cell: ({ row }) => {
        const rule = row.original;
        const steps = rule.steps || [];
        if (steps.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Standard Default Steps</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {steps
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((step) => (
                <Badge
                  key={step.company_plan_rule_step_id || step.level}
                  variant="secondary"
                  className="text-[11px] font-normal gap-1"
                >
                  <span className="font-bold text-primary">L{step.level}:</span>
                  <span>{step.name}</span>
                  {step.allow_kpi && (
                    <span className="text-[9px] text-emerald-600 font-semibold">(KPI)</span>
                  )}
                </Badge>
              ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const rule = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleToggleActive(rule)}
                >
                  {rule.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                  title="Delete rule"
                  onClick={() => handleDeleteRule(rule)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
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
        title="Company Planning Rules"
        description="Define structural validation rules, depth levels (Strategic Focus, Goals, KPIs, Tasks), and performance score policies."
        actions={[
          ...(canManage
            ? [
                {
                  label: "New Planning Rule",
                  icon: <Plus className="h-4 w-4" />,
                  onClick: () => {
                    setRuleName("");
                    setScoringPolicy("CAP_100");
                    setIsCreateOpen(true);
                  },
                },
              ]
            : []),
        ]}
      >
        <DataTable
          columns={columns}
          data={filteredRules}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          resetKey={search}
        />
      </TableLayout>

      {/* CREATE RULE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateRule}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Create Planning Rule
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Rule Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Standard 4-Tier Corporate Rule"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">
                  Performance Scoring Policy
                </label>
                <select
                  aria-label="Performance Scoring Policy"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  value={scoringPolicy}
                  onChange={(e) => setScoringPolicy(e.target.value as "CAP_100" | "ALLOW_OVER_ACHIEVEMENT")}
                >
                  <option value="CAP_100">Capped at 100% (No over-achievement bonus)</option>
                  <option value="ALLOW_OVER_ACHIEVEMENT">Uncapped / Allow Over-Achievement</option>
                </select>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Default Hierarchy Hierarchy Steps:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <span>• Level 1: Strategic Focus</span>
                  <span>• Level 2: Company Goal</span>
                  <span>• Level 3: KPI (Weights enforced)</span>
                  <span>• Level 4: Operational Task</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
