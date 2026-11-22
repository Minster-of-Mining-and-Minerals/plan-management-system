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

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="border shadow-sm overflow-hidden space-y-4">
        {/* Matrix Header */}
        <CardHeader className="bg-muted/15 border-b p-4 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-base font-bold text-foreground">
                  Daily Production Calendar Matrix
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {monthName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {allowanceWindow.explanation || "Submit daily production actuals for eligible calendar dates."}
              </p>
            </div>

            {/* Navigation & Metrics */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-muted-foreground">Total Month Actual</div>
                <div className="text-sm font-mono font-bold text-foreground">
                  {monthReportedTotal.toLocaleString()} {unitSymbol}
                </div>
              </div>

              <div className="flex items-center gap-1 border rounded-lg bg-card p-1 shadow-xs">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePrevMonth}
                  className="h-7 w-7 p-0"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs font-semibold px-2 min-w-[70px] text-center">
                  {currentMonth}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleNextMonth}
                  className="h-7 w-7 p-0"
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
                            className={`h-22 rounded-xl p-2.5 flex flex-col justify-between transition-all duration-200 border text-left select-none relative ${
                              isToday ? "ring-2 ring-primary ring-offset-1" : ""
                            } ${
                              isReported
                                ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer"
                                : isAccessible
                                ? "bg-card border-primary/40 hover:border-primary hover:shadow-md cursor-pointer hover:bg-primary/5"
                                : "bg-muted/30 border-border/60 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            {/* Day Number and Badges */}
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  isToday
                                    ? "h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]"
                                    : "text-foreground"
                                }`}
                              >
                                {day.dayNumber}
                              </span>

                              {isReported ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : isAccessible ? (
                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                              ) : (
                                <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>

                            {/* Center Status / Quantity */}
                            <div className="my-auto">
                              {isReported && day.report ? (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 truncate">
                                    {day.report.quantity_reported.toLocaleString()} {unitSymbol}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground truncate capitalize">
                                    {day.report.status}
                                  </div>
                                </div>
                              ) : isAccessible ? (
                                <div className="text-[10px] text-primary font-semibold flex items-center gap-1">
                                  <Plus className="h-3 w-3" />
                                  <span>Report</span>
                                </div>
                              ) : (
                                <div className="text-[9px] text-muted-foreground italic truncate">
                                  {day.classification === "LOCKED_FUTURE" ? "Future" : "Closed"}
                                </div>
                              )}
                            </div>

                            {/* Bottom Subtext */}
                            <div className="text-[9px] text-muted-foreground font-mono truncate">
                              {isToday ? "Today" : day.date?.slice(5)}
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
