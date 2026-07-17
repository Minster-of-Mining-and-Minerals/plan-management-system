"use strict";

/**
 * KPI Addition amendment domain — validation, weight/period planning, preview, apply.
 * Creates a new KPI on the live master tree and mirrors it into the active execution snapshot.
 */

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
  PlanNode,
  PlanVersion,
  User,
  GovernmentStructure,
  InternalStructure,
  ExternalAssignment,
  InternalAssignment,
} = require("../../models");
const { buildLiveToSnapshotVersionMap } = require("../planExecutionSnapshotService");
const { resolveVersionExecutionAccess } = require("../planExecutionGateService");
const { validatePlanNodeAgainstRule } = require("../planRuleService");
const {
  pickNodeFields,
  syncMasterNodeToDerivedCopies,
  propagateMasterPlanNodeCreate,
  propagateExternalAssignmentCreate,
  propagateInternalAssignmentCreate,
} = require("../planMasterEditService");
const { syncPlanNodeAssignmentContext } = require("../planAssignmentScopeService");
const { getNextSiblingOrder } = require("../../utils/planNodeOrderUtils");
const {
  isFinalizedExecutionPeriod,
  normalizeTargetValue,
} = require("../../utils/planTargetReallocationValidationUtils");
const { normalizeTargetAllocationMode } = require("../../utils/planTargetAllocationUtils");
const { normalizeAchievementMode } = require("../../utils/planAchievementModeUtils");
const { AMENDMENT_TYPE } = require("../../utils/planAmendmentTypes");
const {
  mergeAmendmentPolicy,
  DEFAULT_AMENDMENT_POLICY,
} = require("../../utils/planAmendmentActionUtils");

const KPI_ADDITION_MESSAGES = Object.freeze({
  PARENT_REQUIRED: "Parent goal or KPI is required.",
  PARENT_NOT_FOUND: "Parent node was not found.",
  INVALID_PARENT: "Parent must be a live master plan node.",
  ANNUAL_VERSION_REQUIRED: "Annual plan version is required.",
  ANNUAL_VERSION_NOT_FOUND: "Annual plan version was not found.",
  ANNUAL_NOT_UNDER_MASTER: "Annual version must belong to the selected master plan.",
  PROCESS_NOT_STARTED: "KPI addition is only available after execution has started.",
  TITLE_REQUIRED: "KPI title is required.",
  DUPLICATE_TITLE: "A KPI with this title already exists under the same parent.",
  ANNUAL_TARGET_REQUIRED: "Annual target is required.",
  ANNUAL_TARGET_NEGATIVE: "Annual target cannot be negative.",
  ZERO_NOT_ALLOWED: "Zero annual target is not allowed by plan amendment policy.",
  OWNER_REQUIRED: "KPI owner is required.",
  OWNER_NOT_FOUND: "Owner user was not found.",
  GOVERNMENT_STRUCTURE_REQUIRED: "Department / sector is required.",
  GOVERNMENT_STRUCTURE_NOT_FOUND: "Government structure was not found.",
  INTERNAL_STRUCTURE_NOT_FOUND: "Internal structure was not found.",
  REASON_REQUIRED: "Reason is required.",
  START_PERIOD_REQUIRED: "Start period is required.",
  START_PERIOD_NOT_FOUND: "Start period was not found for this annual year.",
  START_PERIOD_FINALIZED: "Start period cannot be a completed execution period.",
  END_PERIOD_NOT_FOUND: "End period was not found for this annual year.",
  INVALID_PERIOD_RANGE: "End period must be the same as or after the start period.",
  EFFECTIVE_DATE_BEFORE_START:
    "Effective date cannot be before execution was started.",
  EFFECTIVE_DATE_INVALID: "Effective date is invalid.",
  FINALIZED_PERIOD_TARGET:
    "Completed execution periods cannot receive non-zero targets.",
  PERIOD_ALLOCATION_REQUIRED:
    "Period target is required for each open period from start to end.",
  PERIOD_ALLOCATION_NEGATIVE: "Period targets cannot be negative.",
  PERIOD_SUM_MISMATCH:
    "Remaining open period targets must sum exactly to the annual target.",
  WEIGHT_MODE_INVALID: "Weight redistribution mode must be manual, proportional, or equal.",
  MANUAL_WEIGHTS_REQUIRED:
    "Manual weight redistribution requires an adjustment for every sibling KPI.",
  MANUAL_WEIGHT_UNKNOWN:
    "Manual weight adjustments include unknown sibling KPI ids.",
  WEIGHT_EXCEEDS_PARENT:
    "Combined sibling weights plus the new KPI exceed the parent weight limit.",
  RULE_VIOLATION: "New KPI violates plan structure rules.",
});

const WEIGHT_MODE = Object.freeze({
  MANUAL: "manual",
  PROPORTIONAL: "proportional",
  EQUAL: "equal",
});

function normalizeWeightMode(mode, policyFallback = WEIGHT_MODE.MANUAL) {
  const raw =
    mode != null && String(mode).trim() ? String(mode).trim() : policyFallback;
  const lower = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (lower === WEIGHT_MODE.MANUAL || lower === "manual") {
    return WEIGHT_MODE.MANUAL;
  }
  if (
    lower === WEIGHT_MODE.PROPORTIONAL ||
    lower === "auto_proportional" ||
    lower === "automatic_proportional"
  ) {
    return WEIGHT_MODE.PROPORTIONAL;
  }
  if (
    lower === WEIGHT_MODE.EQUAL ||
    lower === "auto_equal" ||
    lower === "automatic_equal"
  ) {
    return WEIGHT_MODE.EQUAL;
  }
  return null;
}

function normalizeKpiAdditionMetadata(metadata = {}) {
  const source = metadata && typeof metadata === "object" ? metadata : {};

  const periodAllocationsRaw =
    source.periodAllocations ?? source.period_allocations ?? [];

  const periodAllocations = Array.isArray(periodAllocationsRaw)
    ? periodAllocationsRaw.map((row) => ({
        periodId: row.periodId ?? row.period_id ?? row.livePeriodId ?? null,
        target:
          row.target ??
          row.periodTarget ??
          row.period_target ??
          row.amount ??
          null,
      }))
    : [];

  const siblingAdjustmentsRaw =
    source.siblingWeightAdjustments ??
    source.sibling_weight_adjustments ??
    [];

  const siblingWeightAdjustments = Array.isArray(siblingAdjustmentsRaw)
    ? siblingAdjustmentsRaw.map((row) => ({
        kpiId: row.kpiId ?? row.kpi_id ?? null,
        weight: row.weight ?? null,
        contributionWeight:
          row.contributionWeight ??
          row.contribution_weight ??
          null,
      }))
    : [];

  return {
    parentId: source.parentId ?? source.parent_id ?? null,
    annualVersionId:
      source.annualVersionId ?? source.annual_version_id ?? null,
    title:
      source.title != null && String(source.title).trim()
        ? String(source.title).trim()
        : "",
    description:
      source.description != null && String(source.description).trim()
        ? String(source.description).trim()
        : null,
    weight: source.weight ?? null,
    contributionWeight:
      source.contributionWeight ?? source.contribution_weight ?? null,
    targetUnit: source.targetUnit ?? source.target_unit ?? null,
    targetAllocationMode:
      source.targetAllocationMode ?? source.target_allocation_mode ?? null,
    achievementMode: source.achievementMode ?? source.achievement_mode ?? null,
    annualTarget: source.annualTarget ?? source.annual_target ?? null,
    periodAllocations,
    startPeriodId: source.startPeriodId ?? source.start_period_id ?? null,
    endPeriodId: source.endPeriodId ?? source.end_period_id ?? null,
    weightRedistributionMode:
      source.weightRedistributionMode ??
      source.weight_redistribution_mode ??
      source.redistributionMode ??
      source.redistribution_mode ??
      null,
    siblingWeightAdjustments,
    ownerUserId: source.ownerUserId ?? source.owner_user_id ?? null,
    governmentStructureId:
      source.governmentStructureId ?? source.government_structure_id ?? null,
    internalStructureId:
      source.internalStructureId ?? source.internal_structure_id ?? null,
    reason:
      source.reason != null && String(source.reason).trim()
        ? String(source.reason).trim()
        : "",
    reasonCode: source.reasonCode ?? source.reason_code ?? null,
    effectiveDate: source.effectiveDate ?? source.effective_date ?? null,
  };
}

function roundTarget(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function roundWeight(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function nearlyEqual(a, b, epsilon = 0.001) {
  return Math.abs(Number(a) - Number(b)) <= epsilon;
}

function parseEffectiveDate(raw) {
  if (raw == null || raw === "") return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isLiveMasterVersion(version) {
  return (
    version &&
    version.version_kind === "master" &&
    !version.execution_snapshot_of_version_id
  );
}

async function findSnapshotNodeBySource(snapshotVersionId, sourcePlanNodeId, transaction) {
  if (!snapshotVersionId || !sourcePlanNodeId) return null;
  return PlanNode.findOne({
    where: {
      plan_version_id: snapshotVersionId,
      source_plan_node_id: sourcePlanNodeId,
      is_active: true,
    },
    transaction,
  });
}

/**
 * Resolve live parent, annual year, execution periods, siblings, and snapshot anchors.
 */
async function resolveKpiAdditionContext(metadata, transaction = null) {
  if (!metadata.parentId) {
    return { success: false, message: KPI_ADDITION_MESSAGES.PARENT_REQUIRED };
  }

  const liveParent = await PlanNode.findByPk(metadata.parentId, {
    include: [{ association: "planVersion" }],
    transaction,
  });
  if (!liveParent) {
    return { success: false, message: KPI_ADDITION_MESSAGES.PARENT_NOT_FOUND };
  }
  if (!isLiveMasterVersion(liveParent.planVersion)) {
    return { success: false, message: KPI_ADDITION_MESSAGES.INVALID_PARENT };
  }

  const liveMasterVersionId = liveParent.plan_version_id;
  const liveMaster = await PlanVersion.findByPk(liveMasterVersionId, { transaction });
  if (!liveMaster?.process_started_at || !liveMaster.active_execution_snapshot_id) {
    return { success: false, message: KPI_ADDITION_MESSAGES.PROCESS_NOT_STARTED };
  }

  if (!metadata.annualVersionId) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_VERSION_REQUIRED };
  }

  const liveAnnualVersion = await PlanVersion.findByPk(metadata.annualVersionId, {
    transaction,
  });
  if (!liveAnnualVersion) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_VERSION_NOT_FOUND };
  }
  if (
    liveAnnualVersion.version_kind !== "annual" ||
    liveAnnualVersion.parent_plan_version_id !== liveMasterVersionId ||
    liveAnnualVersion.execution_snapshot_of_version_id
  ) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_NOT_UNDER_MASTER };
  }

  const snapshotRootId = liveMaster.active_execution_snapshot_id;
  const versionMap = await buildLiveToSnapshotVersionMap(snapshotRootId, transaction);
  const snapshotAnnualVersion = versionMap.get(liveAnnualVersion.plan_version_id);
  if (!snapshotAnnualVersion) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_VERSION_NOT_FOUND };
  }

  const snapshotParent = await findSnapshotNodeBySource(
    snapshotRootId,
    liveParent.plan_node_id,
    transaction
  );
  if (!snapshotParent) {
    return { success: false, message: KPI_ADDITION_MESSAGES.PARENT_NOT_FOUND };
  }

  const livePeriodVersions = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: liveAnnualVersion.plan_version_id,
      version_kind: "execution_period",
      execution_snapshot_of_version_id: { [Op.is]: null },
    },
    order: [
      ["sequence_index", "ASC"],
      ["period_label", "ASC"],
    ],
    transaction,
  });

  const periods = [];
  for (const livePeriod of livePeriodVersions) {
    const snapshotPeriodVersion = versionMap.get(livePeriod.plan_version_id);
    const access = snapshotPeriodVersion
      ? await resolveVersionExecutionAccess(
          snapshotPeriodVersion.plan_version_id,
          transaction
        )
      : { access: { execution_status: null } };
    const executionStatus = access.access?.execution_status ?? null;
    const finalized = isFinalizedExecutionPeriod(executionStatus);

    periods.push({
      livePeriodId: livePeriod.plan_version_id,
      snapshotPeriodId: snapshotPeriodVersion?.plan_version_id ?? null,
      periodLabel: livePeriod.period_label || snapshotPeriodVersion?.period_label || null,
      sequenceIndex: livePeriod.sequence_index ?? 0,
      executionStatus,
      finalized,
    });
  }

  periods.sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));

  const siblingNodes = await PlanNode.findAll({
    where: {
      plan_version_id: liveMasterVersionId,
      parent_id: liveParent.plan_node_id,
      type: "kpi",
      is_active: true,
    },
    order: [
      ["order", "ASC"],
      ["created_at", "ASC"],
    ],
    transaction,
  });

  const siblings = siblingNodes.map((node) => ({
    kpiId: node.plan_node_id,
    title: node.title,
    weight: normalizeTargetValue(node.weight),
    contributionWeight: normalizeTargetValue(node.contribution_weight),
    node,
  }));

  const snapshotSiblings = [];
  for (const sibling of siblings) {
    const snapshotNode = await findSnapshotNodeBySource(
      snapshotRootId,
      sibling.kpiId,
      transaction
    );
    if (snapshotNode) {
      snapshotSiblings.push({
        liveKpiId: sibling.kpiId,
        snapshotNode,
        weight: normalizeTargetValue(snapshotNode.weight),
        contributionWeight: normalizeTargetValue(snapshotNode.contribution_weight),
      });
    }
  }

  return {
    success: true,
    data: {
      liveMaster,
      liveMasterVersionId,
      liveParent,
      liveAnnualVersion,
      snapshotRootId,
      snapshotAnnualVersionId: snapshotAnnualVersion.plan_version_id,
      snapshotParent,
      versionMap,
      periods,
      siblings,
      snapshotSiblings,
    },
  };
}

function resolvePeriodWindow(periods, startPeriodId, endPeriodId) {
  const startIndex = periods.findIndex(
    (period) => String(period.livePeriodId) === String(startPeriodId)
  );
  if (startIndex < 0) {
    return { valid: false, message: KPI_ADDITION_MESSAGES.START_PERIOD_NOT_FOUND };
  }

  let endIndex = periods.length - 1;
  if (endPeriodId) {
    endIndex = periods.findIndex(
      (period) => String(period.livePeriodId) === String(endPeriodId)
    );
    if (endIndex < 0) {
      return { valid: false, message: KPI_ADDITION_MESSAGES.END_PERIOD_NOT_FOUND };
    }
    if (endIndex < startIndex) {
      return { valid: false, message: KPI_ADDITION_MESSAGES.INVALID_PERIOD_RANGE };
    }
  }

  return { valid: true, startIndex, endIndex };
}

/**
 * Build period target plan from start/end window and metadata allocations.
 */
function buildPeriodAllocations(metadata, periods, annualTarget) {
  if (!metadata.startPeriodId) {
    return { valid: false, message: KPI_ADDITION_MESSAGES.START_PERIOD_REQUIRED };
  }

  const window = resolvePeriodWindow(
    periods,
    metadata.startPeriodId,
    metadata.endPeriodId
  );
  if (!window.valid) {
    return window;
  }

  const startPeriod = periods[window.startIndex];
  if (startPeriod.finalized) {
    return { valid: false, message: KPI_ADDITION_MESSAGES.START_PERIOD_FINALIZED };
  }

  const allocationByPeriod = new Map(
    (metadata.periodAllocations || [])
      .filter((row) => row.periodId)
      .map((row) => [String(row.periodId), row.target])
  );

  const openInWindow = [];
  const rows = [];

  for (let index = 0; index < periods.length; index += 1) {
    const period = periods[index];
    const inWindow = index >= window.startIndex && index <= window.endIndex;
    const beforeStart = index < window.startIndex;

    let target = 0;
    if (beforeStart || !inWindow) {
      target = 0;
    } else if (period.finalized) {
      const provided = allocationByPeriod.get(String(period.livePeriodId));
      const numeric =
        provided == null || provided === "" ? 0 : Number(provided);
      if (!Number.isFinite(numeric)) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.PERIOD_ALLOCATION_REQUIRED,
        };
      }
      if (numeric < 0) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.PERIOD_ALLOCATION_NEGATIVE,
        };
      }
      if (numeric > 0.001) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.FINALIZED_PERIOD_TARGET,
        };
      }
      target = 0;
    } else {
      if (!allocationByPeriod.has(String(period.livePeriodId))) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.PERIOD_ALLOCATION_REQUIRED,
        };
      }
      const raw = allocationByPeriod.get(String(period.livePeriodId));
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.PERIOD_ALLOCATION_REQUIRED,
        };
      }
      if (numeric < 0) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.PERIOD_ALLOCATION_NEGATIVE,
        };
      }
      target = roundTarget(numeric);
      openInWindow.push({ period, target });
    }

    rows.push({
      livePeriodId: period.livePeriodId,
      snapshotPeriodId: period.snapshotPeriodId,
      periodLabel: period.periodLabel,
      sequenceIndex: period.sequenceIndex,
      finalized: period.finalized,
      inWindow,
      beforeStart,
      target,
    });
  }

  const openSum = openInWindow.reduce((sum, row) => sum + row.target, 0);
  if (!nearlyEqual(openSum, annualTarget)) {
    return { valid: false, message: KPI_ADDITION_MESSAGES.PERIOD_SUM_MISMATCH };
  }

  return {
    valid: true,
    startPeriodId: metadata.startPeriodId,
    endPeriodId:
      metadata.endPeriodId ??
      periods[window.endIndex]?.livePeriodId ??
      null,
    openCount: openInWindow.length,
    openSum: roundTarget(openSum),
    rows,
  };
}

/**
 * Compute sibling weight adjustments when adding a new KPI under a parent.
 */
function buildSiblingWeightPlan({
  siblings,
  newWeight,
  newContributionWeight,
  parentWeight,
  parentContributionTarget = 100,
  mode,
  manualAdjustments = [],
}) {
  const numericNewWeight = roundWeight(newWeight);
  const numericNewContribution = roundWeight(newContributionWeight);

  if (siblings.length === 0) {
    return {
      valid: true,
      mode,
      adjustments: [],
      newWeight: numericNewWeight,
      newContributionWeight: numericNewContribution,
    };
  }

  if (mode === WEIGHT_MODE.MANUAL) {
    const byKpi = new Map(
      manualAdjustments
        .filter((row) => row.kpiId)
        .map((row) => [String(row.kpiId), row])
    );

    for (const sibling of siblings) {
      if (!byKpi.has(String(sibling.kpiId))) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.MANUAL_WEIGHTS_REQUIRED,
        };
      }
    }

    for (const row of manualAdjustments) {
      if (
        row.kpiId &&
        !siblings.some((sibling) => String(sibling.kpiId) === String(row.kpiId))
      ) {
        return {
          valid: false,
          message: KPI_ADDITION_MESSAGES.MANUAL_WEIGHT_UNKNOWN,
        };
      }
    }

    const adjustments = siblings.map((sibling) => {
      const row = byKpi.get(String(sibling.kpiId));
      const nextWeight = roundWeight(row.weight ?? sibling.weight);
      const nextContribution = roundWeight(
        row.contributionWeight ?? sibling.contributionWeight
      );
      return {
        kpiId: sibling.kpiId,
        node: sibling.node,
        oldWeight: sibling.weight,
        newWeight: nextWeight,
        oldContributionWeight: sibling.contributionWeight,
        newContributionWeight: nextContribution,
      };
    });

    const totalWeight = adjustments.reduce((sum, row) => sum + row.newWeight, 0);
    if (parentWeight != null && totalWeight + numericNewWeight > parentWeight + 0.001) {
      return { valid: false, message: KPI_ADDITION_MESSAGES.WEIGHT_EXCEEDS_PARENT };
    }

    const totalContribution = adjustments.reduce(
      (sum, row) => sum + row.newContributionWeight,
      0
    );
    if (totalContribution + numericNewContribution > parentContributionTarget + 0.001) {
      return { valid: false, message: KPI_ADDITION_MESSAGES.WEIGHT_EXCEEDS_PARENT };
    }

    return {
      valid: true,
      mode,
      adjustments,
      newWeight: numericNewWeight,
      newContributionWeight: numericNewContribution,
    };
  }

  const siblingWeightSum = siblings.reduce((sum, row) => sum + row.weight, 0);
  const siblingContributionSum = siblings.reduce(
    (sum, row) => sum + row.contributionWeight,
    0
  );

  let adjustments = siblings.map((sibling) => ({
    kpiId: sibling.kpiId,
    node: sibling.node,
    oldWeight: sibling.weight,
    newWeight: sibling.weight,
    oldContributionWeight: sibling.contributionWeight,
    newContributionWeight: sibling.contributionWeight,
  }));

  const weightOverflow =
    parentWeight != null &&
    siblingWeightSum + numericNewWeight > parentWeight + 0.001;
  const contributionOverflow =
    siblingContributionSum + numericNewContribution >
    parentContributionTarget + 0.001;

  if (weightOverflow) {
    const available = Math.max(0, parentWeight - numericNewWeight);
    if (mode === WEIGHT_MODE.EQUAL) {
      const base = siblings.length ? Math.floor((available / siblings.length) * 1000) / 1000 : 0;
      let assigned = 0;
      adjustments = siblings.map((sibling, index) => {
        const isLast = index === siblings.length - 1;
        const nextWeight = isLast
          ? roundWeight(available - assigned)
          : base;
        if (!isLast) assigned = roundWeight(assigned + base);
        return {
          kpiId: sibling.kpiId,
          node: sibling.node,
          oldWeight: sibling.weight,
          newWeight: nextWeight,
          oldContributionWeight: sibling.contributionWeight,
          newContributionWeight: sibling.contributionWeight,
        };
      });
    } else {
      const scale =
        siblingWeightSum > 0 ? available / siblingWeightSum : 0;
      let assigned = 0;
      adjustments = siblings.map((sibling, index) => {
        const isLast = index === siblings.length - 1;
        const nextWeight = isLast
          ? roundWeight(available - assigned)
          : roundWeight(sibling.weight * scale);
        if (!isLast) assigned = roundWeight(assigned + nextWeight);
        return {
          kpiId: sibling.kpiId,
          node: sibling.node,
          oldWeight: sibling.weight,
          newWeight: nextWeight,
          oldContributionWeight: sibling.contributionWeight,
          newContributionWeight: sibling.contributionWeight,
        };
      });
    }
  }

  if (contributionOverflow) {
    const available = Math.max(0, parentContributionTarget - numericNewContribution);
    if (mode === WEIGHT_MODE.EQUAL) {
      const base = siblings.length ? Math.floor((available / siblings.length) * 1000) / 1000 : 0;
      let assigned = 0;
      adjustments = adjustments.map((row, index) => {
        const isLast = index === siblings.length - 1;
        const nextContribution = isLast
          ? roundWeight(available - assigned)
          : base;
        if (!isLast) assigned = roundWeight(assigned + base);
        return {
          ...row,
          newContributionWeight: nextContribution,
        };
      });
    } else {
      const scale =
        siblingContributionSum > 0 ? available / siblingContributionSum : 0;
      let assigned = 0;
      adjustments = adjustments.map((row, index) => {
        const sibling = siblings[index];
        const isLast = index === siblings.length - 1;
        const nextContribution = isLast
          ? roundWeight(available - assigned)
          : roundWeight(sibling.contributionWeight * scale);
        if (!isLast) assigned = roundWeight(assigned + nextContribution);
        return {
          ...row,
          newContributionWeight: nextContribution,
        };
      });
    }
  }

  return {
    valid: true,
    mode,
    adjustments,
    newWeight: numericNewWeight,
    newContributionWeight: numericNewContribution,
  };
}

async function prepareKpiAdditionChange(rawMetadata, options = {}) {
  const metadata = normalizeKpiAdditionMetadata(rawMetadata);
  const policy = mergeAmendmentPolicy(options.policy || DEFAULT_AMENDMENT_POLICY);
  const transaction = options.transaction ?? null;

  if (!metadata.title) {
    return { success: false, message: KPI_ADDITION_MESSAGES.TITLE_REQUIRED };
  }
  if (!metadata.reason) {
    return { success: false, message: KPI_ADDITION_MESSAGES.REASON_REQUIRED };
  }
  if (!metadata.ownerUserId) {
    return { success: false, message: KPI_ADDITION_MESSAGES.OWNER_REQUIRED };
  }
  if (!metadata.governmentStructureId) {
    return {
      success: false,
      message: KPI_ADDITION_MESSAGES.GOVERNMENT_STRUCTURE_REQUIRED,
    };
  }
  if (!metadata.startPeriodId) {
    return { success: false, message: KPI_ADDITION_MESSAGES.START_PERIOD_REQUIRED };
  }

  const annualTarget = Number(metadata.annualTarget);
  if (!Number.isFinite(annualTarget)) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_TARGET_REQUIRED };
  }
  if (annualTarget < 0) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ANNUAL_TARGET_NEGATIVE };
  }
  if (annualTarget === 0 && !policy.allow_zero_annual_target) {
    return { success: false, message: KPI_ADDITION_MESSAGES.ZERO_NOT_ALLOWED };
  }

  const weightMode = normalizeWeightMode(
    metadata.weightRedistributionMode,
    policy.automatic_redistribution
  );
  if (!weightMode) {
    return { success: false, message: KPI_ADDITION_MESSAGES.WEIGHT_MODE_INVALID };
  }

  const contextResult = await resolveKpiAdditionContext(metadata, transaction);
  if (!contextResult.success) {
    return contextResult;
  }
  const context = contextResult.data;

  if (metadata.effectiveDate) {
    const effective = parseEffectiveDate(metadata.effectiveDate);
    if (!effective) {
      return { success: false, message: KPI_ADDITION_MESSAGES.EFFECTIVE_DATE_INVALID };
    }
    const processStart = new Date(context.liveMaster.process_started_at);
    if (effective < processStart) {
      return {
        success: false,
        message: KPI_ADDITION_MESSAGES.EFFECTIVE_DATE_BEFORE_START,
      };
    }
  }

  const duplicate = await PlanNode.findOne({
    where: {
      plan_version_id: context.liveMasterVersionId,
      parent_id: context.liveParent.plan_node_id,
      is_active: true,
      title: { [Op.iLike]: metadata.title },
    },
    transaction,
  });
  if (duplicate) {
    return { success: false, message: KPI_ADDITION_MESSAGES.DUPLICATE_TITLE };
  }

  const owner = await User.findByPk(metadata.ownerUserId, { transaction });
  if (!owner) {
    return { success: false, message: KPI_ADDITION_MESSAGES.OWNER_NOT_FOUND };
  }

  const governmentStructure = await GovernmentStructure.findByPk(
    metadata.governmentStructureId,
    { transaction }
  );
  if (!governmentStructure) {
    return {
      success: false,
      message: KPI_ADDITION_MESSAGES.GOVERNMENT_STRUCTURE_NOT_FOUND,
    };
  }

  if (metadata.internalStructureId) {
    const internalStructure = await InternalStructure.findByPk(
      metadata.internalStructureId,
      { transaction }
    );
    if (!internalStructure) {
      return {
        success: false,
        message: KPI_ADDITION_MESSAGES.INTERNAL_STRUCTURE_NOT_FOUND,
      };
    }
  }

  const periodPlan = buildPeriodAllocations(
    metadata,
    context.periods,
    roundTarget(annualTarget)
  );
  if (!periodPlan.valid) {
    return { success: false, message: periodPlan.message };
  }

  const newWeight = Number(metadata.weight) || 0;
  const newContributionWeight = Number(metadata.contributionWeight) || 0;
  const parentWeight =
    context.liveParent.weight != null
      ? normalizeTargetValue(context.liveParent.weight)
      : null;

  const weightPlan = buildSiblingWeightPlan({
    siblings: context.siblings,
    newWeight,
    newContributionWeight,
    parentWeight,
    mode: weightMode,
    manualAdjustments: metadata.siblingWeightAdjustments,
  });
  if (!weightPlan.valid) {
    return { success: false, message: weightPlan.message };
  }

  const nodeLevel = (context.liveParent.level ?? 0) + 1;
  const ruleCheck = await validatePlanNodeAgainstRule({
    planVersionId: context.liveMasterVersionId,
    parentId: context.liveParent.plan_node_id,
    type: "kpi",
    weight: weightPlan.newWeight,
    weightMode: context.liveParent.weight_mode || null,
    contributionWeight: weightPlan.newContributionWeight,
    level: nodeLevel,
    transaction,
  });
  if (!ruleCheck.valid) {
    return {
      success: false,
      message: ruleCheck.message || KPI_ADDITION_MESSAGES.RULE_VIOLATION,
    };
  }

  return {
    success: true,
    metadata: {
      ...metadata,
      weightRedistributionMode: weightMode,
      annualTarget: roundTarget(annualTarget),
      targetAllocationMode: normalizeTargetAllocationMode(
        metadata.targetAllocationMode
      ),
      achievementMode: normalizeAchievementMode(metadata.achievementMode),
      weight: weightPlan.newWeight,
      contributionWeight:
        weightPlan.newContributionWeight > 0
          ? weightPlan.newContributionWeight
          : null,
    },
    context,
    policy,
    periodPlan,
    weightPlan,
    ruleCheck,
    nodeLevel,
    owner,
    governmentStructure,
  };
}

function buildKpiAdditionPreviewData(prepared) {
  const { metadata, context, periodPlan, weightPlan, ruleCheck } = prepared;

  return {
    amendment_type: AMENDMENT_TYPE.KPI_ADDITION,
    parent_id: context.liveParent.plan_node_id,
    parent_title: context.liveParent.title,
    annual_version_id: context.liveAnnualVersion.plan_version_id,
    new_kpi: {
      title: metadata.title,
      description: metadata.description,
      weight: metadata.weight,
      contribution_weight: metadata.contributionWeight,
      target_unit: metadata.targetUnit,
      target_allocation_mode: metadata.targetAllocationMode,
      achievement_mode: metadata.achievementMode,
      annual_target: metadata.annualTarget,
      owner_user_id: metadata.ownerUserId,
      government_structure_id: metadata.governmentStructureId,
      internal_structure_id: metadata.internalStructureId,
      node_type: ruleCheck.nodeType || "kpi",
      level: prepared.nodeLevel,
    },
    reason: metadata.reason,
    reason_code: metadata.reasonCode,
    effective_date: metadata.effectiveDate,
    start_period_id: periodPlan.startPeriodId,
    end_period_id: periodPlan.endPeriodId,
    weight_redistribution_mode: metadata.weightRedistributionMode,
    sibling_weight_changes: weightPlan.adjustments.map((row) => ({
      kpi_id: row.kpiId,
      before_weight: row.oldWeight,
      after_weight: row.newWeight,
      before_contribution_weight: row.oldContributionWeight,
      after_contribution_weight: row.newContributionWeight,
    })),
    period_allocations: periodPlan.rows.map((row) => ({
      period_id: row.livePeriodId,
      period_label: row.periodLabel,
      target: row.target,
      finalized: row.finalized,
      in_window: row.inWindow,
    })),
    summary: {
      open_period_count: periodPlan.openCount,
      sibling_adjustments: weightPlan.adjustments.length,
      rollup_note:
        "The new KPI will participate in goal, department, and organization rollups after apply.",
    },
  };
}

function buildKpiAdditionImpactData(prepared) {
  const preview = buildKpiAdditionPreviewData(prepared);
  const { metadata, context, periodPlan, weightPlan } = prepared;

  const changedSiblings = weightPlan.adjustments.filter(
    (row) =>
      !nearlyEqual(row.oldWeight, row.newWeight) ||
      !nearlyEqual(row.oldContributionWeight, row.newContributionWeight)
  );

  return {
    summary: [
      `Add KPI "${metadata.title}" under ${context.liveParent.title}`,
      `Annual target ${metadata.annualTarget} across ${periodPlan.openCount} open period(s)`,
      changedSiblings.length
        ? `${changedSiblings.length} sibling KPI weight(s) adjusted`
        : "No sibling weight changes",
    ],
    kpiIds: context.siblings.map((row) => String(row.kpiId)),
    departmentIds: metadata.governmentStructureId
      ? [String(metadata.governmentStructureId)]
      : [],
    periodIds: periodPlan.rows
      .filter((row) => row.inWindow && !row.finalized)
      .map((row) => String(row.livePeriodId)),
    changes: [
      {
        field: "kpi_create",
        entity_id: null,
        parent_id: context.liveParent.plan_node_id,
        title: metadata.title,
        annual_target: metadata.annualTarget,
      },
      ...weightPlan.adjustments
        .filter(
          (row) =>
            !nearlyEqual(row.oldWeight, row.newWeight) ||
            !nearlyEqual(row.oldContributionWeight, row.newContributionWeight)
        )
        .flatMap((row) => {
          const rows = [];
          if (!nearlyEqual(row.oldWeight, row.newWeight)) {
            rows.push({
              field: "weight",
              entity_id: row.kpiId,
              old: row.oldWeight,
              new: row.newWeight,
            });
          }
          if (!nearlyEqual(row.oldContributionWeight, row.newContributionWeight)) {
            rows.push({
              field: "contribution_weight",
              entity_id: row.kpiId,
              old: row.oldContributionWeight,
              new: row.newContributionWeight,
            });
          }
          return rows;
        }),
      ...periodPlan.rows
        .filter((row) => row.inWindow && !row.finalized && row.target > 0)
        .map((row) => ({
          field: "period_target",
          entity_id: null,
          period_id: row.livePeriodId,
          new: row.target,
        })),
    ],
    affected_parent: context.liveParent.title,
    affected_goal_id: context.liveParent.plan_node_id,
    affected_departments: metadata.governmentStructureId ? 1 : 0,
    affected_rollups: true,
    execution_start_period_id: periodPlan.startPeriodId,
    remaining_target_total: metadata.annualTarget,
    preview,
  };
}

function buildKpiAdditionHistoryRows(prepared, createdIds = {}) {
  const rows = [];

  if (createdIds.snapshotMasterKpiId) {
    rows.push({
      entity_type: "plan_node",
      entity_id: createdIds.snapshotMasterKpiId,
      field_name: "created",
      old_value: null,
      new_value: prepared.metadata.title,
    });
  }

  if (createdIds.snapshotAnnualKpiId) {
    rows.push({
      entity_type: "plan_node",
      entity_id: createdIds.snapshotAnnualKpiId,
      field_name: "annual_target",
      old_value: null,
      new_value: String(prepared.metadata.annualTarget),
    });
  }

  for (const row of prepared.weightPlan.adjustments) {
    if (!nearlyEqual(row.oldWeight, row.newWeight)) {
      rows.push({
        entity_type: "plan_node",
        entity_id:
          createdIds.snapshotSiblingIds?.[row.kpiId] ?? row.kpiId,
        field_name: "weight",
        old_value: String(row.oldWeight),
        new_value: String(row.newWeight),
      });
    }
    if (!nearlyEqual(row.oldContributionWeight, row.newContributionWeight)) {
      rows.push({
        entity_type: "plan_node",
        entity_id:
          createdIds.snapshotSiblingIds?.[row.kpiId] ?? row.kpiId,
        field_name: "contribution_weight",
        old_value: String(row.oldContributionWeight),
        new_value: String(row.newContributionWeight),
      });
    }
  }

  for (const row of prepared.periodPlan.rows) {
    if (!row.inWindow || row.finalized || row.target <= 0) continue;
    const periodNodeId = createdIds.snapshotPeriodNodeIds?.[row.livePeriodId];
    if (!periodNodeId) continue;
    rows.push({
      entity_type: "plan_node",
      entity_id: periodNodeId,
      field_name: "period_target",
      old_value: null,
      new_value: String(row.target),
    });
  }

  return rows;
}

async function applyPreparedKpiAddition(prepared, options = {}) {
  const { user, transaction = null } = options;
  const { metadata, context, periodPlan, weightPlan, ruleCheck, nodeLevel } =
    prepared;

  if (!user?.user_id) {
    return { success: false, message: "Acting user is required to apply KPI addition." };
  }

  const snapshotSiblingIds = {};

  for (const adjustment of weightPlan.adjustments) {
    await adjustment.node.update(
      {
        weight: adjustment.newWeight,
        contribution_weight:
          adjustment.newContributionWeight > 0
            ? adjustment.newContributionWeight
            : null,
      },
      { transaction }
    );
    await syncMasterNodeToDerivedCopies(adjustment.node, transaction);

    const snapshotSibling = await findSnapshotNodeBySource(
      context.snapshotRootId,
      adjustment.kpiId,
      transaction
    );
    if (snapshotSibling) {
      snapshotSiblingIds[adjustment.kpiId] = snapshotSibling.plan_node_id;
      await snapshotSibling.update(
        {
          weight: adjustment.newWeight,
          contribution_weight:
            adjustment.newContributionWeight > 0
              ? adjustment.newContributionWeight
              : null,
        },
        { transaction }
      );
    }
  }

  const nodeOrder = await getNextSiblingOrder(
    context.liveMasterVersionId,
    context.liveParent.plan_node_id,
    transaction
  );

  const liveMasterKpi = await PlanNode.create(
    {
      plan_node_id: uuidv4(),
      plan_version_id: context.liveMasterVersionId,
      parent_id: context.liveParent.plan_node_id,
      type: ruleCheck.nodeType || "kpi",
      title: metadata.title,
      description: metadata.description,
      weight: metadata.weight || 0,
      weight_mode: ruleCheck.weightMode || null,
      contribution_weight:
        metadata.contributionWeight > 0 ? metadata.contributionWeight : null,
      target_unit: metadata.targetUnit || null,
      target_allocation_mode: metadata.targetAllocationMode,
      achievement_mode: metadata.achievementMode,
      level: nodeLevel,
      order: nodeOrder,
      is_active: true,
      assignment_sharing_mode: "exclusive",
      annual_target: null,
      period_target: null,
    },
    { transaction }
  );

  await propagateMasterPlanNodeCreate(liveMasterKpi, transaction);

  const liveAnnualKpi = await PlanNode.findOne({
    where: {
      plan_version_id: context.liveAnnualVersion.plan_version_id,
      source_plan_node_id: liveMasterKpi.plan_node_id,
      type: "kpi",
      is_active: true,
    },
    transaction,
  });
  if (!liveAnnualKpi) {
    return { success: false, message: "Live annual KPI copy was not created." };
  }

  await liveAnnualKpi.update(
    { annual_target: metadata.annualTarget },
    { transaction }
  );

  const livePeriodNodeIds = {};
  for (const row of periodPlan.rows) {
    const livePeriodVersion = await PlanVersion.findByPk(row.livePeriodId, {
      transaction,
    });
    if (!livePeriodVersion) continue;

    const livePeriodKpi = await PlanNode.findOne({
      where: {
        plan_version_id: livePeriodVersion.plan_version_id,
        source_plan_node_id: liveAnnualKpi.plan_node_id,
        type: "kpi",
        is_active: true,
      },
      transaction,
    });
    if (!livePeriodKpi) continue;

    livePeriodNodeIds[row.livePeriodId] = livePeriodKpi.plan_node_id;

    if (!row.finalized) {
      await livePeriodKpi.update(
        { period_target: row.target > 0 ? row.target : null },
        { transaction }
      );
    }
  }

  const externalAssignment = await ExternalAssignment.create(
    {
      external_assignment_id: uuidv4(),
      plan_node_id: liveMasterKpi.plan_node_id,
      government_structure_id: metadata.governmentStructureId,
      is_visible: true,
      requires_report: true,
      is_active: true,
    },
    { transaction }
  );
  await syncPlanNodeAssignmentContext(liveMasterKpi.plan_node_id, transaction);
  await propagateExternalAssignmentCreate(
    liveMasterKpi.plan_node_id,
    externalAssignment,
    transaction
  );

  let internalAssignment = null;
  if (metadata.ownerUserId && metadata.internalStructureId) {
    internalAssignment = await InternalAssignment.create(
      {
        internal_assignment_id: uuidv4(),
        plan_node_id: liveMasterKpi.plan_node_id,
        user_id: metadata.ownerUserId,
        is_active: true,
      },
      { transaction }
    );
    await syncPlanNodeAssignmentContext(liveMasterKpi.plan_node_id, transaction);
    await propagateInternalAssignmentCreate(
      liveMasterKpi.plan_node_id,
      internalAssignment,
      transaction
    );
  }

  const snapshotMasterKpi = await PlanNode.create(
    {
      plan_node_id: uuidv4(),
      plan_version_id: context.snapshotRootId,
      parent_id: context.snapshotParent.plan_node_id,
      source_plan_node_id: liveMasterKpi.plan_node_id,
      ...pickNodeFields(liveMasterKpi),
      annual_target: null,
      period_target: null,
    },
    { transaction }
  );

  const snapshotAnnualParent = await findSnapshotNodeBySource(
    context.snapshotAnnualVersionId,
    context.snapshotParent.plan_node_id,
    transaction
  );
  if (!snapshotAnnualParent) {
    return { success: false, message: "Snapshot annual parent was not found." };
  }

  const snapshotAnnualKpi = await PlanNode.create(
    {
      plan_node_id: uuidv4(),
      plan_version_id: context.snapshotAnnualVersionId,
      parent_id: snapshotAnnualParent.plan_node_id,
      source_plan_node_id: snapshotMasterKpi.plan_node_id,
      ...pickNodeFields(liveMasterKpi),
      annual_target: metadata.annualTarget,
      period_target: null,
    },
    { transaction }
  );

  const snapshotPeriodNodeIds = {};
  for (const row of periodPlan.rows) {
    if (!row.snapshotPeriodId) continue;

    const snapshotPeriodParent = await findSnapshotNodeBySource(
      row.snapshotPeriodId,
      snapshotAnnualKpi.parent_id,
      transaction
    );
    if (!snapshotPeriodParent) continue;

    const snapshotPeriodKpi = await PlanNode.create(
      {
        plan_node_id: uuidv4(),
        plan_version_id: row.snapshotPeriodId,
        parent_id: snapshotPeriodParent.plan_node_id,
        source_plan_node_id: snapshotAnnualKpi.plan_node_id,
        ...pickNodeFields(liveMasterKpi),
        annual_target: null,
        period_target:
          row.inWindow && !row.finalized && row.target > 0 ? row.target : null,
      },
      { transaction }
    );

    snapshotPeriodNodeIds[row.livePeriodId] = snapshotPeriodKpi.plan_node_id;
  }

  await ExternalAssignment.create(
    {
      external_assignment_id: uuidv4(),
      plan_node_id: snapshotMasterKpi.plan_node_id,
      government_structure_id: metadata.governmentStructureId,
      is_visible: externalAssignment.is_visible,
      requires_report: externalAssignment.requires_report,
      is_active: true,
    },
    { transaction }
  );
  await syncPlanNodeAssignmentContext(snapshotMasterKpi.plan_node_id, transaction);

  if (metadata.ownerUserId && metadata.internalStructureId) {
    await InternalAssignment.create(
      {
        internal_assignment_id: uuidv4(),
        plan_node_id: snapshotMasterKpi.plan_node_id,
        user_id: metadata.ownerUserId,
        is_active: true,
      },
      { transaction }
    );
    await syncPlanNodeAssignmentContext(snapshotMasterKpi.plan_node_id, transaction);
  }

  const createdIds = {
    liveMasterKpiId: liveMasterKpi.plan_node_id,
    liveAnnualKpiId: liveAnnualKpi.plan_node_id,
    snapshotMasterKpiId: snapshotMasterKpi.plan_node_id,
    snapshotAnnualKpiId: snapshotAnnualKpi.plan_node_id,
    snapshotSiblingIds,
    snapshotPeriodNodeIds,
    livePeriodNodeIds,
  };

  return {
    success: true,
    history: buildKpiAdditionHistoryRows(prepared, createdIds),
    data: {
      title: metadata.title,
      parent_id: context.liveParent.plan_node_id,
      annual_version_id: context.liveAnnualVersion.plan_version_id,
      live_master_kpi_id: liveMasterKpi.plan_node_id,
      live_annual_kpi_id: liveAnnualKpi.plan_node_id,
      snapshot_master_kpi_id: snapshotMasterKpi.plan_node_id,
      snapshot_annual_kpi_id: snapshotAnnualKpi.plan_node_id,
      annual_target: metadata.annualTarget,
      weight: metadata.weight,
      contribution_weight: metadata.contributionWeight,
      owner_user_id: metadata.ownerUserId,
      government_structure_id: metadata.governmentStructureId,
      start_period_id: periodPlan.startPeriodId,
      end_period_id: periodPlan.endPeriodId,
      effective_date: metadata.effectiveDate,
      weight_redistribution_mode: metadata.weightRedistributionMode,
      sibling_adjustments: weightPlan.adjustments.length,
      period_allocations: periodPlan.rows.filter(
        (row) => row.inWindow && !row.finalized
      ),
      external_assignment_id: externalAssignment.external_assignment_id,
      internal_assignment_id: internalAssignment?.internal_assignment_id ?? null,
      applied_by: user.user_id,
    },
  };
}

module.exports = {
  KPI_ADDITION_MESSAGES,
  WEIGHT_MODE,
  normalizeWeightMode,
  normalizeKpiAdditionMetadata,
  prepareKpiAdditionChange,
  buildKpiAdditionPreviewData,
  buildKpiAdditionImpactData,
  buildKpiAdditionHistoryRows,
  applyPreparedKpiAddition,
  buildSiblingWeightPlan,
  buildPeriodAllocations,
};
