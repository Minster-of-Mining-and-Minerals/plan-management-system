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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  History,
  Layers,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  isCurrentActive: boolean;
  lockState: string;
  lockReason?: string | null;
  leafPeriod?: ReportingPeriod;
  children: CascadedNode[];
}

function getEthiopiaTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  divisionCustomNameMap: Record<string, string>,
  todayStr: string
): CascadedNode {
  const reported = isPeriodReported(p);
  const target = resolveLeafTarget(p, assignment);
  const actual = reported && p.reported_actual != null ? Number(p.reported_actual) : null;
  const ach =
    target != null && target > 0 && actual != null
      ? Math.round((actual / target) * 1000) / 10
      : null;
  const isCurrentActive = Boolean(
    p.start_date && p.end_date && todayStr >= p.start_date && todayStr <= p.end_date
  );

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
    isCurrentActive,
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
  todayStr: string,
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

  const startDate = children[0]?.startDate || "";
  const endDate = children[children.length - 1]?.endDate || "";
  const isCurrentActive =
    Boolean(startDate && endDate && todayStr >= startDate && todayStr <= endDate) ||
    children.some((c) => c.isCurrentActive);
  const anyOpen = children.some((c) => !c.isLocked);
  // Active containers holding today's date are NEVER locked for drilling down
  const containerLocked = !anyOpen && !isCurrentActive;

  const lockState = anyOpen
    ? "reporting_open"
    : isCurrentActive
      ? "upcoming_phase"
      : endDate && todayStr > endDate
        ? "closed_deadline_passed"
        : "upcoming_phase";

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
    isLocked: containerLocked,
    isCurrentActive,
    lockState,
    lockReason: containerLocked ? "Outside active reporting period." : null,
    children,
  };
}

function buildDayNodesForMonth(monthNode: CascadedNode, todayStr: string): CascadedNode[] {
  if (monthNode.children.length > 0) return monthNode.children;
  const startMs = monthNode.startDate ? new Date(`${monthNode.startDate}T12:00:00Z`).getTime() : NaN;
  const days: CascadedNode[] = [];
  const perDayTarget = monthNode.target != null ? Math.round((monthNode.target / 30) * 100) / 100 : null;

  for (let d = 1; d <= 30; d++) {
    const dtStr = !isNaN(startMs)
      ? new Date(startMs + (d - 1) * 86400000).toISOString().slice(0, 10)
      : "";
    const isCurrentActive = dtStr === todayStr;
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
      lock_reason: isLocked ? `Day ${d} (${dtStr}) is outside today's EC window.` : null,
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
      isCurrentActive,
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
  const todayStr = getEthiopiaTodayStr();
  const frequency = String(assignment.frequency_override || req?.frequency || "monthly")
    .toLowerCase()
    .replace(/[\s\-]/g, "_");

  const annualPresetTarget =
    assignment.annual_target != null && !isNaN(Number(assignment.annual_target))
      ? Number(assignment.annual_target)
      : null;

  const rootTree: CascadedNode = useMemo(() => {
    const leafNodes = recurringPeriods.map((p) =>
      buildLeafNode(p, assignment, divisionCustomNameMap, todayStr)
    );

    if (frequency === "annually" || leafNodes.length <= 1) {
      return aggregateChildren("annual", "Annual Plan", "Full Year", leafNodes, todayStr, annualPresetTarget);
    }

    if (frequency === "semi_annually" || frequency === "semiannual") {
      return aggregateChildren("annual", "Annual Plan", "2 Semi-Annual Divisions", leafNodes, todayStr, annualPresetTarget);
    }

    if (frequency === "quarterly") {
      return aggregateChildren("annual", "Annual Plan", "4 Quarterly Divisions", leafNodes, todayStr, annualPresetTarget);
    }

    const quarterNodes: CascadedNode[] = [];
    if (frequency === "daily" && leafNodes.length > 12) {
      const monthNodes: CascadedNode[] = [];
      for (let m = 0; m < 12; m++) {
        const chunk = leafNodes.slice(m * 30, (m + 1) * 30);
        if (chunk.length > 0) {
          monthNodes.push(aggregateChildren(`M${m + 1}`, `Month ${m + 1}`, `${chunk.length} Days`, chunk, todayStr));
        }
      }
      for (let q = 0; q < 4; q++) {
        const qMonths = monthNodes.slice(q * 3, (q + 1) * 3);
        if (qMonths.length > 0) {
          quarterNodes.push(aggregateChildren(`Q${q + 1}`, `Quarter ${q + 1}`, `${qMonths.length} Months`, qMonths, todayStr));
        }
      }
    } else {
      const effectiveLeaves =
        frequency === "daily"
          ? leafNodes.map((m) => ({
              ...m,
              children: buildDayNodesForMonth(m, todayStr),
              leafPeriod: undefined,
            }))
          : leafNodes;

      for (let q = 0; q < 4; q++) {
        const qMonths = effectiveLeaves.slice(q * 3, (q + 1) * 3);
        if (qMonths.length > 0) {
          quarterNodes.push(aggregateChildren(`Q${q + 1}`, `Quarter ${q + 1}`, `${qMonths.length} Months`, qMonths, todayStr));
        }
      }
    }

    return aggregateChildren("annual", "Annual Plan", `${quarterNodes.length} Quarters`, quarterNodes, todayStr, annualPresetTarget);
  }, [recurringPeriods, assignment, divisionCustomNameMap, frequency, annualPresetTarget, todayStr]);

  const [pathIds, setPathIds] = useState<string[]>([]);

  const { currentParent, currentLevelNodes, breadcrumbs } = useMemo(() => {
    let curr: CascadedNode = rootTree;
    const crumbs: Array<{ id: string; label: string }> = [{ id: "root", label: rootTree.label }];
    for (const id of pathIds) {
      const next = curr.children.find((c) => c.id === id);
      if (!next || next.children.length === 0) break;
      curr = next;
      crumbs.push({ id: curr.id, label: curr.label });
    }
    const nodes = curr.children.length > 0 ? curr.children : [curr];
    return { currentParent: curr, currentLevelNodes: nodes, breadcrumbs: crumbs };
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
    if (node.isCurrentActive) {
      return { color: "#10B981", label: "Active Period", hasBadge: false };
    }
    if (node.isLocked) {
      return {
        color: LOCKED_STATUS_COLOR,
        label: node.lockState === "upcoming_phase" ? "Upcoming" : "Locked",
        hasBadge: false,
      };
    }
    return { color: "#10B981", label: "Open", hasBadge: false };
  };

  const rootApp = getCardAppearance(rootTree);

  return (
    <div className="space-y-4">
      {/* Header & Breadcrumb Navigation (No Outer Wrapper Card) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            Reporting Period Divisions ({frequency.replace("_", " ")})
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cascaded division targets &amp; bottom-up achievement colored by Plan Rule thresholds.
          </p>
        </div>

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

      {/* Top Annual Target & Selected Period Target Summary Card (Plan Draft Style) */}
      <Card
        className="border"
        style={{
          borderColor: `${rootApp.color}44`,
          backgroundColor: `${rootApp.color}0A`,
        }}
      >
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Annual Target &amp; Achievement</p>
              <div className="flex items-baseline gap-3 mt-0.5">
                <p className="text-2xl font-bold font-mono" style={{ color: rootApp.color }}>
                  {rootTree.achievementPercent != null ? `${rootTree.achievementPercent}%` : "0%"}
                </p>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  Target: <strong>{rootTree.target != null ? `${rootTree.target.toLocaleString()} ${unitLabel}` : "—"}</strong>
                  {" • "}
                  Reported: <strong>{rootTree.actual != null ? `${rootTree.actual.toLocaleString()} ${unitLabel}` : "0"}</strong>
                </span>
              </div>
              {rootApp.hasBadge && (
                <PerformanceColorBadge
                  color={rootApp.color}
                  label={rootApp.label}
                  className="mt-1.5 text-[10px] py-0 h-5"
                />
              )}
            </div>

            {pathIds.length > 0 && (
              <div className="rounded-lg border bg-white/90 dark:bg-slate-950/60 px-3.5 py-2 text-xs font-mono">
                <span className="text-[10px] font-sans text-muted-foreground block">
                  Selected Division ({currentParent.label})
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Target: {currentParent.target != null ? `${currentParent.target.toLocaleString()} ${unitLabel}` : "—"}
                  {" • "}
                  Reported: {currentParent.actual != null ? `${currentParent.actual.toLocaleString()} ${unitLabel}` : "0"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan-Draft-Style Division Cards Grid (Unwrapped) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {currentLevelNodes.map((node, idx) => {
          const app = getCardAppearance(node);
          const hasChildren = node.children.length > 0;
          const leaf = node.leafPeriod;
          const isLeaf = !hasChildren && Boolean(leaf);
          const reported = leaf ? isPeriodReported(leaf) : node.reportedCount > 0;
          const showProgress = node.hasActual && node.achievementPercent != null;
          const progressColor = showProgress ? app.color : LOCKED_STATUS_COLOR;

          return (
            <Card
              key={node.id}
              onClick={hasChildren ? () => setPathIds([...pathIds, node.id]) : undefined}
              className={cn(
                "relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
                hasChildren && "cursor-pointer",
                node.isLocked && !node.isCurrentActive && "bg-muted/40 border-muted-foreground/30"
              )}
              style={
                node.isLocked && !node.isCurrentActive
                  ? { borderColor: LOCKED_STATUS_COLOR }
                  : showProgress
                    ? { borderColor: `${progressColor}55` }
                    : undefined
              }
            >
              {/* Plan-Draft Top Gradient Accent Bar */}
              {(showProgress || node.isCurrentActive) && (
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${app.color}, ${app.color}55)`,
                  }}
                />
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        style={
                          showProgress || node.isCurrentActive
                            ? { color: app.color }
                            : node.isLocked
                              ? { color: LOCKED_STATUS_COLOR }
                              : undefined
                        }
                      />
                      <span className="truncate">{node.label}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs">
                      {node.subtitle}
                    </CardDescription>
                  </div>
                  <PerformanceColorBadge
                    color={app.color}
                    label={app.label}
                    variant="solid"
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Division {idx + 1} of {currentLevelNodes.length}
                </p>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50/80 dark:bg-slate-900/50 rounded-lg border p-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Target</span>
                    <span className="font-semibold font-mono">
                      {node.target != null ? node.target.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Reported</span>
                    <span className="font-semibold font-mono" style={{ color: app.color }}>
                      {node.actual != null ? node.actual.toLocaleString() : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Achieved</span>
                    <span className="font-semibold font-mono" style={{ color: app.color }}>
                      {node.achievementPercent != null ? `${node.achievementPercent}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, node.achievementPercent ?? 0))}%`,
                        backgroundColor: progressColor,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{node.reportedCount}/{node.totalLeaves} submitted</span>
                    {hasChildren && (
                      <span className="font-medium text-emerald-700 inline-flex items-center gap-0.5">
                        Open ({node.children.length}) <ChevronRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Leaf Reporting Window & Actions */}
                {isLeaf && leaf && (
                  <div className="space-y-2 pt-2 border-t">
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
