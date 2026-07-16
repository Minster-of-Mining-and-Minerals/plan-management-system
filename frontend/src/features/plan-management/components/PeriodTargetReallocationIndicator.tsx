"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PeriodTargetReallocationReportingItem, PlanNode } from "@/redux/types/plan";
import type { TargetUnit } from "@/redux/types/planningConfig";
import { formatNodeWeight } from "@/utils/planRuleUtils";
import { usePeriodTargetReallocationForNode } from "@/hooks/usePeriodTargetReallocationReporting";

type PeriodTargetReallocationIndicatorProps = {
  node: Pick<PlanNode, "plan_node_id" | "weight_mode" | "target_unit">;
  configuredUnits?: TargetUnit[];
  variant?: "compact" | "card" | "table";
  className?: string;
};

function formatSignedAdjustment(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatTarget(
  value: number | null | undefined,
  node: Pick<PlanNode, "weight_mode" | "target_unit">,
  configuredUnits?: TargetUnit[]
): string {
  if (value == null) return "—";
  return formatNodeWeight(value, node.weight_mode, node.target_unit, configuredUnits);
}

export function PeriodTargetReallocationIndicator({
  node,
  configuredUnits,
  variant = "compact",
  className,
}: PeriodTargetReallocationIndicatorProps) {
  const { item } = usePeriodTargetReallocationForNode(node.plan_node_id);

  if (!item) {
    return null;
  }

  const originalLabel = formatTarget(item.original_target, node, configuredUnits);
  const currentLabel = formatTarget(item.current_target, node, configuredUnits);
  const net = Number(item.net_adjustment) || 0;
  const hasAdjustment = Math.abs(net) > 0.001;

  if (variant === "table") {
    return (
      <div className={cn("space-y-0.5 text-[11px] text-muted-foreground", className)}>
        <p>
          Target: <span className="font-medium text-foreground">{currentLabel}</span>
        </p>
        <p>
          Originally: <span className="font-medium text-slate-700">{originalLabel}</span>
          {hasAdjustment && (
            <>
              {" · "}
              Adjustment:{" "}
              <span
                className={cn(
                  "font-medium",
                  net < 0 ? "text-amber-800" : "text-emerald-800"
                )}
              >
                {formatSignedAdjustment(net)}
              </span>
            </>
          )}
        </p>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-md border border-sky-100 bg-sky-50/80 px-2.5 py-2 text-xs text-sky-950",
          className
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700/90 mb-1">
          Target reallocation
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Target: <span className="font-semibold">{currentLabel}</span>
          </span>
          <span>
            Originally: <span className="font-semibold">{originalLabel}</span>
          </span>
          {hasAdjustment && (
            <span>
              Adjustment:{" "}
              <span
                className={cn(
                  "font-semibold",
                  net < 0 ? "text-amber-800" : "text-emerald-800"
                )}
              >
                {formatSignedAdjustment(net)}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        variant="outline"
        className="text-[10px] py-0 h-4 border-slate-200 bg-slate-50 text-slate-700"
      >
        Originally: {originalLabel}
      </Badge>
      {hasAdjustment && (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] py-0 h-4",
            net < 0
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          )}
        >
          Adjustment: {formatSignedAdjustment(net)}
        </Badge>
      )}
    </div>
  );
}

/** Pure presentational helper for tests / offline rendering */
export function buildReallocationIndicatorLabels(
  item: PeriodTargetReallocationReportingItem
): {
  original: number | null;
  current: number | null;
  adjustment: number;
  hasAdjustment: boolean;
} {
  const adjustment = Number(item.net_adjustment) || 0;
  return {
    original: item.original_target,
    current: item.current_target,
    adjustment,
    hasAdjustment: Math.abs(adjustment) > 0.001,
  };
}
