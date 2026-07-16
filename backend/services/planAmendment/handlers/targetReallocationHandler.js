"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const { AMENDMENT_TYPE } = require("../../../utils/planAmendmentTypes");
const {
  normalizeTargetReallocationMetadata,
  prepareTargetReallocationChange,
  buildTargetReallocationPreviewData,
  applyPreparedTargetReallocation,
} = require("../targetReallocationDomain");
const { assertCompletedPeriodsPolicy } = require("../planAmendmentPolicyService");

/**
 * First real amendment action plugin: period target redistribution within a year.
 */
class TargetReallocationHandler extends PlanAmendmentHandler {
  get type() {
    return AMENDMENT_TYPE.TARGET_REALLOCATION;
  }

  isAvailable() {
    return true;
  }

  supports(amendmentType) {
    return String(amendmentType) === this.type || String(amendmentType) === "TARGET_REALLOCATION";
  }

  async validate(ctx = {}) {
    const prepared = await prepareTargetReallocationChange(
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata,
      ctx.transaction ?? null
    );

    if (!prepared.success) {
      return { valid: false, message: prepared.message };
    }

    if (ctx.policy) {
      const fromCompleted =
        String(prepared.context?.fromExecutionStatus || "").toLowerCase() === "completed" ||
        String(prepared.context?.fromExecutionStatus || "").toLowerCase() === "closed";
      const periodPolicy = assertCompletedPeriodsPolicy(ctx.policy, {
        periodIsCompleted: fromCompleted,
      });
      if (!periodPolicy.valid) {
        return { valid: false, message: periodPolicy.message };
      }
    }

    return {
      valid: true,
      details: {
        amount: prepared.validation.amount,
        movable_target: prepared.validation.movableTarget,
        from_result: prepared.fromNewTarget,
        to_result: prepared.toNewTarget,
        annual_target: prepared.annualTarget,
      },
    };
  }

  async preview(ctx = {}) {
    const prepared = await prepareTargetReallocationChange(
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata,
      ctx.transaction ?? null
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    return {
      success: true,
      data: buildTargetReallocationPreviewData(prepared),
    };
  }

  async impact(ctx = {}) {
    const prepared = await prepareTargetReallocationChange(
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata,
      ctx.transaction ?? null
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    const amount = prepared.validation.amount;
    const fromLabel = prepared.context?.fromPeriod?.period_label || "source period";
    const toLabel = prepared.context?.toPeriod?.period_label || "target period";
    const kpiId = prepared.metadata?.kpiId || prepared.context?.liveAnnualKpi?.plan_node_id;

    return {
      success: true,
      data: {
        summary: [
          `Move ${amount} targets ${fromLabel} → ${toLabel}`,
          `Annual target unchanged (${prepared.annualTarget})`,
        ],
        kpiIds: kpiId ? [String(kpiId)] : [],
        departmentIds: [],
        periodIds: [
          prepared.metadata?.fromPeriodId,
          prepared.metadata?.toPeriodId,
        ].filter(Boolean).map(String),
        changes: [
          {
            field: "period_target",
            from_period_id: prepared.metadata?.fromPeriodId,
            to_period_id: prepared.metadata?.toPeriodId,
            amount,
            from_old: prepared.fromOldTarget,
            from_new: prepared.fromNewTarget,
            to_old: prepared.toOldTarget,
            to_new: prepared.toNewTarget,
          },
        ],
        preview: buildTargetReallocationPreviewData(prepared),
      },
    };
  }

  conflictKeys(ctx = {}) {
    const metadata = normalizeTargetReallocationMetadata(
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata
    );
    return {
      kpiIds: metadata.kpiId ? [String(metadata.kpiId)] : [],
      periodIds: [metadata.fromPeriodId, metadata.toPeriodId].filter(Boolean).map(String),
      departmentIds: [],
      entityKeys: [],
    };
  }

  async apply(ctx = {}) {
    const prepared = await prepareTargetReallocationChange(
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata,
      ctx.transaction ?? null
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    if (!ctx.user?.user_id) {
      return { success: false, message: "Acting user is required to apply target reallocation" };
    }

    return applyPreparedTargetReallocation(prepared, {
      user: ctx.user,
      transaction: ctx.transaction ?? null,
    });
  }

  async rollback() {
    return {
      success: false,
      message:
        "True rollback is not supported. Create a compensating amendment with reverse target reallocation.",
      compensation: {
        strategy: "compensating_amendment",
        supported: true,
        suggestedActionType: AMENDMENT_TYPE.TARGET_REALLOCATION,
        hint: "Swap from/to periods and reuse the same amount.",
      },
    };
  }
}

module.exports = {
  TargetReallocationHandler,
  normalizeTargetReallocationMetadata,
};
