"use strict";

const { PlanAmendmentHandler } = require("./PlanAmendmentHandler");
const {
  normalizeAmendmentType,
  amendmentTypeLabel,
} = require("../../../utils/planAmendmentTypes");

/**
 * Registered but unavailable amendment types.
 * Used for all future types until a real handler replaces them.
 */
class PlaceholderAmendmentHandler extends PlanAmendmentHandler {
  /**
   * @param {string} amendmentType
   */
  constructor(amendmentType) {
    super();
    const normalized = normalizeAmendmentType(amendmentType);
    if (!normalized) {
      throw new Error(`Unknown amendment type for placeholder: ${amendmentType}`);
    }
    this._type = normalized;
  }

  get type() {
    return this._type;
  }

  isAvailable() {
    return false;
  }

  supports(amendmentType) {
    return normalizeAmendmentType(amendmentType) === this._type;
  }

  validate() {
    return {
      valid: false,
      message: `${amendmentTypeLabel(this._type)} is registered but not available yet.`,
    };
  }

  preview() {
    return {
      success: false,
      message: `${amendmentTypeLabel(this._type)} is registered but not available yet.`,
    };
  }

  apply() {
    return {
      success: false,
      message: `${amendmentTypeLabel(this._type)} is registered but not available yet.`,
    };
  }

  impact() {
    return {
      success: false,
      message: `${amendmentTypeLabel(this._type)} is registered but not available yet.`,
    };
  }

  conflictKeys() {
    return { kpiIds: [], periodIds: [], departmentIds: [], entityKeys: [] };
  }

  async rollback() {
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
  PlaceholderAmendmentHandler,
};
