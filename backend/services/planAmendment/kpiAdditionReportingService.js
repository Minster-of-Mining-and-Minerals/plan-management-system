"use strict";

const { Op } = require("sequelize");
const { PlanVersion, PlanAmendment, PlanAmendmentAction } = require("../../models");
const { resolveMasterVersionId } = require("../planReviewVisibilityService");
const { normalizeTargetValue } = require("../../utils/planTargetReallocationValidationUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const { AMENDMENT_STATUS } = require("../../utils/planAmendmentWorkflowUtils");
const { normalizeKpiAdditionMetadata } = require("./kpiAdditionDomain");

function extractKpiAdditionFields(amendment, action = null) {
  const meta = normalizeKpiAdditionMetadata(
    action?.metadata ?? amendment.metadata ?? {}
  );
  const preview =
    action?.preview && typeof action.preview === "object" ? action.preview : {};
  const applyData =
    preview && Object.keys(preview).length
      ? preview
      : action?.apply_data && typeof action.apply_data === "object"
        ? action.apply_data
        : {};

  return {
    title: meta.title || amendment.title || null,
    parent_id: meta.parentId ?? null,
    annual_target:
      meta.annualTarget != null
        ? normalizeTargetValue(meta.annualTarget)
        : applyData.annual_target != null
          ? normalizeTargetValue(applyData.annual_target)
          : null,
    weight:
      meta.weight != null
        ? normalizeTargetValue(meta.weight)
        : applyData.weight != null
          ? normalizeTargetValue(applyData.weight)
          : null,
    reason: amendment.reason ?? meta.reason ?? null,
    reason_code: meta.reasonCode ?? null,
    effective_date: amendment.effective_date ?? meta.effectiveDate ?? null,
    master_kpi_id:
      applyData.live_master_kpi_id ??
      applyData.liveMasterKpiId ??
      applyData.master_kpi_id ??
      applyData.masterKpiId ??
      meta.masterKpiId ??
      meta.master_kpi_id ??
      null,
  };
}

function mapAmendmentToAddedKpi(amendment, action = null) {
  const fields = extractKpiAdditionFields(amendment, action);

  return {
    plan_amendment_id: amendment.plan_amendment_id,
    version: amendment.version ?? null,
    title: fields.title,
    reason: fields.reason,
    reason_code: fields.reason_code,
    effective_date: fields.effective_date,
    applied_at: amendment.applied_at ?? null,
    parent_id: fields.parent_id,
    annual_target: fields.annual_target,
    weight: fields.weight,
    added_by: amendment.requested_by ?? null,
    status: amendment.status,
    master_kpi_id: fields.master_kpi_id,
    action_sequence: action?.sequence ?? null,
  };
}

/**
 * Reporting: KPIs added via applied (and pending) KPI addition amendments for a master plan.
 */
async function getKpiAdditionReporting(planVersionId, rawQuery = {}, transaction = null) {
  if (!planVersionId) {
    return { success: false, message: "Plan version is required." };
  }

  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version) {
    return { success: false, message: "Plan version was not found." };
  }

  const liveMasterVersionId = await resolveMasterVersionId(planVersionId);
  const liveMaster = liveMasterVersionId
    ? await PlanVersion.findByPk(liveMasterVersionId, { transaction })
    : null;

  const emptyComparison = {
    baseline_label: "Original Plan",
    effective_label: "With Added KPIs",
    note: "Process has not started; no KPI additions have been applied.",
  };

  if (!liveMaster?.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return {
      success: true,
      data: {
        draft_id: liveMasterVersionId || planVersionId,
        process_started: false,
        current_amendment_version: null,
        added_kpis: [],
        comparison_mode: emptyComparison,
      },
    };
  }

  const includePending =
    rawQuery.includePending === "true" ||
    rawQuery.include_pending === "true" ||
    rawQuery.includePending === true;

  const statusFilter = includePending
    ? {
        [Op.in]: [
          AMENDMENT_STATUS.APPLIED,
          AMENDMENT_STATUS.PENDING_APPROVAL,
          AMENDMENT_STATUS.DRAFT,
        ],
      }
    : AMENDMENT_STATUS.APPLIED;

  const amendments = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: liveMaster.plan_version_id,
      status: statusFilter,
    },
    include: [
      {
        model: PlanAmendmentAction,
        as: "actions",
        required: false,
        where: { action_type: AMENDMENT_TYPE.KPI_ADDITION },
      },
    ],
    order: [
      ["version", "ASC"],
      ["requested_at", "ASC"],
      [{ model: PlanAmendmentAction, as: "actions" }, "sequence", "ASC"],
    ],
    transaction,
  });

  const addedKpis = [];

  for (const amendment of amendments) {
    const kpiActions = (amendment.actions || []).filter(
      (action) => action.action_type === AMENDMENT_TYPE.KPI_ADDITION
    );

    if (!kpiActions.length && amendment.amendment_type !== AMENDMENT_TYPE.KPI_ADDITION) {
      continue;
    }

    const actionList = kpiActions.length
      ? kpiActions
      : [{ metadata: amendment.metadata || {}, action_type: amendment.amendment_type }];

    for (const action of actionList) {
      addedKpis.push(mapAmendmentToAddedKpi(amendment, action));
    }
  }

  const currentAmendmentVersion = await PlanAmendment.max("version", {
    where: {
      master_plan_version_id: liveMaster.plan_version_id,
      version: { [Op.ne]: null },
    },
    transaction,
  });

  return {
    success: true,
    data: {
      draft_id: liveMaster.plan_version_id,
      process_started: true,
      current_amendment_version: currentAmendmentVersion,
      added_kpis: addedKpis,
      comparison_mode: {
        baseline_label: "Original Plan",
        effective_label: "With Added KPIs",
        note: "Lists KPIs introduced after process start via KPI addition amendments.",
      },
    },
  };
}

module.exports = {
  getKpiAdditionReporting,
};
