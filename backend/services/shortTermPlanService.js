"use strict";

const {
  ShortTermPlan,
  ShortTermPlanConfiguration,
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
  getTodayDateInAddisAbaba,
  computeDivisionLockStatus,
  generateShortTermDivisions,
  summarizeAssignmentProgress,
} = require("../utils/shortTermPlanPeriodUtils");

async function isSectorInHierarchy(targetSectorId, rootSectorId) {
  if (!rootSectorId || !targetSectorId) return true;
  if (targetSectorId === rootSectorId) return true;

  let currentId = targetSectorId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const sector = await GovernmentStructure.findByPk(currentId, { attributes: ["government_structure_id", "parent_id"] });
    if (!sector || !sector.parent_id) break;
    if (sector.parent_id === rootSectorId) return true;
    currentId = sector.parent_id;
  }
  return false;
}

function resolveAssignmentReportingAccess(assignment, currentUser) {
  if (!currentUser) {
    return { can_report: false, access_reason: "Authentication required" };
  }
  const roleNames = Array.isArray(currentUser.roles)
    ? currentUser.roles.map((r) => String(r.name || r).toLowerCase())
    : [];
  const isSuperAdmin =
    Boolean(currentUser.is_super_admin) ||
    roleNames.some((r) => r.includes("super admin") || r === "super_admin");
  if (isSuperAdmin) {
    return { can_report: true, access_reason: null };
  }

  if (assignment.assigned_user_id) {
    if (currentUser.user_id === assignment.assigned_user_id) {
      return { can_report: true, access_reason: null };
    }
    return {
      can_report: false,
      access_reason: "Restricted: only the specifically assigned user can report on this KPI.",
    };
  }

  if (assignment.internal_structure_id) {
    if (currentUser.internal_structure_id === assignment.internal_structure_id) {
      return { can_report: true, access_reason: null };
    }
    return {
      can_report: false,
      access_reason: "Restricted: only users in the assigned department can report on this KPI.",
    };
  }

  if (assignment.government_structure_id) {
    if (currentUser.government_structure_id === assignment.government_structure_id) {
      return { can_report: true, access_reason: null };
    }
    return {
      can_report: false,
      access_reason: "Restricted: only users in the assigned sector can report on this KPI.",
    };
  }

  return { can_report: true, access_reason: null };
}

class ShortTermPlanService {
  async listPlans(filters = {}) {
    const where = {};
    if (filters.government_structure_id) where.government_structure_id = filters.government_structure_id;
    if (filters.status) where.status = filters.status;

    const plans = await ShortTermPlan.findAll({
      where,
      include: [
        { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
        { model: ShortTermPlanConfiguration, as: "configuration" },
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

    const durationDays = Number(data.duration_days) || (Number(data.duration_months) ? Number(data.duration_months) * 30 : 100);
    if (durationDays > 365) {
      throw Object.assign(new Error("Short-term plan duration must be less than or equal to 1 year (365 days)"), { status: 400 });
    }
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const actualDays = Math.round(diffMs / 86400000);
    if (actualDays > 366) {
      throw Object.assign(new Error("The difference between start_date and end_date cannot exceed 1 year"), { status: 400 });
    }

    let configId = data.configuration_id || null;
    if (!configId) {
      const defConf = await ShortTermPlanConfiguration.findOne({ where: { is_default: true, is_active: true } });
      if (defConf) configId = defConf.configuration_id;
    }

    return ShortTermPlan.create({
      title: data.title.trim(),
      description: data.description ? data.description.trim() : null,
      configuration_id: configId,
      government_structure_id: data.government_structure_id || null,
      calendar_system: cal,
      start_date: startDate,
      end_date: endDate,
      duration_days: durationDays,
      duration_months: Number(data.duration_months) || Math.max(1, Math.round(durationDays / 30)),
      default_frequency: normalizeFrequency(data.default_frequency || "weekly"),
      status: data.status || "active",
      created_by: userId || null,
    });
  }

  async updatePlan(planId, data, userId) {
    const plan = await ShortTermPlan.findByPk(planId);
    if (!plan) {
      throw Object.assign(new Error("Short-term plan not found"), { status: 404 });
    }

    const updates = {};
    if (data.title !== undefined) updates.title = String(data.title).trim();
    if (data.description !== undefined) updates.description = data.description ? String(data.description).trim() : null;
    if (data.government_structure_id !== undefined) updates.government_structure_id = data.government_structure_id || null;
    if (data.configuration_id !== undefined) updates.configuration_id = data.configuration_id || null;
    if (data.status !== undefined) updates.status = data.status;
    if (data.default_frequency !== undefined) updates.default_frequency = normalizeFrequency(data.default_frequency);
    if (data.calendar_system !== undefined) updates.calendar_system = normalizeCalendarSystem(data.calendar_system, "EC");

    let startDate = data.start_date !== undefined ? String(data.start_date).trim() : plan.start_date;
    let endDate = data.end_date !== undefined ? String(data.end_date).trim() : plan.end_date;

    if (data.start_date !== undefined || data.end_date !== undefined) {
      if (new Date(startDate) >= new Date(endDate)) {
        throw Object.assign(new Error("start_date must be before end_date"), { status: 400 });
      }
      updates.start_date = startDate;
      updates.end_date = endDate;
      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const actualDays = Math.round(diffMs / 86400000);
      updates.duration_days = Number(data.duration_days) || actualDays;
      updates.duration_months = Math.max(1, Math.round(updates.duration_days / 30));
    } else if (data.duration_days !== undefined) {
      updates.duration_days = Number(data.duration_days);
      updates.duration_months = Math.max(1, Math.round(updates.duration_days / 30));
    }

    await plan.update(updates);
    return this.getPlanDetail(planId);
  }

  async deletePlan(planId, userId) {
    const plan = await ShortTermPlan.findByPk(planId, {
      include: [
        {
          model: ShortTermKpi,
          as: "kpis",
          include: [{ model: ShortTermKpiAssignment, as: "assignments" }],
        },
      ],
    });

    if (!plan) {
      throw Object.assign(new Error("Short-term plan not found"), { status: 404 });
    }

    // Cascade delete reports, assignments, kpis, and plan
    for (const kpi of plan.kpis || []) {
      for (const asgn of kpi.assignments || []) {
        await ShortTermPeriodReport.destroy({ where: { assignment_id: asgn.assignment_id } });
        await asgn.destroy();
      }
      await kpi.destroy();
    }

    await plan.destroy();
    return { success: true, message: "Short-term plan deleted successfully" };
  }

  async duplicatePlan(planId, data = {}, userId) {
    const sourcePlan = await ShortTermPlan.findByPk(planId, {
      include: [
        {
          model: ShortTermKpi,
          as: "kpis",
          include: [
            {
              model: ShortTermKpiAssignment,
              as: "assignments",
            },
          ],
        },
      ],
    });

    if (!sourcePlan) {
      throw Object.assign(new Error("Source short-term plan not found"), { status: 404 });
    }

    const newTitle = data.title ? String(data.title).trim() : `Copy of ${sourcePlan.title}`;
    const newStartDate = data.start_date || sourcePlan.start_date;
    const newEndDate = data.end_date || sourcePlan.end_date;

    const newPlan = await ShortTermPlan.create({
      title: newTitle,
      description: sourcePlan.description,
      configuration_id: sourcePlan.configuration_id,
      government_structure_id: sourcePlan.government_structure_id,
      calendar_system: sourcePlan.calendar_system,
      start_date: newStartDate,
      end_date: newEndDate,
      duration_days: sourcePlan.duration_days,
      duration_months: sourcePlan.duration_months,
      default_frequency: sourcePlan.default_frequency,
      status: "draft",
      created_by: userId || null,
    });

    // Duplicate all KPIs and their assignments (excluding period reports)
    for (const kpi of sourcePlan.kpis || []) {
      const newKpi = await ShortTermKpi.create({
        short_term_plan_id: newPlan.short_term_plan_id,
        code: `${kpi.code}`,
        title: kpi.title,
        description: kpi.description,
        unit: kpi.unit,
        total_target: kpi.total_target,
        target_mode: kpi.target_mode,
        evaluation_mode: kpi.evaluation_mode,
        reporting_frequency: kpi.reporting_frequency,
        is_active: kpi.is_active,
        created_by: userId || null,
      });

      for (const asgn of kpi.assignments || []) {
        await ShortTermKpiAssignment.create({
          short_term_kpi_id: newKpi.short_term_kpi_id,
          government_structure_id: asgn.government_structure_id,
          internal_structure_id: asgn.internal_structure_id,
          assigned_user_id: asgn.assigned_user_id,
          allocated_target: asgn.allocated_target,
          period_targets: asgn.period_targets,
          reporting_frequency_override: asgn.reporting_frequency_override,
          evaluation_mode_override: asgn.evaluation_mode_override,
          can_report: asgn.can_report,
          created_by: userId || null,
        });
      }
    }

    return this.getPlanDetail(newPlan.short_term_plan_id);
  }

  async getPlanDetail(planId, filters = {}, currentUser = null) {
    const plan = await ShortTermPlan.findByPk(planId, {
      include: [
        { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
        { model: ShortTermPlanConfiguration, as: "configuration" },
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
          const access = resolveAssignmentReportingAccess(a, currentUser);
          return {
            ...a,
            effective_frequency: effFreq,
            can_report: access.can_report,
            access_reason: access.access_reason,
            divisions: progress.divisions,
            progress_summary: progress.summary,
          };
        });

      return { ...kpi, assignments };
    });

    return item;
  }

  async getKpiDetail(kpiId, currentUser = null) {
    const kpi = await ShortTermKpi.findByPk(kpiId, {
      include: [
        {
          model: ShortTermPlan,
          as: "plan",
          include: [
            { model: GovernmentStructure, as: "sector", attributes: ["government_structure_id", "name"] },
          ],
        },
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
    });

    if (!kpi) {
      throw Object.assign(new Error("Short-term KPI not found"), { status: 404 });
    }

    const item = kpi.toJSON();
    const plan = item.plan;
    const kpiFreq = normalizeFrequency(item.reporting_frequency || plan?.default_frequency || "weekly");
    const todayGc = getTodayDateInAddisAbaba();

    item.assignments = (item.assignments || []).map((a) => {
      const effFreq = normalizeFrequency(a.reporting_frequency_override || kpiFreq);
      const divisions = generateShortTermDivisions(plan.start_date, plan.end_date, effFreq, plan.calendar_system);
      const progress = summarizeAssignmentProgress(item, a, divisions, a.reports || []);
      const access = resolveAssignmentReportingAccess(a, currentUser);

      // Build Month -> Week/Day cascaded classification groups
      const monthlyPeriods = generateShortTermDivisions(plan.start_date, plan.end_date, "monthly", plan.calendar_system);
      const monthlyGroups = monthlyPeriods.map((m) => {
        const childDivs = progress.divisions.filter(
          (d) => (d.parent_month_label || d.period_label) === m.period_label
        );
        const monthLock = computeDivisionLockStatus(m, todayGc);

        let monthTarget = 0;
        let hasMonthTarget = false;
        let monthActual = 0;
        let hasMonthActual = false;
        let reportedCount = 0;

        childDivs.forEach((d) => {
          if (d.planned_target !== null && d.planned_target !== undefined) {
            monthTarget += Number(d.planned_target);
            hasMonthTarget = true;
          }
          if (d.report) {
            reportedCount += 1;
            if (d.report.reported_actual !== null && d.report.reported_actual !== undefined) {
              monthActual += Number(d.report.reported_actual);
              hasMonthActual = true;
            }
          }
        });

        const evalMode = progress.summary.effective_evaluation_mode;
        if (evalMode === "percentage" && hasMonthActual) {
          const lastNumeric = [...childDivs].reverse().find((d) => d.report?.reported_actual != null);
          if (lastNumeric?.report?.reported_actual != null) {
            monthActual = Number(lastNumeric.report.reported_actual);
          }
        }

        const effectiveTarget = hasMonthTarget ? Math.round(monthTarget * 100) / 100 : null;
        const effectiveActual = hasMonthActual ? Math.round(monthActual * 100) / 100 : null;
        const achPct =
          effectiveTarget && effectiveTarget > 0 && effectiveActual !== null
            ? Math.min(100, Math.round((effectiveActual / effectiveTarget) * 1000) / 10)
            : null;

        return {
          ...m,
          lock_status: monthLock.lock_status,
          is_locked: monthLock.is_locked,
          lock_reason: monthLock.lock_reason,
          month_target: effectiveTarget,
          month_actual: effectiveActual,
          achievement_percent: achPct,
          reported_count: reportedCount,
          total_children: childDivs.length,
          divisions: childDivs,
        };
      });

      return {
        ...a,
        effective_frequency: effFreq,
        can_report: access.can_report,
        access_reason: access.access_reason,
        divisions: progress.divisions,
        monthly_groups: monthlyGroups,
        progress_summary: progress.summary,
      };
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

    if (kpi.plan?.government_structure_id) {
      const allowed = await isSectorInHierarchy(sectorId, kpi.plan.government_structure_id);
      if (!allowed) {
        throw Object.assign(
          new Error("Assignment restricted: The selected sector must be the plan's mother sector or one of its child institutions."),
          { status: 400 }
        );
      }
    }

    let internalStructureId = payload.internal_structure_id || null;
    const assignedUserId = payload.assigned_user_id || null;
    if (!internalStructureId && assignedUserId) {
      const targetUser = await User.findByPk(assignedUserId, { attributes: ["user_id", "internal_structure_id"] });
      if (targetUser?.internal_structure_id) {
        internalStructureId = targetUser.internal_structure_id;
      }
    }

    return ShortTermKpiAssignment.create({
      short_term_kpi_id: kpiId,
      government_structure_id: sectorId,
      internal_structure_id: internalStructureId,
      assigned_user_id: assignedUserId,
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

  async submitPeriodReport(assignmentId, payload, userOrId) {
    const currentUser = userOrId && typeof userOrId === "object" ? userOrId : null;
    const userId = currentUser ? currentUser.user_id : userOrId || null;

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

    if (currentUser) {
      const access = resolveAssignmentReportingAccess(assignment, currentUser);
      if (!access.can_report) {
        throw Object.assign(new Error(access.access_reason || "You are not authorized to report on this KPI."), {
          status: 403,
        });
      }
    }

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

    // Calendar-based date lock check (Africa/Addis_Ababa UTC+3)
    const todayGc = getTodayDateInAddisAbaba();
    const lockInfo = computeDivisionLockStatus(targetDiv, todayGc);
    if (lockInfo.is_locked) {
      throw Object.assign(
        new Error(`Reporting period '${targetDiv.period_label}' is currently locked. ${lockInfo.lock_reason}`),
        { status: 403 }
      );
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

    const sanitizedAttachments = Array.isArray(payload.evidence_attachments)
      ? payload.evidence_attachments.map((att, idx) => {
          const label = String(att?.label || "").trim();
          const description = String(att?.description || "").trim();
          if (!label || !description) {
            throw Object.assign(
              new Error(
                `Attachment #${idx + 1} must include both a display label and a description of its relation to the KPI.`
              ),
              { status: 400 }
            );
          }
          return {
            attachment_id: att.attachment_id || null,
            file_name: att.file_name || label,
            file_path: att.file_path || att.file_url || "",
            mime_type: att.mime_type || null,
            size: att.size ?? null,
            label,
            description,
          };
        })
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
        evidence_attachments: sanitizedAttachments !== null ? sanitizedAttachments : existing.evidence_attachments,
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
      evidence_attachments: sanitizedAttachments || [],
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

    if (data.government_structure_id !== undefined && data.government_structure_id) {
      assignment.government_structure_id = data.government_structure_id;
    }
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

  async listConfigurations(filters = {}) {
    const where = {};
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active === "true" || filters.is_active === true;
    }
    return ShortTermPlanConfiguration.findAll({
      where,
      order: [
        ["is_default", "DESC"],
        ["created_at", "DESC"],
      ],
    });
  }

  async createConfiguration(data, userId) {
    if (!data.title || !data.code) {
      throw Object.assign(new Error("title and code are required"), { status: 400 });
    }

    const durationDays = Number(data.duration_days) || 100;
    if (durationDays > 365) {
      throw Object.assign(new Error("duration_days cannot exceed 365"), { status: 400 });
    }

    if (data.is_default) {
      await ShortTermPlanConfiguration.update({ is_default: false }, { where: {} });
    }

    return ShortTermPlanConfiguration.create({
      title: data.title.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description ? data.description.trim() : null,
      duration_days: durationDays,
      subdivision_mode: data.subdivision_mode || "weekly_4_per_month",
      reporting_window_before_days: Number(data.reporting_window_before_days) >= 0 ? Number(data.reporting_window_before_days) : 3,
      reporting_window_after_days: Number(data.reporting_window_after_days) >= 0 ? Number(data.reporting_window_after_days) : 5,
      allow_past_reporting: Boolean(data.allow_past_reporting),
      require_evidence_default: Boolean(data.require_evidence_default),
      is_default: Boolean(data.is_default),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_by: userId || null,
    });
  }

  async updateConfiguration(configurationId, data) {
    const conf = await ShortTermPlanConfiguration.findByPk(configurationId);
    if (!conf) throw Object.assign(new Error("Configuration not found"), { status: 404 });

    if (data.is_default && !conf.is_default) {
      await ShortTermPlanConfiguration.update({ is_default: false }, { where: {} });
    }

    const updateFields = {};
    if (data.title) updateFields.title = data.title.trim();
    if (data.description !== undefined) updateFields.description = data.description ? data.description.trim() : null;
    if (data.subdivision_mode) updateFields.subdivision_mode = data.subdivision_mode;
    if (data.duration_days) updateFields.duration_days = Math.min(365, Number(data.duration_days));
    if (data.reporting_window_before_days !== undefined) updateFields.reporting_window_before_days = Number(data.reporting_window_before_days);
    if (data.reporting_window_after_days !== undefined) updateFields.reporting_window_after_days = Number(data.reporting_window_after_days);
    if (data.allow_past_reporting !== undefined) updateFields.allow_past_reporting = Boolean(data.allow_past_reporting);
    if (data.require_evidence_default !== undefined) updateFields.require_evidence_default = Boolean(data.require_evidence_default);
    if (data.is_default !== undefined) updateFields.is_default = Boolean(data.is_default);
    if (data.is_active !== undefined) updateFields.is_active = Boolean(data.is_active);

    await conf.update(updateFields);
    return conf;
  }
}

module.exports = new ShortTermPlanService();
