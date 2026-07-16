"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const { AMENDMENT_TYPE } = require("../../../utils/planAmendmentTypes");
const {
  normalizeAnnualTargetRevisionMetadata,
  prepareAnnualTargetRevisionChange,
  buildAnnualTargetRevisionPreviewData,
  buildAnnualTargetRevisionImpactData,
  applyPreparedAnnualTargetRevision,
} = require("../annualTargetRevisionDomain");

/**
 * Annual Target Revision action plugin.
 * Revises snapshot annual_target and redistributes open period targets.
 */
class AnnualTargetRevisionHandler extends PlanAmendmentHandler {
  get type() {
    return AMENDMENT_TYPE.ANNUAL_TARGET_REVISION;
  }

  isAvailable() {
    return true;
  }

  supports(amendmentType) {
    return (
      String(amendmentType) === this.type ||
      String(amendmentType) === "ANNUAL_TARGET_REVISION"
    );
  }

  _resolveMetadata(ctx = {}) {
    const raw =
      ctx.metadata ?? ctx.action?.metadata ?? ctx.amendment?.metadata ?? {};
    const reasonFromAmendment =
      ctx.amendment?.reason || ctx.amendment?.description || null;
    if (raw?.reason || !reasonFromAmendment) {
      return raw;
    }
    return { ...raw, reason: reasonFromAmendment };
  }

  async validate(ctx = {}) {
    const prepared = await prepareAnnualTargetRevisionChange(
      this._resolveMetadata(ctx),
      {
        transaction: ctx.transaction ?? null,
        policy: ctx.policy ?? null,
      }
    );

    if (!prepared.success) {
      return {
        valid: false,
        message: prepared.message,
        details: prepared.details,
      };
    }

    return {
      valid: true,
      details: {
        original_annual_target: prepared.originalAnnualTarget,
        current_annual_target: prepared.currentAnnualTarget,
        revised_annual_target: prepared.revisedAnnualTarget,
        difference: prepared.delta,
        redistribution_mode: prepared.metadata.redistributionMode,
        remaining_target: prepared.redistribution.remainingBudget,
        open_periods: prepared.redistribution.allocations.length,
        completed_periods: prepared.redistribution.completed.length,
      },
    };
  }

  async preview(ctx = {}) {
    const prepared = await prepareAnnualTargetRevisionChange(
      this._resolveMetadata(ctx),
      {
        transaction: ctx.transaction ?? null,
        policy: ctx.policy ?? null,
      }
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    return {
      success: true,
      data: buildAnnualTargetRevisionPreviewData(prepared),
    };
  }

  async impact(ctx = {}) {
    const prepared = await prepareAnnualTargetRevisionChange(
      this._resolveMetadata(ctx),
      {
        transaction: ctx.transaction ?? null,
        policy: ctx.policy ?? null,
      }
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    return {
      success: true,
      data: buildAnnualTargetRevisionImpactData(prepared),
    };
  }

  conflictKeys(ctx = {}) {
    const metadata = normalizeAnnualTargetRevisionMetadata(
      this._resolveMetadata(ctx)
    );
    const kpiId = metadata.kpiId ? String(metadata.kpiId) : null;
    const periodIds = (metadata.periodAllocations || [])
      .map((row) => row.periodId)
      .filter(Boolean)
      .map(String);

    return {
      kpiIds: kpiId ? [kpiId] : [],
      periodIds,
      departmentIds: [],
      entityKeys: kpiId
        ? [`kpi:${kpiId}`, `annual_target:${kpiId}`, `structural:kpi:${kpiId}`]
        : [],
    };
  }

  async apply(ctx = {}) {
    const prepared = await prepareAnnualTargetRevisionChange(
      this._resolveMetadata(ctx),
      {
        transaction: ctx.transaction ?? null,
        policy: ctx.policy ?? null,
      }
    );

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    if (!ctx.user?.user_id) {
      return {
        success: false,
        message: "Acting user is required to apply annual target revision",
      };
    }

    return applyPreparedAnnualTargetRevision(prepared, {
      user: ctx.user,
      transaction: ctx.transaction ?? null,
    });
  }

  async rollback() {
    return {
      success: false,
      message:
        "True rollback is not supported. Create a compensating amendment with a reverse annual target revision.",
      compensation: {
        strategy: "compensating_amendment",
        supported: true,
        suggestedActionType: AMENDMENT_TYPE.ANNUAL_TARGET_REVISION,
        hint: "Set revisedAnnualTarget back toward the original baseline and redistribute open periods.",
      },
    };
  }
}

module.exports = {
  AnnualTargetRevisionHandler,
};
