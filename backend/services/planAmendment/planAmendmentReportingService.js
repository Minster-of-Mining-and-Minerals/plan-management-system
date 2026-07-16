"use strict";

const { Op } = require("sequelize");
const {
  PlanAmendment,
  PlanAmendmentAction,
  PlanAmendmentHistory,
} = require("../../models");
const { AMENDMENT_STATUS } = require("../../utils/planAmendmentWorkflowUtils");
const { amendmentTypeLabel } = require("../../utils/planAmendmentTypes");
const {
  serializePlanAmendmentAction,
} = require("../../utils/planAmendmentActionUtils");
const {
  resolveCurrentAmendmentVersion,
} = require("./planAmendmentVersionUtils");

function serializeHistoryRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    id: plain.plan_amendment_history_id,
    plan_amendment_history_id: plain.plan_amendment_history_id,
    plan_amendment_id: plain.plan_amendment_id,
    plan_amendment_action_id: plain.plan_amendment_action_id ?? null,
    entity_type: plain.entity_type,
    entity_id: plain.entity_id,
    field_name: plain.field_name,
    old_value: plain.old_value,
    new_value: plain.new_value,
    changed_at: plain.changed_at,
    changed_by: plain.changed_by,
  };
}

function summarizeActions(actions = []) {
  return actions.map((action) => ({
    action_type: action.action_type,
    action_type_label: amendmentTypeLabel(action.action_type),
    sequence: action.sequence,
    status: action.status,
  }));
}

async function getPlanAmendmentReporting(masterPlanVersionId) {
  if (!masterPlanVersionId) {
    return { success: false, message: "Draft plan (master plan version) is required." };
  }

  const currentVersion = await resolveCurrentAmendmentVersion(masterPlanVersionId);

  const applied = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: masterPlanVersionId,
      status: AMENDMENT_STATUS.APPLIED,
    },
    include: [{ model: PlanAmendmentAction, as: "actions", required: false }],
    order: [
      ["version", "ASC"],
      [{ model: PlanAmendmentAction, as: "actions" }, "sequence", "ASC"],
    ],
  });

  const pending = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: masterPlanVersionId,
      status: {
        [Op.in]: [AMENDMENT_STATUS.DRAFT, AMENDMENT_STATUS.PENDING_APPROVAL],
      },
    },
    include: [{ model: PlanAmendmentAction, as: "actions", required: false }],
    order: [
      ["requested_at", "DESC"],
      [{ model: PlanAmendmentAction, as: "actions" }, "sequence", "ASC"],
    ],
  });

  return {
    success: true,
    data: {
      draft_id: masterPlanVersionId,
      master_plan_version_id: masterPlanVersionId,
      original_baseline: {
        version: 0,
        label: "Original Baseline",
        note: "Targets and structure at process start / formal approval",
      },
      current_effective_plan: {
        version: currentVersion,
        label: currentVersion > 0 ? `Version ${currentVersion}` : "Original Baseline",
      },
      current_version: currentVersion,
      applied_amendments: applied.map((row) => ({
        id: row.plan_amendment_id,
        title: row.title,
        reason: row.reason ?? row.description ?? null,
        amendment_type: row.amendment_type,
        amendment_type_label: amendmentTypeLabel(row.amendment_type),
        is_package: Boolean(row.is_package),
        version: row.version,
        effective_mode: row.effective_mode,
        effective_date: row.effective_date,
        applied_at: row.applied_at,
        action_summary: summarizeActions(row.actions || []),
      })),
      pending_amendments: pending.map((row) => ({
        id: row.plan_amendment_id,
        title: row.title,
        reason: row.reason ?? row.description ?? null,
        status: row.status,
        amendment_type: row.amendment_type,
        is_package: Boolean(row.is_package),
        effective_mode: row.effective_mode,
        effective_date: row.effective_date,
        requested_at: row.requested_at,
        action_summary: summarizeActions(row.actions || []),
      })),
    },
  };
}

async function getAmendmentHistory(amendmentId, { actionId = null } = {}) {
  const where = { plan_amendment_id: amendmentId };
  if (actionId) {
    where.plan_amendment_action_id = actionId;
  }

  const rows = await PlanAmendmentHistory.findAll({
    where,
    order: [["changed_at", "ASC"]],
  });

  return {
    success: true,
    data: rows.map(serializeHistoryRow),
  };
}

async function getAmendmentActions(amendmentId) {
  const actions = await PlanAmendmentAction.findAll({
    where: { plan_amendment_id: amendmentId },
    order: [["sequence", "ASC"]],
  });

  return {
    success: true,
    data: actions.map((row) => serializePlanAmendmentAction(row)),
  };
}

module.exports = {
  getPlanAmendmentReporting,
  getAmendmentHistory,
  getAmendmentActions,
  serializeHistoryRow,
  summarizeActions,
};
