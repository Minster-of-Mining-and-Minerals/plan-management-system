"use strict";

const db = require("../../models");

class OrderDefinitionDesignerService {
  /**
   * Get available configuration choices for Clinical Order Designer.
   */
  async getDesignerConfigOptions() {
    const availableCategories = ["DIAGNOSTIC", "THERAPEUTIC", "CONSULTATION", "PRESCRIPTION", "SURGICAL", "HOME_CARE"];
    const availableDepartments = ["LABORATORY", "RADIOLOGY", "PHARMACY", "PHYSIOTHERAPY", "DIALYSIS", "ONCOLOGY", "DENTAL", "NUTRITION", "NEPHROLOGY"];

    return {
      available_categories: availableCategories,
      available_departments: availableDepartments,
      default_sla_presets: [
        { name: "STAT", target_minutes: 30, warning_threshold_minutes: 20 },
        { name: "Urgent", target_minutes: 120, warning_threshold_minutes: 90 },
        { name: "Routine", target_minutes: 1440, warning_threshold_minutes: 1080 },
      ],
      default_billing_presets: [
        { service_code: "LAB001", default_fee: 50.0 },
        { service_code: "RAD001", default_fee: 300.0 },
        { service_code: "THERAPY001", default_fee: 100.0 },
      ],
    };
  }
}

module.exports = new OrderDefinitionDesignerService();
