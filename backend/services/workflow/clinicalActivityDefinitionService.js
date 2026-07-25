"use strict";

const db = require("../../models");
const auditService = require("../auditService");

class ClinicalActivityDefinitionService {
  /**
   * Create or register a Clinical Activity Definition.
   */
  async createActivityDefinition(data, actorUserId = null) {
    const [activity] = await db.ClinicalActivityDefinition.findOrCreate({
      where: { code: data.code },
      defaults: data,
    });

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: "workflow:activity_create",
        resourceType: "CLINICAL_ACTIVITY",
        resourceId: activity.activity_id,
        details: { code: activity.code, name: activity.name, order_type: activity.order_type },
      });
    }

    return activity;
  }

  /**
   * Get activity definitions with optional filters.
   */
  async getActivityDefinitions(filters = {}) {
    const where = { status: "ACTIVE" };
    if (filters.category) where.category = filters.category;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.order_type) where.order_type = filters.order_type;

    const defaultActivities = [
      {
        activity_id: "act-cbc-01",
        name: "Complete Blood Count (CBC)",
        code: "CBC_TEST",
        category: "DIAGNOSTIC",
        department_id: "LABORATORY",
        creates_clinical_order: true,
        order_type: "LABORATORY",
        default_priority: "ROUTINE",
        sla_configuration: { target_minutes: 60, warning_threshold_minutes: 45 },
        billing_configuration: { is_billable: true, default_fee: 45.0 },
      },
      {
        activity_id: "act-ct-02",
        name: "Chest CT Scan",
        code: "CHEST_CT",
        category: "DIAGNOSTIC",
        department_id: "RADIOLOGY",
        creates_clinical_order: true,
        order_type: "RADIOLOGY",
        default_priority: "ROUTINE",
        sla_configuration: { target_minutes: 90, warning_threshold_minutes: 75 },
        billing_configuration: { is_billable: true, default_fee: 250.0 },
      },
      {
        activity_id: "act-rx-03",
        name: "Medication Prescription",
        code: "MEDICATION_RX",
        category: "PRESCRIPTION",
        department_id: "PHARMACY",
        creates_clinical_order: true,
        order_type: "PHARMACY",
        default_priority: "ROUTINE",
        sla_configuration: { target_minutes: 30, warning_threshold_minutes: 20 },
        billing_configuration: { is_billable: true, default_fee: 15.0 },
      },
      {
        activity_id: "act-physio-04",
        name: "Physiotherapy Range of Motion Assessment",
        code: "PHYSIO_ASSESSMENT",
        category: "THERAPEUTIC",
        department_id: "PHYSIOTHERAPY",
        creates_clinical_order: true,
        order_type: "PHYSIOTHERAPY",
        default_priority: "ROUTINE",
        sla_configuration: { target_minutes: 120, warning_threshold_minutes: 90 },
        billing_configuration: { is_billable: true, default_fee: 80.0 },
      },
    ];

    if (db.ClinicalActivityDefinition) {
      try {
        const dbActivities = await db.ClinicalActivityDefinition.findAll({ where });
        const dbList = dbActivities.map((a) => a.get({ plain: true }));
        const existingCodes = new Set(dbList.map((a) => a.code));
        const missingDefaults = defaultActivities.filter((a) => !existingCodes.has(a.code));
        return [...dbList, ...missingDefaults];
      } catch (e) {
        // Fallback to default activity list
      }
    }

    return defaultActivities;
  }

  /**
   * Find activity definition by code or ID.
   */
  async findByCodeOrId(identifier) {
    const list = await this.getActivityDefinitions();
    return list.find((a) => a.code === identifier || a.activity_id === identifier || a.id === identifier) || list[0];
  }
}

module.exports = new ClinicalActivityDefinitionService();
