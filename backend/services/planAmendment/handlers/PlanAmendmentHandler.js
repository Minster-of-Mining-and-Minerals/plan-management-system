"use strict";

/**
 * @typedef {object} PlanAmendmentHandlerContext
 * @property {object} amendment - PlanAmendment instance or plain object
 * @property {object|null} [action] - PlanAmendmentAction instance (preferred)
 * @property {object} metadata - Opaque action metadata (handler-owned shape)
 * @property {object} user - Acting user
 * @property {object|null} [transaction] - Sequelize transaction when applying
 * @property {object} [policy] - Resolved amendment policy from Plan Rules
 * @property {object} [effective] - Resolved effective-date context
 * @property {object} [options] - Extra engine options (io, ipAddress, etc.)
 */

/**
 * @typedef {object} PlanAmendmentValidationResult
 * @property {boolean} valid
 * @property {string} [message]
 * @property {object} [details]
 */

/**
 * @typedef {object} PlanAmendmentPreviewResult
 * @property {boolean} success
 * @property {string} [message]
 * @property {object} [data] - Handler-specific preview payload
 */

/**
 * @typedef {object} PlanAmendmentImpactResult
 * @property {boolean} success
 * @property {string} [message]
 * @property {object} [data]
 * @property {string[]} [data.summary]
 * @property {string[]} [data.kpiIds]
 * @property {string[]} [data.departmentIds]
 * @property {string[]} [data.periodIds]
 * @property {object[]} [data.changes]
 */

/**
 * @typedef {object} PlanAmendmentConflictKeys
 * @property {string[]} [kpiIds]
 * @property {string[]} [periodIds]
 * @property {string[]} [departmentIds]
 * @property {string[]} [entityKeys] - Opaque keys e.g. "kpi:<id>", "period:<id>"
 */

/**
 * @typedef {object} PlanAmendmentHistoryRow
 * @property {string} entity_type
 * @property {string} entity_id
 * @property {string} field_name
 * @property {string|null} [old_value]
 * @property {string|null} [new_value]
 */

/**
 * @typedef {object} PlanAmendmentApplyResult
 * @property {boolean} success
 * @property {string} [message]
 * @property {PlanAmendmentHistoryRow[]} [history]
 * @property {object} [data]
 */

/**
 * Contract every amendment **action** handler must satisfy.
 * Handlers own metadata validation and domain mutations.
 * The engine loops actions; one handler per action type.
 *
 * @interface PlanAmendmentHandler
 */
class PlanAmendmentHandler {
  /**
   * @returns {string} Canonical action type (e.g. target_reallocation)
   */
  get type() {
    throw new Error("PlanAmendmentHandler.type must be implemented");
  }

  /**
   * Whether this action type can be created in the product today.
   * @returns {boolean}
   */
  isAvailable() {
    return false;
  }

  /**
   * @param {string} actionType
   * @returns {boolean}
   */
  supports(actionType) {
    return String(actionType) === this.type;
  }

  /**
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<PlanAmendmentValidationResult>|PlanAmendmentValidationResult}
   */
  validate(_ctx) {
    return { valid: false, message: "Handler validate() is not implemented" };
  }

  /**
   * Read-only preview of resulting changes. Must not persist.
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<PlanAmendmentPreviewResult>|PlanAmendmentPreviewResult}
   */
  preview(_ctx) {
    return { success: false, message: "Handler preview() is not implemented" };
  }

  /**
   * Read-only impact contribution for package-level aggregation. Must not persist.
   * @param {PlanAmendmentHandlerContext} ctx
   * @returns {Promise<PlanAmendmentImpactResult>|PlanAmendmentImpactResult}
   */
  async impact(ctx) {
    const preview = await this.preview(ctx);
    if (!preview?.success) {
      return {
        success: false,
        message: preview?.message || "Impact analysis failed",
      };
    }
    return {
      success: true,
      data: {
        summary: [],
        kpiIds: [],
        departmentIds: [],
        periodIds: [],
        changes: [],
        preview: preview.data ?? null,
      },
    };
  }

  /**
   * Keys used by the conflict detector (overlapping pending amendments).
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<PlanAmendmentConflictKeys>|PlanAmendmentConflictKeys}
   */
  conflictKeys(_ctx) {
    return { kpiIds: [], periodIds: [], departmentIds: [], entityKeys: [] };
  }

  /**
   * Apply domain changes inside the engine transaction.
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<PlanAmendmentApplyResult>|PlanAmendmentApplyResult}
   */
  apply(_ctx) {
    return { success: false, message: "Handler apply() is not implemented" };
  }

  /**
   * True rollback is not supported. Framework is forward-only.
   * Handlers may describe a compensating amendment suggestion.
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<{ success: boolean, message?: string, compensation?: object }>}
   */
  async rollback(_ctx) {
    return {
      success: false,
      message:
        "True rollback is not supported. Create a compensating amendment instead.",
      compensation: {
        strategy: "compensating_amendment",
        supported: false,
      },
    };
  }
}

module.exports = {
  PlanAmendmentHandler,
};
