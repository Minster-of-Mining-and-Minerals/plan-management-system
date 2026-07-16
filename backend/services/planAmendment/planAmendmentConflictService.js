"use strict";

const { Op } = require("sequelize");
const { PlanAmendment, PlanAmendmentAction } = require("../../models");
const { AMENDMENT_STATUS } = require("../../utils/planAmendmentWorkflowUtils");
const {
  resolveAmendmentHandler,
  ensureDefaultAmendmentHandlers,
} = require("./planAmendmentRegistry");
const { normalizeAmendmentType } = require("../../utils/planAmendmentTypes");
const { sortActionsBySequence } = require("../../utils/planAmendmentActionUtils");

function normalizeKeyList(values = []) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .filter(Boolean)
        .map((v) => String(v))
    ),
  ];
}

function buildEntityKeys({ kpiIds = [], periodIds = [], departmentIds = [], entityKeys = [] }) {
  const keys = new Set(normalizeKeyList(entityKeys));
  for (const id of normalizeKeyList(kpiIds)) keys.add(`kpi:${id}`);
  for (const id of normalizeKeyList(periodIds)) keys.add(`period:${id}`);
  for (const id of normalizeKeyList(departmentIds)) keys.add(`department:${id}`);
  return [...keys];
}

async function collectActionConflictKeys(action, amendment, user, options = {}) {
  ensureDefaultAmendmentHandlers();
  const type = normalizeAmendmentType(action.action_type || action.actionType);
  const handler = resolveAmendmentHandler(type);
  if (!handler || typeof handler.conflictKeys !== "function") {
    return { kpiIds: [], periodIds: [], departmentIds: [], entityKeys: [] };
  }

  const keys = await handler.conflictKeys({
    amendment,
    action,
    metadata: action.metadata || {},
    user,
    transaction: options.transaction ?? null,
    policy: options.policy ?? null,
    effective: options.effective ?? null,
    options,
  });

  return {
    kpiIds: normalizeKeyList(keys?.kpiIds),
    periodIds: normalizeKeyList(keys?.periodIds),
    departmentIds: normalizeKeyList(keys?.departmentIds),
    entityKeys: buildEntityKeys(keys || {}),
  };
}

async function collectAmendmentConflictFingerprint(amendment, actions, user, options = {}) {
  const sorted = sortActionsBySequence(actions);
  const kpiIds = new Set();
  const periodIds = new Set();
  const departmentIds = new Set();
  const entityKeys = new Set();

  for (const action of sorted) {
    const keys = await collectActionConflictKeys(action, amendment, user, options);
    keys.kpiIds.forEach((id) => kpiIds.add(id));
    keys.periodIds.forEach((id) => periodIds.add(id));
    keys.departmentIds.forEach((id) => departmentIds.add(id));
    keys.entityKeys.forEach((id) => entityKeys.add(id));
  }

  return {
    kpiIds: [...kpiIds],
    periodIds: [...periodIds],
    departmentIds: [...departmentIds],
    entityKeys: [...entityKeys],
  };
}

function fingerprintsOverlap(a, b) {
  const setB = new Set(b.entityKeys || []);
  const overlappingKeys = (a.entityKeys || []).filter((k) => setB.has(k));
  const overlappingKpis = normalizeKeyList(a.kpiIds).filter((id) =>
    normalizeKeyList(b.kpiIds).includes(id)
  );
  const overlappingPeriods = normalizeKeyList(a.periodIds).filter((id) =>
    normalizeKeyList(b.periodIds).includes(id)
  );

  return {
    overlaps: overlappingKeys.length > 0 || overlappingKpis.length > 0 || overlappingPeriods.length > 0,
    overlappingKeys,
    overlappingKpis,
    overlappingPeriods,
  };
}

async function detectAmendmentConflicts(amendment, actions, user, options = {}) {
  const transaction = options.transaction ?? null;
  const masterId = amendment.master_plan_version_id;
  const selfId = amendment.plan_amendment_id;

  const currentVersion = await PlanAmendment.max("version", {
    where: {
      master_plan_version_id: masterId,
      version: { [Op.ne]: null },
    },
    transaction,
  });
  const currentVersionNumber = Number(currentVersion) || 0;

  if (
    amendment.expected_version != null &&
    Number(amendment.expected_version) !== currentVersionNumber
  ) {
    return {
      valid: false,
      message: `Plan version mismatch. Expected version ${amendment.expected_version}, current effective version is ${currentVersionNumber}.`,
      details: {
        expected_version: Number(amendment.expected_version),
        current_version: currentVersionNumber,
        conflict_type: "plan_version_mismatch",
      },
    };
  }

  const fingerprint = await collectAmendmentConflictFingerprint(
    amendment,
    actions,
    user,
    options
  );

  if (!fingerprint.entityKeys.length && !fingerprint.kpiIds.length && !fingerprint.periodIds.length) {
    return {
      valid: true,
      fingerprint,
      current_version: currentVersionNumber,
      conflicts: [],
    };
  }

  const pendingAmendments = await PlanAmendment.findAll({
    where: {
      master_plan_version_id: masterId,
      plan_amendment_id: { [Op.ne]: selfId },
      status: {
        [Op.in]: [AMENDMENT_STATUS.DRAFT, AMENDMENT_STATUS.PENDING_APPROVAL],
      },
    },
    include: [
      {
        model: PlanAmendmentAction,
        as: "actions",
        required: false,
      },
    ],
    transaction,
  });

  const conflicts = [];
  for (const other of pendingAmendments) {
    let otherActions = other.actions || [];
    if (!otherActions.length) {
      otherActions = [
        {
          action_type: other.amendment_type,
          metadata: other.metadata || {},
          sequence: 1,
        },
      ];
    }

    const otherFp = await collectAmendmentConflictFingerprint(
      other,
      otherActions,
      user,
      options
    );
    const overlap = fingerprintsOverlap(fingerprint, otherFp);
    if (overlap.overlaps) {
      conflicts.push({
        plan_amendment_id: other.plan_amendment_id,
        title: other.title,
        status: other.status,
        overlapping_keys: overlap.overlappingKeys,
        overlapping_kpis: overlap.overlappingKpis,
        overlapping_periods: overlap.overlappingPeriods,
      });
    }
  }

  if (conflicts.length) {
    return {
      valid: false,
      message:
        "Conflicting pending amendment(s) touch the same KPI, period, or entity. Resolve or cancel conflicts before continuing.",
      details: {
        conflict_type: "concurrent_amendment",
        current_version: currentVersionNumber,
        fingerprint,
        conflicts,
      },
    };
  }

  return {
    valid: true,
    fingerprint,
    current_version: currentVersionNumber,
    conflicts: [],
  };
}

module.exports = {
  buildEntityKeys,
  collectActionConflictKeys,
  collectAmendmentConflictFingerprint,
  detectAmendmentConflicts,
  fingerprintsOverlap,
};
