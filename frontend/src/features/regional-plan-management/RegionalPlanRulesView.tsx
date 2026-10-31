"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  Layers,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { actionFeedback } from "@/components/action-feedback";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetRegionalPlanRulesQuery,
  useUpdateRegionalPlanRuleMutation,
  useDeleteRegionalPlanRuleMutation,
} from "@/redux/api/regionalPlanApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import type { RegionalPlanRule } from "@/redux/types/regionalPlan";
import { CreateRegionalPlanRuleModal } from "./modals/CreateRegionalPlanRuleModal";

export function RegionalPlanRulesView() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id as string;
  const { can } = usePermissions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RegionalPlanRule | null>(null);
  const [search, setSearch] = useState("");

  const {
    data: rules = [],
    isLoading,
    isError,
    refetch,
  } = useGetRegionalPlanRulesQuery({ region_id: regionId }, { skip: !regionId });

  const [updateRule] = useUpdateRegionalPlanRuleMutation();
  const [deleteRule] = useDeleteRegionalPlanRuleMutation();

  const canManage =
    can("REGIONAL_PLAN_RULES:CREATE") ||
    can("REGIONAL_PLAN_RULES:UPDATE") ||
    can("REGIONAL_PLANS:UPDATE") ||
    can("REGIONS:MANAGE");

  const handleEditRule = (rule: RegionalPlanRule) => {
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleCreateRule = () => {
    setSelectedRule(null);
    setIsModalOpen(true);
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
    if (!(await actionFeedback.confirm(`Delete rule "${rule.name}"? Active plan versions using it should be checked.`, { destructive: true }))) {
      return;
    }

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
        r.performance_scoring_policy?.toLowerCase().includes(term)
    );
  }, [rules, search]);

  const columns: ColumnDef<RegionalPlanRule>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Rule Name",
        cell: ({ row }) => {
          const rule = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{rule.name}</div>
                <div className="text-xs text-muted-foreground">
                  Regional planning rule configuration
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "weight_start",
        header: "Target Required From",
        cell: ({ row }) => {
          const steps = (row.original.steps || []).slice().sort((a, b) => (a.step_order ?? a.level ?? 0) - (b.step_order ?? b.level ?? 0));
          const startStep = steps.find((s) => s.requires_weight);
          const startOrder = startStep ? (startStep.step_order ?? startStep.level) : null;
          if (!startOrder) {
            return <span className="text-xs text-muted-foreground">None</span>;
          }
          return (
            <span className="text-xs font-medium text-foreground">
              Level {startOrder} (inherited below)
            </span>
          );
        },
      },
      {
        accessorKey: "steps",
        header: "Hierarchy Depth",
        cell: ({ row }) => {
          const steps = row.original.steps || [];
          const count = steps.length > 0 ? steps.length : (row.original.name?.includes("3") ? 3 : 4);
          const tooltip =
            steps.length > 0
              ? steps.map((s) => s.label || s.name || `Level ${s.level}`).join(" → ")
              : (count === 3 ? "SF → Goal → KPI" : "Strategic Priority → Goal → KPI → Task");
          return (
            <Badge
              variant="outline"
              title={tooltip}
              className="font-semibold text-xs py-0.5 px-2.5 bg-muted/40 hover:bg-muted/70 transition-colors whitespace-nowrap cursor-default"
            >
              {count} Levels
            </Badge>
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
              {isCap100 ? "Cap at 100%" : "Allow Over-achievement"}
            </Badge>
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
                  ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold"
                  : "text-[11px]"
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
                variant="ghost"
                size="icon"
                onClick={() => handleEditRule(rule)}
                className="h-8 w-8 text-foreground hover:bg-muted"
                title="Edit rule"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(rule)}
                className="h-8 text-xs px-2.5"
              >
                {rule.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteRule(rule)}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                title="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canManage, regionId]
  );

  return (
    <div className="space-y-6">
      <TableLayout
        title="Plan Rules"
        description="Configure hierarchy depth, node labels, step colors, target evaluation thresholds, and performance scoring policies for regional strategic cycles."
        actions={
          canManage
            ? [
                {
                  label: "New Plan Rule",
                  icon: <Plus className="h-4 w-4" />,
                  onClick: handleCreateRule,
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              className="h-9 px-2 text-xs"
            >
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

      {/* Create & Edit Modal */}
      <CreateRegionalPlanRuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRule(null);
        }}
        regionId={regionId}
        rule={selectedRule}
        onSuccess={refetch}
      />
    </div>
  );
}
