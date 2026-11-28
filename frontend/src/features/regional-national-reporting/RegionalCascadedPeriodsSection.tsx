"use client";

import React, { useMemo, useState } from "react";
import {
  NationalReportingAssignment,
  NationalReportingRequirement,
  ReportingPeriod,
} from "@/redux/types/nationalReporting";
import { usePerformanceColorThresholds } from "@/hooks/usePerformanceColorThresholds";
import {
  LOCKED_STATUS_COLOR,
  resolveThresholdForPercentage,
} from "@/utils/performanceColorUtils";
import { PerformanceColorBadge } from "@/features/plan-management/components/PerformanceColorBadge";
import { PeriodCountdownProgressBar } from "./PeriodCountdownProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  History,
  Layers,
  Lock,
  Unlock,
} from "lucide-react";

interface Props {
  assignment: NationalReportingAssignment;
  req?: NationalReportingRequirement;
  recurringPeriods: ReportingPeriod[];
  divisionCustomNameMap: Record<string, string>;
  isFormReportingActive?: boolean;
  onOpenPeriodForm: (period: ReportingPeriod) => void;
  onViewReceipt: (period: ReportingPeriod) => void;
  onViewHistory: (period: ReportingPeriod) => void;
}

interface CascadedNode {
  id: string;
  label: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  target: number | null;
  actual: number | null;
  achievementPercent: number | null;
  hasTarget: boolean;
  hasActual: boolean;
  reportedCount: number;
  totalLeaves: number;
  isLocked: boolean;
  lockState: string;
  lockReason?: string | null;
  leafPeriod?: ReportingPeriod;
  children: CascadedNode[];
}

function isPeriodReported(p: ReportingPeriod): boolean {
  return (
    p.reported_actual !== null &&
    p.reported_actual !== undefined &&
    ["published", "submitted"].includes(p.submission_status || p.status || "")
  );
}

function resolveLeafTarget(p: ReportingPeriod, assignment: NationalReportingAssignment): number | null {
  if (p.monthly_target != null && !isNaN(Number(p.monthly_target))) return Number(p.monthly_target);
  if (p.planned_target != null && !isNaN(Number(p.planned_target))) return Number(p.planned_target);
  const pt = assignment.period_targets || {};
  const direct = pt[p.period_label] ?? pt[String(p.period_index)];
  if (direct != null && !isNaN(Number(direct))) return Number(direct);
  return null;
}

function buildLeafNode(
  p: ReportingPeriod,
  assignment: NationalReportingAssignment,
  divisionCustomNameMap: Record<string, string>
): CascadedNode {
  const reported = isPeriodReported(p);
  const target = resolveLeafTarget(p, assignment);
  const actual = reported && p.reported_actual != null ? Number(p.reported_actual) : null;
  const ach =
    target != null && target > 0 && actual != null
      ? Math.round((actual / target) * 1000) / 10
      : null;

  return {
    id: p.period_label,
    label: divisionCustomNameMap[p.period_label] || p.name || p.period_label,
    subtitle: `${p.period_label}${p.start_date && p.end_date ? ` • ${p.start_date} → ${p.end_date}` : ""}`,
    startDate: p.start_date || "",
    endDate: p.end_date || "",
    target,
    actual,
    achievementPercent: ach,
    hasTarget: target != null,
    hasActual: actual != null,
    reportedCount: reported ? 1 : 0,
    totalLeaves: 1,
    isLocked: Boolean(p.is_locked),
    lockState: p.lock_state || (p.is_locked ? "closed_deadline_passed" : "reporting_open"),
    lockReason: p.lock_reason || null,
    leafPeriod: p,
    children: [],
  };
}

function aggregateChildren(
  id: string,
  label: string,
  subtitle: string,
  children: CascadedNode[],
  fallbackTarget: number | null = null
): CascadedNode {
  let sumTarget = 0;
  let hasTarget = false;
  let sumActual = 0;
  let hasActual = false;
  let reportedCount = 0;
  let totalLeaves = 0;

  children.forEach((c) => {
    if (c.hasTarget && c.target != null) {
      sumTarget += c.target;
      hasTarget = true;
    }
    if (c.hasActual && c.actual != null) {
      sumActual += c.actual;
      hasActual = true;
    }
    reportedCount += c.reportedCount;
    totalLeaves += c.totalLeaves;
  });

  const finalTarget = hasTarget ? Math.round(sumTarget * 100) / 100 : fallbackTarget;
  const finalHasTarget = finalTarget != null;
  const finalActual = hasActual ? Math.round(sumActual * 100) / 100 : null;
  const ach =
    finalHasTarget && finalTarget! > 0 && hasActual && finalActual != null
      ? Math.round((finalActual / finalTarget!) * 1000) / 10
      : null;

  const anyOpen = children.some((c) => !c.isLocked);
  const startDate = children[0]?.startDate || "";
  const endDate = children[children.length - 1]?.endDate || "";

  return {
    id,
    label,
    subtitle: `${subtitle}${startDate && endDate ? ` • ${startDate} → ${endDate}` : ""}`,
    startDate,
    endDate,
    target: finalTarget,
    actual: finalActual,
    achievementPercent: ach,
    hasTarget: finalHasTarget,
    hasActual,
    reportedCount,
    totalLeaves,
    isLocked: !anyOpen,
    lockState: anyOpen ? "reporting_open" : children[0]?.lockState || "closed_deadline_passed",
    lockReason: !anyOpen ? "All child periods in this division are currently locked." : null,
    children,
  };
}

function buildDayNodesForMonth(
  monthNode: CascadedNode,
  assignment: NationalReportingAssignment
): CascadedNode[] {
  // If backend already provided daily leaves inside this month, return them; otherwise synthesize 30 EC days
  if (monthNode.children.length > 0) return monthNode.children;
  const startMs = monthNode.startDate ? new Date(`${monthNode.startDate}T12:00:00Z`).getTime() : NaN;
  const days: CascadedNode[] = [];
  const perDayTarget = monthNode.target != null ? Math.round((monthNode.target / 30) * 100) / 100 : null;
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  for (let d = 1; d <= 30; d++) {
    const dtStr = !isNaN(startMs)
      ? new Date(startMs + (d - 1) * 86400000).toISOString().slice(0, 10)
      : "";
    const isLocked = dtStr ? dtStr !== todayStr : monthNode.isLocked;
    const lockState = !dtStr
      ? monthNode.lockState
      : dtStr === todayStr
        ? "reporting_open"
        : dtStr > todayStr
          ? "upcoming_phase"
          : "closed_deadline_passed";
    const dayPeriod: ReportingPeriod = {
      period_index: d,
      period_label: `${monthNode.id}-D${d}`,
      name: `${monthNode.label} Day ${d}`,
      start_date: dtStr,
      end_date: dtStr,
      planned_target: perDayTarget,
      monthly_target: perDayTarget,
      is_locked: isLocked,
      lock_state: lockState,
      lock_reason: isLocked ? `Day ${d} (${dtStr}) is locked outside today's EC window.` : null,
    };
    days.push({
      id: dayPeriod.period_label,
      label: `Day ${d}`,
      subtitle: dtStr || `${monthNode.label} Day ${d}`,
      startDate: dtStr,
      endDate: dtStr,
      target: perDayTarget,
      actual: null,
      achievementPercent: null,
      hasTarget: perDayTarget != null,
      hasActual: false,
      reportedCount: 0,
      totalLeaves: 1,
      isLocked,
      lockState,
      lockReason: dayPeriod.lock_reason,
      leafPeriod: dayPeriod,
      children: [],
    });
  }
  return days;
}

export function RegionalCascadedPeriodsSection({
  assignment,
  req,
  recurringPeriods,
  divisionCustomNameMap,
  isFormReportingActive = true,
  onOpenPeriodForm,
  onViewReceipt,
  onViewHistory,
}: Props) {
  const thresholds = usePerformanceColorThresholds();
  const frequency = String(assignment.frequency_override || req?.frequency || "monthly")
    .toLowerCase()
    .replace(/[\s\-]/g, "_");

  const annualPresetTarget =
    assignment.annual_target != null && !isNaN(Number(assignment.annual_target))
      ? Number(assignment.annual_target)
      : null;

  // Build bottom-up cascaded hierarchy
  const rootTree: CascadedNode = useMemo(() => {
    const leafNodes = recurringPeriods.map((p) =>
      buildLeafNode(p, assignment, divisionCustomNameMap)
    );

    if (frequency === "annually" || leafNodes.length <= 1) {
      if (leafNodes.length === 1) {
        return aggregateChildren("annual", "Annual Plan", "Full Year", leafNodes, annualPresetTarget);
      }
      return aggregateChildren("annual", "Annual Plan", "Full Year", leafNodes, annualPresetTarget);
    }

    if (frequency === "semi_annually" || frequency === "semiannual") {
      return aggregateChildren(
        "annual",
        "Annual Plan",
        "2 Semi-Annual Divisions",
        leafNodes,
        annualPresetTarget
      );
    }

    if (frequency === "quarterly") {
      return aggregateChildren(
        "annual",
        "Annual Plan",
        "4 Quarterly Divisions",
        leafNodes,
        annualPresetTarget
      );
    }

    // Monthly or Daily: group 12 months into 4 Quarters -> Annual
    const quarterNodes: CascadedNode[] = [];
    if (frequency === "daily" && leafNodes.length > 12) {
      // Group daily leaves by ~30 days into 12 months, then 4 quarters
      const monthNodes: CascadedNode[] = [];
      for (let m = 0; m < 12; m++) {
        const chunk = leafNodes.slice(m * 30, (m + 1) * 30);
        if (chunk.length > 0) {
          monthNodes.push(aggregateChildren(`M${m + 1}`, `Month ${m + 1}`, `${chunk.length} Days`, chunk));
        }
      }
      for (let q = 0; q < 4; q++) {
        const qMonths = monthNodes.slice(q * 3, (q + 1) * 3);
        if (qMonths.length > 0) {
          quarterNodes.push(
            aggregateChildren(`Q${q + 1}`, `Quarter ${q + 1}`, `${qMonths.length} Months`, qMonths)
          );
        }
      }
    } else {
      // Monthly leaves (12) -> group 3 per quarter, and if frequency === "daily", expand 30 days inside each month
      const effectiveLeaves =
        frequency === "daily"
          ? leafNodes.map((m) => ({
              ...m,
              children: buildDayNodesForMonth(m, assignment),
              leafPeriod: undefined,
            }))
          : leafNodes;

      for (let q = 0; q < 4; q++) {
        const qMonths = effectiveLeaves.slice(q * 3, (q + 1) * 3);
        if (qMonths.length > 0) {
          quarterNodes.push(
            aggregateChildren(`Q${q + 1}`, `Quarter ${q + 1}`, `${qMonths.length} Months`, qMonths)
          );
        }
      }
    }

    return aggregateChildren(
      "annual",
      "Annual Plan",
      `${quarterNodes.length} Quarters (Bottom-Up Aggregate)`,
      quarterNodes,
      annualPresetTarget
    );
  }, [recurringPeriods, assignment, divisionCustomNameMap, frequency, annualPresetTarget]);

  // Drill-down path (array of selected node IDs)
  const [pathIds, setPathIds] = useState<string[]>([]);

  const { currentLevelNodes, breadcrumbs } = useMemo(() => {
    let curr: CascadedNode = rootTree;
    const crumbs: Array<{ id: string; label: string }> = [{ id: "root", label: rootTree.label }];
    for (const id of pathIds) {
      const next = curr.children.find((c) => c.id === id);
      if (!next || next.children.length === 0) break;
      curr = next;
      crumbs.push({ id: curr.id, label: curr.label });
    }
    const nodes = curr.children.length > 0 ? curr.children : [curr];
    return { currentLevelNodes: nodes, breadcrumbs: crumbs };
  }, [rootTree, pathIds]);

  const unitLabel = req?.expected_unit || "";

  const getCardAppearance = (node: CascadedNode) => {
    if (node.hasActual && node.achievementPercent != null) {
      const threshold = resolveThresholdForPercentage(thresholds, node.achievementPercent);
      return {
        color: threshold?.color_hex || "#10B981",
        label: threshold?.label || `${node.achievementPercent}%`,
        hasBadge: true,
      };
    }
    if (node.isLocked) {
      return { color: LOCKED_STATUS_COLOR, label: "Locked", hasBadge: false };
    }
    return { color: "#10B981", label: "Open", hasBadge: false };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header & Breadcrumb Bar */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            Cascaded Period Classification & Reporting ({frequency.replace("_", " ")})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bottom-up target & actual aggregation with Plan Rule coloring. Click a card to drill down into child periods.
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1 flex-wrap">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                <Button
                  size="sm"
                  variant={isLast ? "secondary" : "ghost"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPathIds(idx === 0 ? [] : pathIds.slice(0, idx))}
                >
                  {crumb.label}
                </Button>
              </React.Fragment>
            );
          })}
          {pathIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs ml-1"
              onClick={() => setPathIds(pathIds.slice(0, -1))}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Annual Root Summary Strip */}
      <div className="px-4 pt-4">
        {(() => {
          const rootApp = getCardAppearance(rootTree);
          return (
            <div
              className="rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{
                borderColor: `${rootApp.color}44`,
                backgroundColor: `${rootApp.color}0D`,
              }}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 shrink-0" style={{ color: rootApp.color }} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {rootTree.label}
                    </span>
                    {rootApp.hasBadge && (
                      <PerformanceColorBadge color={rootApp.color} label={rootApp.label} variant="tint" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {rootTree.reportedCount} / {rootTree.totalLeaves} reporting period(s) submitted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Annual Target</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {rootTree.target != null ? `${rootTree.target.toLocaleString()} ${unitLabel}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Reported Sum</span>
                  <span className="font-bold" style={{ color: rootApp.color }}>
                    {rootTree.actual != null ? `${rootTree.actual.toLocaleString()} ${unitLabel}` : "0"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Aggregate %</span>
                  <span className="font-bold" style={{ color: rootApp.color }}>
                    {rootTree.achievementPercent != null ? `${rootTree.achievementPercent}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Cascaded Period Cards Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentLevelNodes.map((node) => {
          const app = getCardAppearance(node);
          const hasChildren = node.children.length > 0;
          const leaf = node.leafPeriod;
          const isLeaf = !hasChildren && Boolean(leaf);
          const reported = leaf ? isPeriodReported(leaf) : node.reportedCount > 0;

          return (
            <Card
              key={node.id}
              onClick={hasChildren ? () => setPathIds([...pathIds, node.id]) : undefined}
              className={`border transition-all ${
                hasChildren ? "cursor-pointer hover:shadow-md" : ""
              }`}
              style={{
                borderColor: `${app.color}55`,
                backgroundColor: `${app.color}08`,
              }}
            >
              <CardHeader className="p-4 pb-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {node.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">{node.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {app.hasBadge && (
                      <PerformanceColorBadge color={app.color} label={app.label} variant="tint" />
                    )}
                    {node.isLocked ? (
                      <Badge variant="outline" className="text-[10px] gap-1 text-slate-600 bg-white/80">
                        <Lock className="h-2.5 w-2.5" />
                        Locked
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                        <Unlock className="h-2.5 w-2.5" />
                        Open
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-3">
                {/* Target / Actual / Achievement Strip */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-white/90 dark:bg-slate-950/60 rounded-lg border p-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {node.target != null ? node.target.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reported</span>
                    <span className="font-semibold font-mono" style={{ color: app.color }}>
                      {node.actual != null ? node.actual.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Achieved</span>
                    <span className="font-semibold font-mono" style={{ color: app.color }}>
                      {node.achievementPercent != null ? `${node.achievementPercent}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Plan Rule Colored Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, node.achievementPercent ?? 0))}%`,
                        backgroundColor: app.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {node.reportedCount} / {node.totalLeaves} reported
                    </span>
                    {hasChildren && (
                      <span className="font-medium inline-flex items-center gap-0.5 text-emerald-700">
                        Open {node.children.length} divisions <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Leaf Reporting Window Countdown & Actions */}
                {isLeaf && leaf && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/70">
                    {leaf.phase_start_date && leaf.phase_end_date && (
                      <PeriodCountdownProgressBar
                        startDate={leaf.start_date}
                        endDate={leaf.end_date}
                        phaseStartDate={leaf.phase_start_date}
                        phaseEndDate={leaf.phase_end_date}
                        isInGracePeriod={leaf.is_in_grace_period}
                        lockState={leaf.lock_state}
                        status={reported ? "published" : leaf.status}
                        compact={true}
                      />
                    )}
                    {leaf.is_locked && leaf.lock_reason && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate" title={leaf.lock_reason}>
                          {leaf.lock_reason}
                        </span>
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      {isFormReportingActive && (
                        <Button
                          size="sm"
                          disabled={leaf.is_locked}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPeriodForm(leaf);
                          }}
                          className={`h-7 flex-1 text-xs font-semibold ${
                            leaf.is_locked
                              ? "bg-slate-200 text-slate-500"
                              : reported
                                ? "bg-slate-800 hover:bg-slate-900 text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {leaf.is_locked ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" /> Locked
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3 mr-1" />
                              {reported ? "Update Report" : "Submit Form"}
                            </>
                          )}
                        </Button>
                      )}

                      {reported && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            title="View Receipt"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReceipt(leaf);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            title="Version History"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewHistory(leaf);
                            }}
                          >
                            <History className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
