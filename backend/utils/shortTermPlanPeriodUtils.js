"use strict";

const {
  normalizeCalendarSystem,
  generateCalendarPeriods,
  parseDateOnlyString,
  formatDateOnly,
  getCalendarDateParts,
  formatDateByCalendar,
  formatDateRangeByCalendar,
} = require("./calendarUtils");

const VALID_FREQUENCIES = ["monthly", "weekly", "daily"];
const VALID_EVALUATION_MODES = ["number", "percentage", "frequency"];

function normalizeFrequency(freq) {
  const f = String(freq || "weekly").trim().toLowerCase();
  if (VALID_FREQUENCIES.includes(f)) return f;
  return "weekly";
}

function normalizeEvaluationMode(mode) {
  const m = String(mode || "number").trim().toLowerCase();
  if (VALID_EVALUATION_MODES.includes(m)) return m;
  return "number";
}

/**
 * Generate short-term divisions (monthly, weekly, or daily) between canonical GC startDate and endDate.
 * - monthly: 1 division per month in calendarSystem (EC or GC)
 * - weekly: 4 weekly divisions per month (mirroring the 100-day plan structure: Month -> Week 1..4)
 * - daily: daily divisions across the range, flagging end-of-week / end-of-month days as numeric target checkpoints
 */
function generateShortTermDivisions(startDateStr, endDateStr, frequency = "weekly", calendarSystem = "EC") {
  const cal = normalizeCalendarSystem(calendarSystem, "EC");
  const freq = normalizeFrequency(frequency);

  if (freq === "monthly") {
    return generateCalendarPeriods(startDateStr, endDateStr, "monthly", cal).map((p, idx) => ({
      period_index: idx + 1,
      period_label: p.period_label,
      parent_month_label: p.period_label,
      start_date: p.start_date,
      end_date: p.end_date,
      display_start_date: p.display_start_date,
      display_end_date: p.display_end_date,
      calendar_system: cal,
      is_numeric_checkpoint: true,
      recommended_submission_type: "actual_and_narrative",
    }));
  }

  if (freq === "weekly") {
    const months = generateCalendarPeriods(startDateStr, endDateStr, "monthly", cal);
    const weeks = [];
    let globalIdx = 1;

    for (const m of months) {
      const mStart = new Date(m.start_date + "T00:00:00Z");
      const mEnd = new Date(m.end_date + "T00:00:00Z");
      const totalDays = Math.max(1, Math.round((mEnd.getTime() - mStart.getTime()) / 86400000) + 1);
      // Pagume (5-6 days) stays as 1 week if <= 7 days, otherwise 4 weeks per month
      const weekCount = totalDays <= 7 ? 1 : 4;

      for (let w = 0; w < weekCount; w += 1) {
        const sOff = Math.round((w * totalDays) / weekCount);
        const eOff = w === weekCount - 1 ? totalDays - 1 : Math.round(((w + 1) * totalDays) / weekCount) - 1;
        const wStartDt = new Date(mStart.getTime() + sOff * 86400000);
        const wEndDt = new Date(mStart.getTime() + eOff * 86400000);
        const wStartStr = formatDateOnly(wStartDt.getUTCFullYear(), wStartDt.getUTCMonth() + 1, wStartDt.getUTCDate());
        const wEndStr = formatDateOnly(wEndDt.getUTCFullYear(), wEndDt.getUTCMonth() + 1, wEndDt.getUTCDate());
        const sParts = getCalendarDateParts(wStartStr, cal);
        const eParts = getCalendarDateParts(wEndStr, cal);

        const shortMonth = m.ethiopian_month_name || m.period_label.split(" ")[0];
        const label = weekCount === 1 ? `${shortMonth}` : `${shortMonth} - Week ${w + 1}`;

        weeks.push({
          period_index: globalIdx,
          period_label: label,
          parent_month_label: m.period_label,
          week_of_month: w + 1,
          start_date: wStartStr,
          end_date: wEndStr,
          display_start_date: sParts.dateStr,
          display_end_date: eParts.dateStr,
          calendar_system: cal,
          is_numeric_checkpoint: w === weekCount - 1,
          recommended_submission_type: "actual_and_narrative",
        });
        globalIdx += 1;
      }
    }
    return weeks;
  }

  // Daily divisions: intermediate days default to narrative_only unless a numeric target is assigned;
  // every 7th day or end of month is flagged as a numeric checkpoint.
  const startParsed = parseDateOnlyString(startDateStr);
  const endParsed = parseDateOnlyString(endDateStr);
  if (!startParsed || !endParsed) return [];

  const startDt = new Date(Date.UTC(startParsed.year, startParsed.month - 1, startParsed.day));
  const endDt = new Date(Date.UTC(endParsed.year, endParsed.month - 1, endParsed.day));
  const days = [];
  let idx = 1;
  let curr = new Date(startDt.getTime());

  while (curr <= endDt && idx <= 200) {
    const iso = formatDateOnly(curr.getUTCFullYear(), curr.getUTCMonth() + 1, curr.getUTCDate());
    const parts = getCalendarDateParts(iso, cal);
    const isEndOfWeek = idx % 7 === 0 || curr.getTime() === endDt.getTime();
    days.push({
      period_index: idx,
      period_label: `Day ${idx} (${parts.monthName} ${parts.day})`,
      parent_month_label: `${parts.monthName} (${parts.year})`,
      start_date: iso,
      end_date: iso,
      display_start_date: parts.dateStr,
      display_end_date: parts.dateStr,
      calendar_system: cal,
      is_numeric_checkpoint: isEndOfWeek,
      recommended_submission_type: isEndOfWeek ? "actual_and_narrative" : "narrative_only",
      formatted_date: formatDateByCalendar(iso, cal),
    });
    curr = new Date(curr.getTime() + 86400000);
    idx += 1;
  }
  return days;
}

/**
 * Compute aggregate achievement and report stats for an assignment across its divisions & submitted reports.
 */
function summarizeAssignmentProgress(kpi, assignment, divisions, reports = []) {
  const periodTargets = assignment.period_targets || {};
  const reportsByLabel = new Map();
  reports.forEach((r) => {
    reportsByLabel.set(String(r.period_label).trim().toLowerCase(), r);
  });

  let numericActualSum = 0;
  let numericReportsCount = 0;
  let narrativeOnlyCount = 0;
  let latestNumericActual = null;

  const enrichedDivisions = divisions.map((div) => {
    const targetVal =
      periodTargets[div.period_label] !== undefined && periodTargets[div.period_label] !== null && periodTargets[div.period_label] !== ""
        ? Number(periodTargets[div.period_label])
        : null;
    const report = reportsByLabel.get(String(div.period_label).trim().toLowerCase()) || null;

    if (report) {
      if (report.submission_type === "narrative_only") {
        narrativeOnlyCount += 1;
      } else if (report.reported_actual !== null && report.reported_actual !== undefined) {
        numericReportsCount += 1;
        numericActualSum += Number(report.reported_actual);
        latestNumericActual = Number(report.reported_actual);
      }
    }

    const recommendedMode =
      targetVal !== null
        ? "actual_and_narrative"
        : kpi.allow_narrative_only_updates
        ? "narrative_only"
        : div.recommended_submission_type || "actual_and_narrative";

    return {
      ...div,
      planned_target: targetVal,
      recommended_submission_type: recommendedMode,
      report: report
        ? {
            report_id: report.report_id,
            submission_type: report.submission_type,
            planned_target: report.planned_target,
            reported_actual: report.reported_actual,
            achievement_percent: report.achievement_percent,
            narrative: report.narrative,
            submitted_at: report.submitted_at,
            review_status: report.review_status,
            submittedByUser: report.submittedByUser || null,
          }
        : null,
    };
  });

  const allocatedTarget = assignment.allocated_target ?? kpi.total_target ?? null;
  const evalMode = normalizeEvaluationMode(
    assignment.evaluation_mode_override ||
      kpi.evaluation_mode ||
      (kpi.target_mode === "continuous" ? "percentage" : "number")
  );

  let overallActual = numericActualSum;
  if (evalMode === "percentage" || kpi.target_mode === "continuous") {
    if (latestNumericActual !== null) overallActual = latestNumericActual;
  }

  const overallAchievementPercent =
    allocatedTarget && allocatedTarget > 0 && numericReportsCount > 0
      ? Math.min(100, Math.round((overallActual / allocatedTarget) * 1000) / 10)
      : null;

  return {
    divisions: enrichedDivisions,
    summary: {
      total_divisions: divisions.length,
      reported_count: numericReportsCount + narrativeOnlyCount,
      numeric_reports_count: numericReportsCount,
      narrative_only_count: narrativeOnlyCount,
      allocated_target: allocatedTarget,
      effective_evaluation_mode: evalMode,
      overall_actual: numericReportsCount > 0 ? overallActual : null,
      overall_achievement_percent: overallAchievementPercent,
    },
  };
}

module.exports = {
  VALID_FREQUENCIES,
  VALID_EVALUATION_MODES,
  normalizeFrequency,
  normalizeEvaluationMode,
  generateShortTermDivisions,
  summarizeAssignmentProgress,
};
