"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const { AMENDMENT_TYPE } = require("../../../utils/planAmendmentTypes");
const {
  normalizeKpiAdditionMetadata,
  prepareKpiAdditionChange,
  buildKpiAdditionPreviewData,
  buildKpiAdditionImpactData,
  applyPreparedKpiAddition,
} = require("../kpiAdditionDomain");

/**
 * KPI Addition action plugin.
 * Adds a new KPI to live + execution snapshot after process start.
 */
class KpiAdditionHandler extends PlanAmendmentHandler {
  get type() {
    return AMENDMENT_TYPE.KPI_ADDITION;
  }

  isAvailable() {
    return true;
  }

  supports(amendmentType) {
    return (
      String(amendmentType) === this.type ||
      String(amendmentType) === "KPI_ADDITION"
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
    const prepared = await prepareKpiAdditionChange(this._resolveMetadata(ctx), {
      transaction: ctx.transaction ?? null,
      policy: ctx.policy ?? null,
    });

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
        title: prepared.metadata.title,
        parent_id: prepared.metadata.parentId,
        annual_target: prepared.metadata.annualTarget,
        weight: prepared.metadata.weight,
        open_periods: prepared.periodPlan.allocations.filter((r) => r.inWindow)
          .length,
        sibling_weight_changes: prepared.weightPlan.adjustments.length,
      },
    };
  }

  async preview(ctx = {}) {
    const prepared = await prepareKpiAdditionChange(this._resolveMetadata(ctx), {
      transaction: ctx.transaction ?? null,
      policy: ctx.policy ?? null,
    });

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    return {
      success: true,
      data: buildKpiAdditionPreviewData(prepared),
    };
  }

  async impact(ctx = {}) {
    const prepared = await prepareKpiAdditionChange(this._resolveMetadata(ctx), {
      transaction: ctx.transaction ?? null,
      policy: ctx.policy ?? null,
    });

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    return {
      success: true,
      data: buildKpiAdditionImpactData(prepared),
    };
  }

  conflictKeys(ctx = {}) {
    const metadata = normalizeKpiAdditionMetadata(this._resolveMetadata(ctx));
    const parentId = metadata.parentId ? String(metadata.parentId) : null;
    const titleKey = metadata.title
      ? String(metadata.title).trim().toLowerCase().replace(/\s+/g, " ")
      : null;

    const entityKeys = [];
    if (parentId) {
      entityKeys.push(`structural:parent:${parentId}`);
      entityKeys.push(`kpi_addition:parent:${parentId}`);
    }
    if (parentId && titleKey) {
      entityKeys.push(`kpi_name:${parentId}:${titleKey}`);
    }

    return {
      kpiIds: [],
      periodIds: (metadata.periodAllocations || [])
        .map((row) => row.periodId)
        .filter(Boolean)
        .map(String),
      departmentIds: metadata.governmentStructureId
        ? [String(metadata.governmentStructureId)]
        : [],
      entityKeys,
    };
  }

  async apply(ctx = {}) {
    const prepared = await prepareKpiAdditionChange(this._resolveMetadata(ctx), {
      transaction: ctx.transaction ?? null,
      policy: ctx.policy ?? null,
    });

    if (!prepared.success) {
      return { success: false, message: prepared.message };
    }

    if (!ctx.user?.user_id) {
      return {
        success: false,
        message: "Acting user is required to apply KPI addition",
      };
    }

    return applyPreparedKpiAddition(prepared, {
      user: ctx.user,
      transaction: ctx.transaction ?? null,
    });
  }

  async rollback() {
    return {
      success: false,
      message:
        "True rollback is not supported. Create a compensating KPI removal or deactivation amendment.",
      compensation: {
        strategy: "compensating_amendment",
        supported: false,
        suggestedActionType: AMENDMENT_TYPE.KPI_REMOVAL,
        hint: "Deactivate or remove the added KPI via a future KPI Removal amendment.",
      },
    };
  }
}

module.exports = {
  KpiAdditionHandler,
};
