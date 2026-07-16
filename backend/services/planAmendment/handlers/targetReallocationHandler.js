"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const { AMENDMENT_TYPE } = require("../../../utils/planAmendmentTypes");
const {
  normalizeTargetReallocationMetadata,
  prepareTargetReallocationChange,
  buildTargetReallocationPreviewData,
  applyPreparedTargetReallocation,
} = require("../targetReallocationDomain");

/**
 * First real amendment plugin: period target redistribution within a year.
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
      ctx.metadata ?? ctx.amendment?.metadata,
      ctx.transaction ?? null
    );

    if (!prepared.success) {
      return { valid: false, message: prepared.message };
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
      ctx.metadata ?? ctx.amendment?.metadata,
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

  async apply(ctx = {}) {
    const prepared = await prepareTargetReallocationChange(
      ctx.metadata ?? ctx.amendment?.metadata,
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
}

module.exports = {
  TargetReallocationHandler,
  normalizeTargetReallocationMetadata,
};
