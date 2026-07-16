"use strict";

const {
  resolveAmendmentHandler,
  ensureDefaultAmendmentHandlers,
} = require("./planAmendmentRegistry");
const { normalizeAmendmentType, amendmentTypeLabel } = require("../../utils/planAmendmentTypes");
const {
  sortActionsBySequence,
  serializePlanAmendmentAction,
} = require("../../utils/planAmendmentActionUtils");
const { resolveNextAmendmentVersion } = require("./planAmendmentVersionUtils");

function uniqueStrings(values = []) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

async function buildActionImpact(action, amendment, user, options = {}) {
  ensureDefaultAmendmentHandlers();
  const type = normalizeAmendmentType(action.action_type || action.actionType);
  const handler = resolveAmendmentHandler(type);
  if (!handler) {
    return {
      success: false,
      message: `No handler registered for action type ${type}`,
      action: serializePlanAmendmentAction(action),
    };
  }

  const ctx = {
    amendment,
    action,
    metadata: action.metadata || {},
    user,
    transaction: options.transaction ?? null,
    policy: options.policy ?? null,
    effective: options.effective ?? null,
    options,
  };

  const impact = await handler.impact(ctx);
  if (!impact?.success) {
    return {
      success: false,
      message: impact?.message || "Impact analysis failed",
      action: serializePlanAmendmentAction(action),
    };
  }

  return {
    success: true,
    action: serializePlanAmendmentAction(action),
    action_type: type,
    action_type_label: amendmentTypeLabel(type),
    sequence: action.sequence,
    data: impact.data || {},
  };
}

async function aggregateAmendmentImpact(amendment, actions, user, options = {}) {
  const sorted = sortActionsBySequence(actions);
  const actionImpacts = [];
  const summary = [];
  const kpiIds = [];
  const departmentIds = [];
  const periodIds = [];
  const changes = [];

  for (const action of sorted) {
    const row = await buildActionImpact(action, amendment, user, options);
    if (!row.success) {
      return {
        success: false,
        message: row.message,
        details: { failed_action_sequence: action.sequence, action: row.action },
      };
    }
    actionImpacts.push(row);
    const data = row.data || {};
    if (Array.isArray(data.summary)) summary.push(...data.summary);
    if (Array.isArray(data.kpiIds)) kpiIds.push(...data.kpiIds);
    if (Array.isArray(data.departmentIds)) departmentIds.push(...data.departmentIds);
    if (Array.isArray(data.periodIds)) periodIds.push(...data.periodIds);
    if (Array.isArray(data.changes)) changes.push(...data.changes);
  }

  const nextVersion = await resolveNextAmendmentVersion(
    amendment.master_plan_version_id,
    options.transaction ?? null
  );

  const uniqueKpis = uniqueStrings(kpiIds);
  const uniqueDepartments = uniqueStrings(departmentIds);
  const uniquePeriods = uniqueStrings(periodIds);

  const aggregateSummary = [
    ...summary,
    `Affect ${uniqueKpis.length} KPI(s)`,
    `Affect ${uniqueDepartments.length} department(s)`,
    `Affect ${uniquePeriods.length} period(s)`,
    `Produce Plan Version ${nextVersion}`,
  ];

  return {
    success: true,
    data: {
      amendment_id: amendment.plan_amendment_id,
      title: amendment.title,
      reason: amendment.reason ?? amendment.description ?? null,
      effective_mode: amendment.effective_mode,
      effective_date: amendment.effective_date,
      current_version: Math.max(0, nextVersion - 1),
      next_version: nextVersion,
      summary: aggregateSummary,
      kpi_count: uniqueKpis.length,
      department_count: uniqueDepartments.length,
      period_count: uniquePeriods.length,
      kpi_ids: uniqueKpis,
      department_ids: uniqueDepartments,
      period_ids: uniquePeriods,
      changes,
      actions: actionImpacts,
      modified: false,
    },
  };
}

module.exports = {
  buildActionImpact,
  aggregateAmendmentImpact,
};
