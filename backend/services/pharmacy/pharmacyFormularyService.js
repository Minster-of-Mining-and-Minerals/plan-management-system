"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");

class PharmacyFormularyService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "MedicationFormularyRule",
        resourceId,
        details,
      });
    }
  }

  /**
   * Set or update formulary rule for a medication.
   */
  async setFormularyRule({ medication_catalog_id, department_restriction, requires_approval, doctor_authorization_level, preferred_alternative_id, notes }, staffId) {
    if (!medication_catalog_id) {
      const err = new Error("medication_catalog_id is required");
      err.status = 400;
      throw err;
    }

    const [rule, created] = await db.MedicationFormularyRule.findOrCreate({
      where: { medication_catalog_id },
      defaults: {
        id: uuidv4(),
        medication_catalog_id,
        department_restriction: department_restriction || null,
        requires_approval: !!requires_approval,
        doctor_authorization_level: doctor_authorization_level || null,
        preferred_alternative_id: preferred_alternative_id || null,
        notes: notes || null,
      },
    });

    if (!created) {
      await rule.update({
        department_restriction: department_restriction ?? rule.department_restriction,
        requires_approval: requires_approval ?? rule.requires_approval,
        doctor_authorization_level: doctor_authorization_level ?? rule.doctor_authorization_level,
        preferred_alternative_id: preferred_alternative_id ?? rule.preferred_alternative_id,
        notes: notes ?? rule.notes,
      });
    }

    await this.logAudit("FORMULARY_RULE_UPDATED", rule.id, staffId, { medication_catalog_id });
    return rule.get({ plain: true });
  }

  /**
   * Validate if a medication can be prescribed in a specific department.
   */
  async validateFormularyAccess(medicationCatalogId, departmentName) {
    const rule = await db.MedicationFormularyRule.findOne({
      where: { medication_catalog_id: medicationCatalogId },
      include: [{ model: db.MedicationCatalog, as: "preferredAlternative" }],
    });

    if (!rule) {
      return { is_allowed: true, requires_approval: false };
    }

    if (rule.department_restriction && departmentName) {
      const allowedDepts = rule.department_restriction.toLowerCase().split(",").map((d) => d.trim());
      const currentDept = departmentName.toLowerCase().trim();

      if (!allowedDepts.includes(currentDept)) {
        return {
          is_allowed: false,
          reason: `Medication is restricted to '${rule.department_restriction}'. Current department: '${departmentName}'`,
          preferred_alternative: rule.preferredAlternative?.generic_name || null,
        };
      }
    }

    return {
      is_allowed: true,
      requires_approval: rule.requires_approval,
      doctor_authorization_level: rule.doctor_authorization_level,
      preferred_alternative: rule.preferredAlternative?.generic_name || null,
    };
  }

  /**
   * List all hospital formulary rules.
   */
  async listFormularyRules() {
    const rules = await db.MedicationFormularyRule.findAll({
      include: [
        { model: db.MedicationCatalog, as: "medicationCatalog" },
        { model: db.MedicationCatalog, as: "preferredAlternative" },
      ],
    });

    return rules.map((r) => r.get({ plain: true }));
  }
}

module.exports = new PharmacyFormularyService();
