"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalOrderDefinitionService = require("./clinicalOrderDefinitionService");
const clinicalConfigurationGovernanceService = require("../workflow/clinicalConfigurationGovernanceService");
const unifiedClinicalSLAEngine = require("../clinicalOrder/unifiedClinicalSLAEngine");
const timelineEventService = require("../timelineEventService");
const auditService = require("../auditService");
const notificationService = require("../notificationService");

class RuntimeOrderGenerationService {
  /**
   * Instantiate a runtime ClinicalOrder from an Order Definition.
   */
  async instantiateRuntimeOrder(payload, actorUserId = null) {
    const {
      definition_code,
      definition_id,
      appointment_id,
      patient_id,
      ordered_by,
      tenant_id = "DEFAULT_HOSPITAL",
      intent_data = {},
      priority = null,
      notes = null,
    } = payload;

    const effectiveOrderedBy = ordered_by || actorUserId;
    if (!appointment_id || !patient_id || !effectiveOrderedBy) {
      const err = new Error("appointment_id, patient_id, and ordered_by are required");
      err.status = 400;
      throw err;
    }

    // 1. Fetch Order Definition
    const def = await clinicalOrderDefinitionService.findByCodeOrId(definition_code || definition_id || "DEF_CBC_TEST");

    // Governance Protection Check
    await clinicalConfigurationGovernanceService.validateRuntimeGeneration(def.definition_id || def.code, tenant_id);

    // 2. Create Immutable Version Snapshot
    const snapshot = {
      definition_version: def.version || "1.0.0",
      definition_snapshot: {
        code: def.code,
        name: def.name,
        category: def.category,
        department_id: def.department_id,
      },
      form_snapshot: {
        request_form_config_id: def.request_form_config_id || null,
        execution_form_config_id: def.execution_form_config_id || null,
        result_form_config_id: def.result_form_config_id || null,
      },
      workflow_snapshot: {
        workflow_definition_id: def.workflow_definition_id || null,
      },
      created_at: new Date().toISOString(),
    };

    // 3. Prepare Payload
    const intentPayload = {
      intent_id: uuidv4(),
      captured_at: new Date().toISOString(),
      intent_data,
    };

    const orderPriority = priority || def.priority_configuration?.default_priority || "ROUTINE";

    // 4. Create Generic ClinicalOrder Instance
    const order = await db.ClinicalOrder.create({
      order_id: uuidv4(),
      appointment_id,
      patient_id,
      ordered_by: effectiveOrderedBy,
      order_type: def.department_id || def.category || "GENERAL",
      priority: orderPriority,
      status: "ORDERED",
      title: `${def.name} (${def.department_id})`,
      clinical_reason: intent_data.reason || intent_data.clinical_reason || "Runtime Order Instantiated",
      notes,
      order_definition_id: def.definition_id || def.code,
      workflow_instance_id: `wf-inst-${uuidv4().slice(0, 8)}`,
      intent_payload_json: intentPayload,
      configuration_snapshot_json: snapshot,
    });

    // 5. Audit Logging
    if (actorUserId || effectiveOrderedBy) {
      await auditService.logAudit({
        actorUserId: actorUserId || effectiveOrderedBy,
        action: "order_definition:instantiate",
        resourceType: "CLINICAL_ORDER",
        resourceId: order.order_id,
        details: { definition_code: def.code, version: def.version },
      });
    }

    // 6. SLA Engine Registration
    try {
      await unifiedClinicalSLAEngine.registerOrderSLA(order.order_id, def.department_id, orderPriority, 60);
    } catch (e) {
      // Fallback
    }

    // 7. Timeline Event Emission
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "RUNTIME_ORDER_INSTANTIATED",
          title: `Configuration Order Created: ${order.title}`,
          notes: `Instantiated from definition ${def.code} v${def.version}`,
          domain: def.department_id,
          patient_id,
        });
      } catch (e) {
        // Fallback
      }
    }

    return {
      success: true,
      order_id: order.order_id,
      definition: def,
      snapshot,
      order,
    };
  }
}

module.exports = new RuntimeOrderGenerationService();
