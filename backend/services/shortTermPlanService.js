"use strict";

const {
  ShortTermPlan,
  ShortTermKpi,
  ShortTermKpiAssignment,
  ShortTermPeriodReport,
  GovernmentStructure,
  InternalStructure,
  User,
} = require("../models");
const {
  normalizeCalendarSystem,
  resolveCanonicalDateInput,
  calculateCalendarAnnualEndDate,
} = require("../utils/calendarUtils");
const {
  normalizeFrequency,
  normalizeEvaluationMode,
  generateShortTermDivisions,
  summarizeAssignmentProgress,
} = require("../utils/shortTermPlanPeriodUtils");

class ShortTermPlanService {
  async listPlans(filters = {}) {
    const where = {};
    if (filters.government_structure_id) where.government_structure_id = filters.government_structure_id;
    if (filters.status) where.status = filters.status;

    const plans = await ShortTermPlan.findAll({
      where,
      include: [
        { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
        {
          model: ShortTermKpi,
          as: "kpis",
          include: [
            {
              model: ShortTermKpiAssignment,
              as: "assignments",
              include: [{ model: ShortTermPeriodReport, as: "reports" }],
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return plans.map((p) => {
      const item = p.toJSON();
      const kpis = item.kpis || [];
      let totalAssignments = 0;
      let totalReports = 0;
      let numericReports = 0;
      let narrativeReports = 0;
      let achievementSum = 0;
      let achievementCount = 0;

      kpis.forEach((k) => {
        (k.assignments || []).forEach((a) => {
          totalAssignments += 1;
          const reps = a.reports || [];
          totalReports += reps.length;
          reps.forEach((r) => {
            if (r.submission_type === "narrative_only") narrativeReports += 1;
            else numericReports += 1;
            if (r.achievement_percent !== null && r.achievement_percent !== undefined) {
              achievementSum += Number(r.achievement_percent);
              achievementCount += 1;
            }
          });
        });
      });

      item.stats = {
        kpi_count: kpis.length,
        assignment_count: totalAssignments,
        total_reports: totalReports,
        numeric_reports: numericReports,
        narrative_only_reports: narrativeReports,
        avg_achievement_percent: achievementCount > 0 ? Math.round((achievementSum / achievementCount) * 10) / 10 : 0,
      };
      return item;
    });
  }

  async createPlan(data, userId) {
    if (!data.title || !data.start_date || !data.end_date) {
      const err = new Error("title, start_date, and end_date are required");
      err.status = 400;
      throw err;
    }

    const cal = normalizeCalendarSystem(data.calendar_system || "EC", "EC");
    const inputCal = normalizeCalendarSystem(data.input_calendar_system || "GC", "GC");

    let startDate = String(data.start_date).trim();
    let endDate = String(data.end_date).trim();

    if (inputCal === "EC") {
      const s = resolveCanonicalDateInput(startDate, "EC");
      if (!s.valid) throw Object.assign(new Error(s.message), { status: 400 });
      const e = resolveCanonicalDateInput(endDate, "EC");
      if (!e.valid) throw Object.assign(new Error(e.message), { status: 400 });
      startDate = s.canonicalDate;
      endDate = e.canonicalDate;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw Object.assign(new Error("start_date must be before end_date"), { status: 400 });
    }

    return ShortTermPlan.create({
      title: data.title.trim(),
      description: data.description ? data.description.trim() : null,
      government_structure_id: data.government_structure_id || null,
      calendar_system: cal,
      start_date: startDate,
      end_date: endDate,
      duration_months: Number(data.duration_months) || 3,
      default_frequency: normalizeFrequency(data.default_frequency || "weekly"),
      status: data.status || "active",
      created_by: userId || null,
    });
  }

  async getPlanDetail(planId, filters = {}) {
    const plan = await ShortTermPlan.findByPk(planId, {
      include: [
        { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
        {
          model: ShortTermKpi,
          as: "kpis",
          include: [
            {
              model: ShortTermKpiAssignment,
              as: "assignments",
              include: [
                { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
                { model: InternalStructure, as: "department", attributes: ["internal_structure_id", "name"] },
                { model: User, as: "assignedUser", attributes: ["user_id", "full_name", "email"] },
                {
                  model: ShortTermPeriodReport,
                  as: "reports",
                  include: [{ model: User, as: "submittedByUser", attributes: ["user_id", "full_name", "email"] }],
                },
              ],
            },
          ],
        },
      ],
      order: [[{ model: ShortTermKpi, as: "kpis" }, "order_index", "ASC"]],
    });

    if (!plan) {
      throw Object.assign(new Error("Short-term plan not found"), { status: 404 });
    }

    const item = plan.toJSON();
    item.kpis = (item.kpis || []).map((kpi) => {
      const kpiFreq = normalizeFrequency(kpi.reporting_frequency || item.default_frequency);
      const assignments = (kpi.assignments || [])
        .filter((a) => {
          if (filters.internal_structure_id && a.internal_structure_id !== filters.internal_structure_id) return false;
          if (filters.assigned_user_id && a.assigned_user_id !== filters.assigned_user_id) return false;
          return true;
        })
        .map((a) => {
          const effFreq = normalizeFrequency(a.reporting_frequency_override || kpiFreq);
          const divisions = generateShortTermDivisions(item.start_date, item.end_date, effFreq, item.calendar_system);
          const progress = summarizeAssignmentProgress(kpi, a, divisions, a.reports || []);
          return {
            ...a,
            effective_frequency: effFreq,
            divisions: progress.divisions,
            progress_summary: progress.summary,
          };
        });

      return { ...kpi, assignments };
    });

    return item;
  }

  async addKpi(planId, data) {
    const plan = await ShortTermPlan.findByPk(planId);
    if (!plan) throw Object.assign(new Error("Short-term plan not found"), { status: 404 });

    if (!data.code || !data.title) {
      throw Object.assign(new Error("code and title are required"), { status: 400 });
    }

    const existingCount = await ShortTermKpi.count({ where: { short_term_plan_id: planId } });

    return ShortTermKpi.create({
      short_term_plan_id: planId,
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      unit: data.unit ? data.unit.trim() : "Number",
      total_target: data.total_target !== undefined && data.total_target !== "" ? Number(data.total_target) : null,
      evaluation_mode: normalizeEvaluationMode(data.evaluation_mode || "number"),
      target_mode: data.target_mode || "cumulative",
      reporting_frequency: normalizeFrequency(data.reporting_frequency || plan.default_frequency),
      requires_numeric: data.requires_numeric !== undefined ? Boolean(data.requires_numeric) : true,
      requires_narrative: data.requires_narrative !== undefined ? Boolean(data.requires_narrative) : true,
      allow_narrative_only_updates: data.allow_narrative_only_updates !== undefined ? Boolean(data.allow_narrative_only_updates) : true,
      order_index: data.order_index !== undefined ? Number(data.order_index) : existingCount + 1,
    });
  }

  async assignKpi(kpiId, payload, userId) {
    const kpi = await ShortTermKpi.findByPk(kpiId, {
      include: [{ model: ShortTermPlan, as: "plan" }],
    });
    if (!kpi) throw Object.assign(new Error("Short-term KPI not found"), { status: 404 });

    const sectorId = payload.government_structure_id || kpi.plan?.government_structure_id;
    if (!sectorId) {
      throw Object.assign(new Error("government_structure_id (Sector) is required for assignment"), { status: 400 });
    }

    return ShortTermKpiAssignment.create({
      short_term_kpi_id: kpiId,
      government_structure_id: sectorId,
      internal_structure_id: payload.internal_structure_id || null,
      assigned_user_id: payload.assigned_user_id || null,
      assignee_label: payload.assignee_label || null,
      allocated_target:
        payload.allocated_target !== undefined && payload.allocated_target !== ""
          ? Number(payload.allocated_target)
          : kpi.total_target,
      evaluation_mode_override: payload.evaluation_mode_override
        ? normalizeEvaluationMode(payload.evaluation_mode_override)
        : null,
      period_targets: payload.period_targets || {},
      reporting_frequency_override: payload.reporting_frequency_override
        ? normalizeFrequency(payload.reporting_frequency_override)
        : null,
      assigned_by: userId || null,
    });
  }

  async submitPeriodReport(assignmentId, payload, userId) {
    const assignment = await ShortTermKpiAssignment.findByPk(assignmentId, {
      include: [
        {
          model: ShortTermKpi,
          as: "kpi",
          include: [{ model: ShortTermPlan, as: "plan" }],
        },
      ],
    });
    if (!assignment) throw Object.assign(new Error("Short-term KPI assignment not found"), { status: 404 });

    const kpi = assignment.kpi;
    const plan = kpi.plan;
    const effFreq = normalizeFrequency(assignment.reporting_frequency_override || kpi.reporting_frequency || plan.default_frequency);
    const divisions = generateShortTermDivisions(plan.start_date, plan.end_date, effFreq, plan.calendar_system);

    const periodLabel = String(payload.period_label || "").trim();
    const targetDiv = divisions.find(
      (d) =>
        d.period_label.toLowerCase() === periodLabel.toLowerCase() ||
        (payload.period_index && d.period_index === Number(payload.period_index))
    );

    if (!targetDiv) {
      throw Object.assign(new Error(`Invalid reporting period '${periodLabel}' for ${effFreq} schedule.`), { status: 400 });
    }

    const submissionType = payload.submission_type === "narrative_only" ? "narrative_only" : "actual_and_narrative";
    const narrative = payload.narrative ? String(payload.narrative).trim() : "";

    if (submissionType === "narrative_only") {
      if (!narrative) {
        throw Object.assign(new Error("Narrative description is required for narrative-only progress updates."), { status: 400 });
      }
    } else {
      if (kpi.requires_numeric && (payload.reported_actual === undefined || payload.reported_actual === null || payload.reported_actual === "")) {
        throw Object.assign(new Error("reported_actual is required for numeric target submissions."), { status: 400 });
      }
    }

    const periodTargets = assignment.period_targets || {};
    const plannedTarget =
      periodTargets[targetDiv.period_label] !== undefined && periodTargets[targetDiv.period_label] !== ""
        ? Number(periodTargets[targetDiv.period_label])
        : assignment.allocated_target ?? kpi.total_target ?? null;

    const reportedActual =
      submissionType === "narrative_only" || payload.reported_actual === undefined || payload.reported_actual === null || payload.reported_actual === ""
        ? null
        : Number(payload.reported_actual);

    const achievementPercent =
      reportedActual !== null && plannedTarget && plannedTarget > 0
        ? Math.min(100, Math.round((reportedActual / plannedTarget) * 1000) / 10)
        : null;

    const existing = await ShortTermPeriodReport.findOne({
      where: {
        assignment_id: assignmentId,
        period_label: targetDiv.period_label,
      },
    });

    if (existing) {
      await existing.update({
        submission_type: submissionType,
        planned_target: plannedTarget,
        reported_actual: reportedActual,
        achievement_percent: achievementPercent,
        narrative: narrative || existing.narrative,
        evidence_attachments: payload.evidence_attachments || existing.evidence_attachments,
        submitted_by: userId || existing.submitted_by,
        submitted_at: new Date(),
      });
      return existing;
    }

    return ShortTermPeriodReport.create({
      assignment_id: assignmentId,
      short_term_kpi_id: kpi.short_term_kpi_id,
      period_index: targetDiv.period_index,
      period_label: targetDiv.period_label,
      period_start_date: targetDiv.start_date,
      period_end_date: targetDiv.end_date,
      submission_type: submissionType,
      planned_target: plannedTarget,
      reported_actual: reportedActual,
      achievement_percent: achievementPercent,
      narrative: narrative || null,
      evidence_attachments: payload.evidence_attachments || [],
      submitted_by: userId || null,
      submitted_at: new Date(),
    });
  }

  async updateKpi(kpiId, data) {
    const kpi = await ShortTermKpi.findByPk(kpiId);
    if (!kpi) throw Object.assign(new Error("Short-term KPI not found"), { status: 404 });

    if (data.code !== undefined) kpi.code = String(data.code).trim().toUpperCase();
    if (data.title !== undefined) kpi.title = String(data.title).trim();
    if (data.unit !== undefined) kpi.unit = String(data.unit).trim();
    if (data.total_target !== undefined) {
      kpi.total_target = data.total_target === "" || data.total_target === null ? null : Number(data.total_target);
    }
    if (data.evaluation_mode !== undefined) {
      kpi.evaluation_mode = normalizeEvaluationMode(data.evaluation_mode);
    }
    if (data.target_mode !== undefined) kpi.target_mode = data.target_mode;
    if (data.reporting_frequency !== undefined) {
      kpi.reporting_frequency = normalizeFrequency(data.reporting_frequency);
    }
    if (data.allow_narrative_only_updates !== undefined) {
      kpi.allow_narrative_only_updates = Boolean(data.allow_narrative_only_updates);
    }
    await kpi.save();
    return kpi;
  }

  async deleteKpi(kpiId) {
    const kpi = await ShortTermKpi.findByPk(kpiId);
    if (!kpi) throw Object.assign(new Error("Short-term KPI not found"), { status: 404 });
    await kpi.destroy();
    return { success: true, message: "Short-term KPI deleted" };
  }

  async updateAssignment(assignmentId, data) {
    const assignment = await ShortTermKpiAssignment.findByPk(assignmentId);
    if (!assignment) throw Object.assign(new Error("Short-term KPI assignment not found"), { status: 404 });

    if (data.internal_structure_id !== undefined) assignment.internal_structure_id = data.internal_structure_id || null;
    if (data.assigned_user_id !== undefined) assignment.assigned_user_id = data.assigned_user_id || null;
    if (data.assignee_label !== undefined) assignment.assignee_label = data.assignee_label || null;
    if (data.allocated_target !== undefined) {
      assignment.allocated_target =
        data.allocated_target === "" || data.allocated_target === null ? null : Number(data.allocated_target);
    }
    if (data.evaluation_mode_override !== undefined) {
      assignment.evaluation_mode_override = data.evaluation_mode_override
        ? normalizeEvaluationMode(data.evaluation_mode_override)
        : null;
    }
    if (data.reporting_frequency_override !== undefined) {
      assignment.reporting_frequency_override = data.reporting_frequency_override
        ? normalizeFrequency(data.reporting_frequency_override)
        : null;
    }
    if (data.period_targets !== undefined) {
      assignment.period_targets = data.period_targets || {};
    }
    await assignment.save();
    return assignment;
  }

  async getDashboardAnalytics(filters = {}) {
    const planWhere = {};
    if (filters.planId) planWhere.short_term_plan_id = filters.planId;
    if (filters.government_structure_id) planWhere.government_structure_id = filters.government_structure_id;

    const plans = await ShortTermPlan.findAll({
      where: planWhere,
      include: [
        { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
        {
          model: ShortTermKpi,
          as: "kpis",
          include: [
            {
              model: ShortTermKpiAssignment,
              as: "assignments",
              include: [
                { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
                { model: InternalStructure, as: "department", attributes: ["internal_structure_id", "name"] },
                { model: User, as: "assignedUser", attributes: ["user_id", "full_name", "email"] },
                { model: ShortTermPeriodReport, as: "reports" },
              ],
            },
          ],
        },
      ],
    });

    const sectorMap = new Map();
    const assigneeMap = new Map();
    const kpiProgress = [];
    const evalModeBreakdown = { number: 0, percentage: 0, frequency: 0 };

    let totalKpis = 0;
    let totalAssignments = 0;
    let totalReports = 0;
    let numericReports = 0;
    let narrativeOnlyReports = 0;
    let achievementSum = 0;
    let achievementCount = 0;

    for (const plan of plans) {
      const pJson = plan.toJSON();
      const sectorNameDefault = pJson.sector?.name || "Unassigned Sector";
      const sectorIdDefault = pJson.government_structure_id || "unassigned";

      for (const kpi of pJson.kpis || []) {
        totalKpis += 1;
        const evalMode = normalizeEvaluationMode(
          kpi.evaluation_mode || (kpi.target_mode === "continuous" ? "percentage" : "number")
        );
        evalModeBreakdown[evalMode] = (evalModeBreakdown[evalMode] || 0) + 1;

        let kpiAchievementSum = 0;
        let kpiAchievementCount = 0;
        let kpiActualSum = 0;
        let kpiReportsCount = 0;

        for (const a of kpi.assignments || []) {
          totalAssignments += 1;
          const effFreq = normalizeFrequency(a.reporting_frequency_override || kpi.reporting_frequency || pJson.default_frequency);
          const divisions = generateShortTermDivisions(pJson.start_date, pJson.end_date, effFreq, pJson.calendar_system);
          const { summary } = summarizeAssignmentProgress(kpi, a, divisions, a.reports || []);

          const sId = a.sector?.government_structure_id || sectorIdDefault;
          const sName = a.sector?.name || sectorNameDefault;
          if (!sectorMap.has(sId)) {
            sectorMap.set(sId, {
              government_structure_id: sId,
              sector_name: sName,
              kpi_count: 0,
              assignment_count: 0,
              total_reports: 0,
              numeric_reports: 0,
              narrative_only_reports: 0,
              achievement_sum: 0,
              achievement_count: 0,
            });
          }
          const secEntry = sectorMap.get(sId);
          secEntry.assignment_count += 1;
          secEntry.total_reports += summary.reported_count;
          secEntry.numeric_reports += summary.numeric_reports_count;
          secEntry.narrative_only_reports += summary.narrative_only_count;
          if (summary.overall_achievement_percent !== null) {
            secEntry.achievement_sum += summary.overall_achievement_percent;
            secEntry.achievement_count += 1;
          }

          // Assignee (Department or User)
          const assigneeType = a.assigned_user_id ? "User" : a.internal_structure_id ? "Department" : "Sector / Desk";
          const assigneeKey = a.assigned_user_id || a.internal_structure_id || a.assignee_label || sId;
          const assigneeName =
            a.assignedUser?.full_name || a.department?.name || a.assignee_label || sName;

          if (!assigneeMap.has(assigneeKey)) {
            assigneeMap.set(assigneeKey, {
              assignee_key: assigneeKey,
              assignee_name: assigneeName,
              assignee_type: assigneeType,
              sector_name: sName,
              assigned_kpis: 0,
              total_reports: 0,
              numeric_reports: 0,
              narrative_only_reports: 0,
              achievement_sum: 0,
              achievement_count: 0,
            });
          }
          const asgEntry = assigneeMap.get(assigneeKey);
          asgEntry.assigned_kpis += 1;
          asgEntry.total_reports += summary.reported_count;
          asgEntry.numeric_reports += summary.numeric_reports_count;
          asgEntry.narrative_only_reports += summary.narrative_only_count;
          if (summary.overall_achievement_percent !== null) {
            asgEntry.achievement_sum += summary.overall_achievement_percent;
            asgEntry.achievement_count += 1;

            achievementSum += summary.overall_achievement_percent;
            achievementCount += 1;
            kpiAchievementSum += summary.overall_achievement_percent;
            kpiAchievementCount += 1;
          }

          if (summary.overall_actual !== null) {
            kpiActualSum += summary.overall_actual;
          }
          kpiReportsCount += summary.reported_count;
          totalReports += summary.reported_count;
          numericReports += summary.numeric_reports_count;
          narrativeOnlyReports += summary.narrative_only_count;
        }

        // Count unique KPIs per sector
        if (sectorMap.has(sectorIdDefault)) {
          sectorMap.get(sectorIdDefault).kpi_count += 1;
        }

        kpiProgress.push({
          short_term_kpi_id: kpi.short_term_kpi_id,
          code: kpi.code,
          title: kpi.title,
          sector_name: sectorNameDefault,
          unit: kpi.unit,
          evaluation_mode: evalMode,
          reporting_frequency: kpi.reporting_frequency,
          total_target: kpi.total_target,
          achieved_actual: kpiReportsCount > 0 ? Math.round(kpiActualSum * 100) / 100 : null,
          achievement_percent:
            kpiAchievementCount > 0 ? Math.round((kpiAchievementSum / kpiAchievementCount) * 10) / 10 : null,
          reports_count: kpiReportsCount,
        });
      }
    }

    const bySector = Array.from(sectorMap.values()).map((s) => ({
      ...s,
      avg_achievement_percent: s.achievement_count > 0 ? Math.round((s.achievement_sum / s.achievement_count) * 10) / 10 : 0,
    }));

    const byAssignee = Array.from(assigneeMap.values())
      .map((a) => ({
        ...a,
        avg_achievement_percent: a.achievement_count > 0 ? Math.round((a.achievement_sum / a.achievement_count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.total_reports - a.total_reports);

    return {
      overview: {
        total_plans: plans.length,
        total_kpis: totalKpis,
        total_assignments: totalAssignments,
        total_reports: totalReports,
        numeric_reports: numericReports,
        narrative_only_reports: narrativeOnlyReports,
        avg_achievement_percent: achievementCount > 0 ? Math.round((achievementSum / achievementCount) * 10) / 10 : 0,
        evaluation_mode_breakdown: evalModeBreakdown,
      },
      bySector,
      byAssignee,
      kpiProgress,
    };
  }
}

module.exports = new ShortTermPlanService();
