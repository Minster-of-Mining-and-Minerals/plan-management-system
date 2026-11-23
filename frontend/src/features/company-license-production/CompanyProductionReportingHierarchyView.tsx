"use strict";

import React, { useState } from "react";
import {
  Layers,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Factory,
  FileBadge,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Scale,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetReportingHierarchyQuery,
} from "@/redux/api/productionApi";
import type {
  ReportingHierarchyNode,
  ReportingPeriodClassification,
} from "@/redux/types/production";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { CompanyProductionDailyMatrix } from "./CompanyProductionDailyMatrix";

interface CompanyProductionReportingHierarchyViewProps {
  assignmentId: string;
  onOpenReportModal: (prefilled: {
    reportDate: string;
    periodLabel?: string;
    targetPeriodId?: string | null;
  }) => void;
  onViewReportDetail?: (report: any) => void;
}

export function CompanyProductionReportingHierarchyView({
  assignmentId,
  onOpenReportModal,
  onViewReportDetail,
}: CompanyProductionReportingHierarchyViewProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Navigation path: array of selected nodes [root, quarterNode, monthNode]
  const [activePath, setActivePath] = useState<ReportingHierarchyNode[]>([]);
  const [activeDailyMatrixMonth, setActiveDailyMatrixMonth] = useState<string | null>(null);

  const { data: hierarchyBundle, isLoading, refetch } = useGetReportingHierarchyQuery({
    assignmentId,
    year: selectedYear,
  });

  if (isLoading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loading01 />
      </Card>
    );
  }

  if (!hierarchyBundle || !hierarchyBundle.hierarchy) {
    return (
      <Card className="p-8 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
        <h4 className="font-semibold text-sm">No Reporting Hierarchy Available</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          This production assignment requires an approved annual target allocation before periodic reporting can be structured.
        </p>
      </Card>
    );
  }

  const { assignment, today, allowanceWindow, approvedTargetVersion, hierarchy } = hierarchyBundle;
  const unitSymbol = assignment.unit_symbol;

  // Currently displayed node: deepest in activePath, or root hierarchy
  const currentNode: ReportingHierarchyNode =
    activePath.length > 0 ? activePath[activePath.length - 1] : hierarchy;

  const handleNavigateDown = (node: ReportingHierarchyNode) => {
    if (node.requiresDailyMatrix) {
      setActiveDailyMatrixMonth(node.monthKey || node.startDate.slice(0, 7));
      setActivePath((prev) => [...prev, node]);
    } else if (node.children && node.children.length > 0) {
      setActivePath((prev) => [...prev, node]);
    } else {
      // Direct reporting action
      onOpenReportModal({
        reportDate: node.startDate,
        periodLabel: node.label,
        targetPeriodId: node.targetPeriodId,
      });
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setActivePath([]);
      setActiveDailyMatrixMonth(null);
    } else {
      setActivePath((prev) => prev.slice(0, index + 1));
      const targetNode = activePath[index];
      if (!targetNode.requiresDailyMatrix) {
        setActiveDailyMatrixMonth(null);
      }
    }
  };

  const getStatusBadge = (
    classification: { status: ReportingPeriodClassification; isAccessible: boolean; reason?: string },
    actualQuantity: number = 0
  ) => {
    const { status, isAccessible } = classification;
    if (actualQuantity > 0 || status === "COMPLETED" || status === "SUBMITTED") {
      return (
        <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1 shadow-xs">
          <CheckCircle2 className="h-3 w-3" /> Reported
        </Badge>
      );
    }
    if (status === "CURRENT" || isAccessible) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-semibold gap-1">
          <Clock className="h-3 w-3" /> Window Open
        </Badge>
      );
    }
    if (status === "LOCKED_FUTURE") {
      return (
        <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-semibold gap-1">
          <Lock className="h-3 w-3" /> Upcoming
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-semibold gap-1">
        <Lock className="h-3 w-3" /> Window Locked
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-gradient-to-r from-white via-slate-50/40 to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/10">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Factory className="h-5 w-5 shrink-0" />
                </div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  {assignment.production_item_name} Reporting Schedule
                </h3>
                {assignment.license_number && (
                  <Badge variant="outline" className="font-mono text-xs font-semibold border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                    License #{assignment.license_number}
                  </Badge>
                )}
                {approvedTargetVersion && (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-mono">
                    Baseline v{approvedTargetVersion}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Configured Cycle: <strong className="text-foreground font-mono">{assignment.effective_from || "N/A"} to {assignment.effective_to || "Indefinite"}</strong> | 
                Target Depth: <strong className="text-foreground capitalize">{assignment.target_allocation_depth.replace("_", "-")}</strong> | 
                Frequency: <strong className="text-foreground capitalize">{assignment.reporting_frequency}</strong>
              </p>
            </div>

            {/* Allowance summary */}
            <div className="text-left sm:text-right space-y-1">
              <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-foreground bg-white/80 dark:bg-slate-950">
                Allowance: {allowanceWindow.allowPast ? `Past ${allowanceWindow.duration} ${allowanceWindow.unit}` : "Same-day only"}
              </Badge>
              <div className="text-[11px] text-muted-foreground font-mono">
                Today: <strong className="text-foreground">{today}</strong>
              </div>
            </div>
          </div>

          {/* Annual Target Completion Progress Bar */}
          <div className="p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Schedule Performance ({hierarchy.label || selectedYear})
              </span>
              <span className="font-mono">
                {hierarchy.actualQuantity.toLocaleString()} / {hierarchy.targetQuantity.toLocaleString()} {unitSymbol}{" "}
                <span className="text-emerald-600 font-bold">({hierarchy.achievementPct?.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  (hierarchy.achievementPct || 0) >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-emerald-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, hierarchy.achievementPct || 0))}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional-Style Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1 overflow-x-auto">
        <button
          onClick={() => handleBreadcrumbClick(-1)}
          className={`hover:text-primary transition-colors flex items-center gap-1 shrink-0 ${
            activePath.length === 0 ? "font-bold text-foreground" : ""
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{hierarchy.label || `Annual ${selectedYear}`}</span>
        </button>

        {activePath.map((node, idx) => {
          const isLast = idx === activePath.length - 1;
          return (
            <React.Fragment key={node.id}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:text-primary transition-colors shrink-0 ${
                  isLast ? "font-bold text-foreground" : ""
                }`}
              >
                {node.label}
              </button>
            </React.Fragment>
          );
        })}

        {activeDailyMatrixMonth && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="font-bold text-primary shrink-0 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Daily Matrix
            </span>
          </>
        )}
      </div>

      {/* Main View: Daily Matrix OR Level Cards */}
      {activeDailyMatrixMonth ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveDailyMatrixMonth(null);
                setActivePath((prev) => prev.slice(0, -1));
              }}
              className="text-xs gap-1.5 h-8"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Parent Hierarchy
            </Button>
          </div>

          <CompanyProductionDailyMatrix
            assignmentId={assignmentId}
            initialMonth={activeDailyMatrixMonth}
            onSelectDateToReport={(dateStr) => {
              onOpenReportModal({
                reportDate: dateStr,
                periodLabel: dateStr,
                targetPeriodId: currentNode.targetPeriodId,
              });
            }}
            onViewReportDetail={onViewReportDetail}
          />
        </div>
      ) : (
        /* Period Cards Grid (Inspired by Regional Plan Execution Dashboard) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(currentNode.children || []).map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const isDaily = node.requiresDailyMatrix;
            const isReportingLevel = node.isReportingLevel;
            const isCompleted = node.targetQuantity > 0 && (node.achievementPct || 0) >= 100;
            const isOpenNow = node.classification.isAccessible;

            return (
              <Card
                key={node.id}
                className={`transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isCompleted
                    ? "border-emerald-500/40 bg-card hover:border-emerald-500/70"
                    : isOpenNow
                    ? "border-amber-500/50 bg-card ring-1 ring-amber-500/20 hover:border-amber-500 hover:ring-amber-500/40"
                    : "border-border/60 bg-card/70 opacity-90 hover:opacity-100"
                }`}
              >
                <CardHeader className="p-4 pb-3 border-b bg-muted/15 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      {isOpenNow && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                      {node.label}
                    </CardTitle>
                    {getStatusBadge(node.classification, node.actualQuantity)}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
                    <span>{node.startDate} &rarr; {node.endDate}</span>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5">
                  {/* Targets & Actuals */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Target</div>
                      <div className="font-mono font-bold text-foreground text-sm mt-0.5">
                        {node.targetQuantity.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{unitSymbol}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Actual Extracted</div>
                      <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5">
                        {node.actualQuantity.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600/70">{unitSymbol}</span>
                      </div>
                    </div>
                  </div>

                  {/* Achievement Bar */}
                  {node.targetQuantity > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Achievement Rate</span>
                        <span className={`font-mono font-bold ${
                          (node.achievementPct || 0) >= 100
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (node.achievementPct || 0) >= 70
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        }`}>
                          {node.achievementPct !== undefined ? node.achievementPct.toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (node.achievementPct || 0) >= 100
                              ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 shadow-2xs shadow-emerald-500/50"
                              : (node.achievementPct || 0) >= 70
                              ? "bg-gradient-to-r from-lime-500 to-emerald-500"
                              : (node.achievementPct || 0) >= 40
                              ? "bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                              : "bg-gradient-to-r from-red-600 via-rose-500 to-orange-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, node.achievementPct || 0))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {node.classification.reason && (
                    <p className="text-[10px] text-muted-foreground/80 italic bg-muted/20 px-2 py-1 rounded">
                      {node.classification.reason}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-3 border-t bg-muted/5 flex items-center justify-between">
                  {isDaily ? (
                    <Button
                      size="sm"
                      onClick={() => handleNavigateDown(node)}
                      className="w-full text-xs font-semibold gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xs h-8.5"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Open Daily Matrix
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  ) : hasChildren ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNavigateDown(node)}
                      className="w-full text-xs font-semibold gap-1.5 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500/40 h-8.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Explore Period Breakdown
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  ) : !node.classification.isAccessible ? (
                    <Button
                      size="sm"
                      disabled={true}
                      title={node.classification.reason || "Reporting window is locked for this period."}
                      className="w-full text-xs font-semibold gap-1.5 opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 text-slate-500 border border-slate-200 dark:border-slate-700/60 h-8.5"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Locked Window
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleNavigateDown(node)}
                      className="w-full text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-8.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Submit {node.label} Report
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
