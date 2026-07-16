"use strict";

/**
 * @typedef {object} PlanAmendmentHandlerContext
 * @property {object} amendment - PlanAmendment instance or plain object
 * @property {object} metadata - Opaque amendment metadata (handler-owned shape)
 * @property {object} user - Acting user
 * @property {object|null} [transaction] - Sequelize transaction when applying
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
 * Contract every amendment type handler must satisfy.
 * Handlers own metadata validation and domain mutations.
 *
 * @interface PlanAmendmentHandler
 */
class PlanAmendmentHandler {
  /**
   * @returns {string} Canonical amendment type (e.g. target_reallocation)
   */
  get type() {
    throw new Error("PlanAmendmentHandler.type must be implemented");
  }

  /**
   * Whether this type can be created in the product today.
   * @returns {boolean}
   */
  isAvailable() {
    return false;
  }

  /**
   * @param {string} amendmentType
   * @returns {boolean}
   */
  supports(amendmentType) {
    return String(amendmentType) === this.type;
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
   * Apply domain changes inside the engine transaction.
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<PlanAmendmentApplyResult>|PlanAmendmentApplyResult}
   */
  apply(_ctx) {
    return { success: false, message: "Handler apply() is not implemented" };
  }

  /**
   * Future: reverse an applied amendment.
   * @param {PlanAmendmentHandlerContext} _ctx
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  async rollback(_ctx) {
    return { success: false, message: "Rollback is not implemented yet" };
  }
}

module.exports = {
  PlanAmendmentHandler,
};
