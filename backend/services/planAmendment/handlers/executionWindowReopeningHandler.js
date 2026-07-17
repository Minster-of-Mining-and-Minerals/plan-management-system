"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const { AMENDMENT_TYPE } = require("../../../utils/planAmendmentTypes");
const {
  normalizeExecutionWindowReopeningMetadata,
  prepareExecutionWindowReopeningChange,
  buildExecutionWindowReopeningPreviewData,
  buildExecutionWindowReopeningImpactData,
  applyPreparedExecutionWindowReopening,
} = require("../executionWindowReopeningDomain");

/**
 * Execution Window Reopening action plugin.
 * Creates time-bounded overrides for closed execution periods.
 */
class ExecutionWindowReopeningHandler extends PlanAmendmentHandler {
  get type() {
    return AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING;
  }

  isAvailable() {
    return true;
  }

  supports(amendmentType) {
    return (
      String(amendmentType) === this.type ||
      String(amendmentType) === "EXECUTION_WINDOW_REOPENING"
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
    const prepared = await prepareExecutionWindowReopeningChange(
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
        period_count: prepared.periods.length,
        reopen_start: prepared.reopenStart.toISOString(),
        reopen_end: prepared.reopenEnd.toISOString(),
        duration_days: prepared.durationDays,
      },
    };
  }

  async preview(ctx = {}) {
    const prepared = await prepareExecutionWindowReopeningChange(
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
      data: buildExecutionWindowReopeningPreviewData(prepared),
    };
  }

  async impact(ctx = {}) {
    const prepared = await prepareExecutionWindowReopeningChange(
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
      data: buildExecutionWindowReopeningImpactData(prepared),
    };
  }

  conflictKeys(ctx = {}) {
    const metadata = normalizeExecutionWindowReopeningMetadata(
      this._resolveMetadata(ctx)
    );
    const periodIds = (metadata.periodVersionIds || []).filter(Boolean).map(String);

    return {
      kpiIds: [],
      periodIds,
      departmentIds: [],
      entityKeys: periodIds.map((id) => `execution_window:period:${id}`),
    };
  }

  async apply(ctx = {}) {
    const prepared = await prepareExecutionWindowReopeningChange(
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
        message: "Acting user is required to apply execution window reopening",
      };
    }

    return applyPreparedExecutionWindowReopening(prepared, {
      user: ctx.user,
      transaction: ctx.transaction ?? null,
      planAmendmentId: ctx.amendment?.plan_amendment_id ?? ctx.planAmendmentId ?? null,
      planAmendmentActionId:
        ctx.action?.plan_amendment_action_id ?? ctx.planAmendmentActionId ?? null,
    });
  }

  async rollback() {
    return {
      success: false,
      message:
        "True rollback is not supported. Revoke active overrides or wait for expiry.",
      compensation: {
        strategy: "manual_revocation_or_expiry",
        supported: false,
        suggestedActionType: AMENDMENT_TYPE.EXECUTION_WINDOW_REOPENING,
        hint: "Overrides auto-expire at reopen_end; status rows remain for audit.",
      },
    };
  }
}

module.exports = {
  ExecutionWindowReopeningHandler,
};
