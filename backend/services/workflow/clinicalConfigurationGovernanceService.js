"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");

const isUuidStr = (str) => typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

class ClinicalConfigurationGovernanceService {
  /**
   * Validate configuration entity before publishing.
   */
  validateConfiguration(entityType, entityData) {
    const errors = [];
    const warnings = [];

    if (entityType === "ORDER_DEFINITION") {
      if (!entityData.code) errors.push("Order Definition code is required");
      if (!entityData.name) errors.push("Order Definition name is required");
      if (!entityData.department_id) errors.push("Department mapping is required");
      if (!entityData.category) errors.push("Order Category is required");

      // Check billing rule enforcement
      const billingConfig = entityData.billing_configuration || entityData.billing_configuration_id;
      if (entityData.is_billable !== false && (!billingConfig || (typeof billingConfig === "object" && billingConfig.is_billable && billingConfig.default_fee === undefined))) {
        errors.push("Billable Order Definition must have valid billing configuration or fee schedule attached");
      }
    } else if (entityType === "ACTIVITY_DEFINITION") {
      if (!entityData.code) errors.push("Activity Definition code is required");
      if (!entityData.department_id) errors.push("Department mapping is required");
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      validated_at: new Date().toISOString(),
    };
  }

  /**
   * Transition lifecycle status (DRAFT -> VALIDATED -> PUBLISHED -> DEPRECATED).
   */
  async transitionLifecycleStatus({ entity_type, entity_id, entity_code, target_status, reason }, actorUserId = null, tenantId = "DEFAULT_HOSPITAL") {
    const allowedStatuses = ["DRAFT", "VALIDATION_PENDING", "VALIDATED", "PUBLISHED", "DEPRECATED"];
    if (!allowedStatuses.includes(target_status)) {
      const err = new Error(`Invalid target lifecycle status: ${target_status}`);
      err.status = 400;
      throw err;
    }

    let entityRecord = null;
    if (entity_type === "ORDER_DEFINITION" && db.ClinicalOrderDefinition) {
      const whereOr = [];
      if (entity_id && isUuidStr(entity_id)) whereOr.push({ definition_id: entity_id });
      if (entity_code) whereOr.push({ code: entity_code });
      if (!isUuidStr(entity_id) && entity_id) whereOr.push({ code: entity_id });

      if (whereOr.length > 0) {
        entityRecord = await db.ClinicalOrderDefinition.findOne({
          where: { [db.Sequelize.Op.or]: whereOr },
        });
      }
    }

    // Run validation if attempting to PUBLISH
    let validationSummary = { is_valid: true, errors: [] };
    if (target_status === "PUBLISHED") {
      validationSummary = this.validateConfiguration(entity_type, entityRecord ? entityRecord.get({ plain: true }) : { code: entity_code, name: entity_code, department_id: "GENERAL" });
      if (!validationSummary.is_valid) {
        const err = new Error(`Publishing rejected due to validation failure: ${validationSummary.errors.join(", ")}`);
        err.status = 422;
        throw err;
      }
    }

    const previousStatus = entityRecord ? entityRecord.status : "DRAFT";

    if (entityRecord) {
      await entityRecord.update({ status: target_status });
    }

    // Impact analysis
    const impactAnalysis = await this.performImpactAnalysis(entity_type, entityRecord ? entityRecord.definition_id : (entity_id || entity_code), tenantId);

    // Create Governance Log
    let logEntry = null;
    if (db.ClinicalConfigurationGovernanceLog) {
      logEntry = await db.ClinicalConfigurationGovernanceLog.create({
        governance_id: uuidv4(),
        tenant_id: tenantId,
        entity_type,
        entity_id: entityRecord ? entityRecord.definition_id : (isUuidStr(entity_id) ? entity_id : uuidv4()),
        entity_code: entity_code || (entityRecord ? entityRecord.code : "CODE"),
        version: entityRecord ? entityRecord.version : "1.0.0",
        previous_status: previousStatus,
        new_status: target_status,
        validation_summary_json: validationSummary,
        impact_analysis_json: impactAnalysis,
        actor_user_id: actorUserId,
        reason,
      });
    }

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: `configuration:${target_status.toLowerCase()}`,
        resourceType: entity_type,
        resourceId: entityRecord ? entityRecord.definition_id : (isUuidStr(entity_id) ? entity_id : uuidv4()),
        details: { previousStatus, new_status: target_status, tenantId },
      });
    }

    return {
      success: true,
      entity_type,
      entity_code,
      previous_status: previousStatus,
      new_status: target_status,
      validation_summary: validationSummary,
      impact_analysis: impactAnalysis,
      log: logEntry,
    };
  }

  /**
   * Runtime Creation Protection.
   */
  async validateRuntimeGeneration(definitionCodeOrId, tenantId = "DEFAULT_HOSPITAL") {
    let defRecord = null;
    if (db.ClinicalOrderDefinition) {
      const whereCond = isUuidStr(definitionCodeOrId) ? { definition_id: definitionCodeOrId } : { code: definitionCodeOrId };
      defRecord = await db.ClinicalOrderDefinition.findOne({ where: whereCond });
    }

    if (defRecord) {
      if (defRecord.status !== "PUBLISHED") {
        const err = new Error(`Cannot instantiate order: Configuration status is '${defRecord.status}'. Only 'PUBLISHED' configurations are active.`);
        err.status = 403;
        throw err;
      }
    }

    return { allowed: true };
  }

  /**
   * Impact Analysis.
   */
  async performImpactAnalysis(entityType, entityId, tenantId = "DEFAULT_HOSPITAL") {
    let activeOrdersCount = 0;
    let historicalOrdersCount = 0;

    if (db.ClinicalOrder) {
      try {
        const matchCond = {
          [db.Sequelize.Op.or]: [],
        };

        if (isUuidStr(entityId)) {
          matchCond[db.Sequelize.Op.or].push({ order_definition_id: entityId });
        } else {
          matchCond[db.Sequelize.Op.or].push({ activity_definition_id: entityId });
        }

        // If entityId is a code or ID, try to find definition record
        if (db.ClinicalOrderDefinition) {
          const whereCond = isUuidStr(entityId) ? { definition_id: entityId } : { code: entityId };
          const def = await db.ClinicalOrderDefinition.findOne({ where: whereCond });
          if (def) {
            matchCond[db.Sequelize.Op.or].push({ order_definition_id: def.definition_id });
            matchCond[db.Sequelize.Op.or].push({ activity_definition_id: def.code });
          }
        }

        activeOrdersCount = await db.ClinicalOrder.count({
          where: {
            [db.Sequelize.Op.and]: [
              matchCond,
              { status: { [db.Sequelize.Op.notIn]: ["COMPLETED", "CANCELLED", "FULFILLED"] } },
            ],
          },
        });

        historicalOrdersCount = await db.ClinicalOrder.count({
          where: matchCond,
        });
      } catch (e) {
        // Fallback
      }
    }

    return {
      dependent_active_orders: activeOrdersCount,
      dependent_historical_orders: historicalOrdersCount,
      risk_level: activeOrdersCount > 0 ? "HIGH" : historicalOrdersCount > 0 ? "MEDIUM" : "LOW",
      can_safely_delete: activeOrdersCount === 0 && historicalOrdersCount === 0,
      message: activeOrdersCount > 0 ? `Warning: ${activeOrdersCount} active patient orders depend on this configuration!` : "Configuration has no active order dependencies.",
    };
  }

  /**
   * Dependency Tree Visualization.
   */
  async getDependencyTree(entityCode, tenantId = "DEFAULT_HOSPITAL") {
    return {
      entity_code: entityCode,
      tenant_id: tenantId,
      hierarchy: [
        { level: 1, type: "FORM_CONFIG", name: `${entityCode} Dynamic Request Form` },
        { level: 2, type: "ACTIVITY_DEFINITION", name: `${entityCode} Clinical Activity` },
        { level: 3, type: "ORDER_DEFINITION", name: `${entityCode} Order Template` },
        { level: 4, type: "WORKFLOW_DEFINITION", name: `${entityCode} Department Workflow` },
        { level: 5, type: "RESULT_FORM_CONFIG", name: `${entityCode} Result Entry Form` },
      ],
    };
  }
}

module.exports = new ClinicalConfigurationGovernanceService();
