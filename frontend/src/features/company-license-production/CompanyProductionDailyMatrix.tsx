"use strict";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus,
  Eye,
  Info,
  Scale,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetDailyReportingMatrixQuery } from "@/redux/api/productionApi";
import type { DailyReportingMatrixDay } from "@/redux/types/production";
import Loading01 from "@/features/template/component/Loading/Loading01";

interface CompanyProductionDailyMatrixProps {
  assignmentId: string;
  initialMonth?: string; // YYYY-MM
  onSelectDateToReport: (dateStr: string) => void;
  onViewReportDetail?: (report: any) => void;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CompanyProductionDailyMatrix({
  assignmentId,
  initialMonth,
  onSelectDateToReport,
  onViewReportDetail,
}: CompanyProductionDailyMatrixProps) {
  const currentMonthDefault = initialMonth || new Date().toISOString().slice(0, 7);
  const [currentMonth, setCurrentMonth] = useState<string>(currentMonthDefault);

  const { data: matrixData, isLoading, refetch } = useGetDailyReportingMatrixQuery({
    assignmentId,
    month: currentMonth,
  });

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    setCurrentMonth(prevDate.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const nextDate = new Date(Date.UTC(y, m, 1));
    setCurrentMonth(nextDate.toISOString().slice(0, 7));
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loading01 />
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Unable to load daily reporting matrix.
      </Card>
    );
  }

  const { monthName, unitSymbol, monthReportedTotal, weeks, allowanceWindow } = matrixData;
  const totalDaysInMonth = weeks.reduce((sum, w) => sum + w.days.filter((d) => !d.isPadding).length, 0);
  const totalReportedDays = weeks.reduce((sum, w) => sum + w.reportedCount, 0);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        {/* Matrix Header */}
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/10 border-b p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5 shrink-0" />
                </div>
                <CardTitle className="text-base font-bold text-foreground tracking-tight">
                  Daily Production Calendar Matrix
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs font-semibold border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                  {monthName}
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-xs font-mono">
                  {totalReportedDays} / {totalDaysInMonth} Days Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {allowanceWindow.explanation || "Submit daily production actuals for eligible calendar dates."}
              </p>
            </div>

            {/* Navigation & Metrics */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block px-3 py-1.5 rounded-xl border bg-white/80 dark:bg-slate-950 shadow-2xs">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Month Actual</div>
                <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {monthReportedTotal.toLocaleString()} {unitSymbol}
                </div>
              </div>

              <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 p-1 shadow-xs">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs font-bold px-2.5 min-w-[75px] text-center text-foreground">
                  {currentMonth}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNextMonth}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
          {/* Weekday Table Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground border-b pb-2">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div key={w} className={idx >= 5 ? "text-muted-foreground/70" : ""}>
                {w}
              </div>
            ))}
          </div>

          {/* Weeks and Days Grid */}
          <div className="space-y-3">
            {weeks.map((week) => (
              <div key={week.weekNumber} className="space-y-1.5">
                {/* Compact Weekly Summary Pill */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 font-mono">
                  <span>Week {week.weekNumber}</span>
                  <div className="flex items-center gap-3">
                    <span>
                      Reported: <strong>{week.reportedCount}</strong>/
                      {week.days.filter((d) => !d.isPadding).length} days
                    </span>
                    {week.weekActualTotal > 0 && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Total: {week.weekActualTotal.toLocaleString()} {unitSymbol}
                      </span>
                    )}
                  </div>
                </div>

                {/* 7-Day Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {week.days.map((day, dIdx) => {
                    if (day.isPadding) {
                      return (
                        <div
                          key={`pad-${week.weekNumber}-${dIdx}`}
                          className="h-20 rounded-xl bg-muted/15 border border-dashed border-border/40 opacity-40 select-none"
                        />
                      );
                    }

                    const isReported = Boolean(day.report);
                    const isToday = day.isToday;
                    const isAccessible = day.isAccessible && !isReported;
                    const isLocked = !day.isAccessible && !isReported;

                    return (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => {
                              if (isAccessible && day.date) {
                                onSelectDateToReport(day.date);
                              } else if (isReported && onViewReportDetail && day.report) {
                                onViewReportDetail(day.report);
                              }
                            }}
                            className={`h-24 rounded-xl p-2.5 flex flex-col justify-between transition-all duration-200 border text-left select-none relative group ${
                              isToday
                                ? "ring-2 ring-amber-500 ring-offset-2 border-amber-400 dark:border-amber-500 shadow-md"
                                : ""
                            } ${
                              isReported
                                ? "bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-teal-500/5 border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-md cursor-pointer"
                                : isAccessible
                                ? "bg-card border-dashed border-amber-500/50 hover:border-amber-500 hover:shadow-md cursor-pointer hover:bg-amber-500/5"
                                : "bg-muted/30 border-border/40 opacity-55 cursor-not-allowed"
                            }`}
                          >
                            {/* Day Number and Badges */}
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  isToday
                                    ? "h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shadow-xs"
                                    : "text-foreground group-hover:text-amber-600 transition-colors"
                                }`}
                              >
                                {day.dayNumber}
                              </span>

                              {isReported ? (
                                <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </span>
                              ) : isAccessible ? (
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0 ring-4 ring-amber-500/20" />
                              ) : (
                                <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                              )}
                            </div>

                            {/* Center Status / Quantity */}
                            <div className="my-auto">
                              {isReported && day.report ? (
                                <div className="space-y-0.5">
                                  <div className="text-[12px] font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate">
                                    {day.report.quantity_reported.toLocaleString()} <span className="text-[10px] font-normal">{unitSymbol}</span>
                                  </div>
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                    {day.report.status}
                                  </div>
                                </div>
                              ) : isAccessible ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
                                  <Plus className="h-3 w-3" />
                                  <span>Report</span>
                                </div>
                              ) : (
                                <div className="text-[9.5px] text-muted-foreground/80 italic font-mono truncate">
                                  {day.classification === "LOCKED_FUTURE" ? "Future" : "Locked"}
                                </div>
                              )}
                            </div>

                            {/* Bottom Subtext */}
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono truncate pt-1 border-t border-border/20">
                              <span>{isToday ? "Today" : day.date?.slice(5)}</span>
                              {isReported && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">Logged</span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{day.date}</span>
                              {isToday && <Badge className="text-[9px] h-4">Today</Badge>}
                            </div>
                            <p className="text-[11px] opacity-90">
                              {day.reason || (isReported ? "Report submitted" : "Available for reporting")}
                            </p>
                            {day.report && (
                              <div className="text-[10px] border-t pt-1 font-mono">
                                Quantity: {day.report.quantity_reported} {unitSymbol} | Status: {day.report.status}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
              <span>Reported</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-card border border-primary/60" />
              <span>Available / Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-muted/40 border border-border" />
              <span>Locked / Past Allowance</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full ring-2 ring-primary bg-primary" />
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
