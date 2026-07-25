"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalActivityDefinitionService = require("./clinicalActivityDefinitionService");
const unifiedClinicalQueueService = require("../clinicalOrder/unifiedClinicalQueueService");
const unifiedClinicalSLAEngine = require("../clinicalOrder/unifiedClinicalSLAEngine");
const timelineEventService = require("../timelineEventService");
const auditService = require("../auditService");
const notificationService = require("../notificationService");

class ClinicalWorkflowEngine {
  /**
   * Submit Dynamic Form & Process Clinical Intent into ClinicalOrder.
   */
  async submitClinicalIntent(payload, actorUserId = null) {
    const {
      activity_code,
      activity_id,
      appointment_id,
      patient_id,
      ordered_by,
      clinical_data = {},
      source_form_config_id = null,
      priority = null,
      notes = null,
    } = payload;

    const effectiveOrderedBy = ordered_by || actorUserId;
    if (!appointment_id || !patient_id || !effectiveOrderedBy) {
      const err = new Error("appointment_id, patient_id, and ordered_by are required");
      err.status = 400;
      throw err;
    }

    // 1. Find Activity Definition
    const activityDef = await clinicalActivityDefinitionService.findByCodeOrId(activity_code || activity_id || "CBC_TEST");

    // 2. Build Clinical Intent JSON
    const clinicalIntentJson = {
      intent_id: uuidv4(),
      activity_code: activityDef.code,
      activity_name: activityDef.name,
      captured_at: new Date().toISOString(),
      clinical_data,
      billing_configuration: activityDef.billing_configuration,
    };

    // 3. Create ClinicalOrder
    const orderPriority = priority || activityDef.default_priority || "ROUTINE";
    const orderTitle = `${activityDef.name} (${activityDef.order_type})`;

    const order = await db.ClinicalOrder.create({
      order_id: uuidv4(),
      appointment_id,
      patient_id,
      ordered_by: effectiveOrderedBy,
      order_type: activityDef.order_type,
      priority: orderPriority,
      status: "ORDERED",
      title: orderTitle,
      clinical_reason: clinical_data.reason || clinical_data.clinical_reason || "Dynamic Clinical Intent Generated",
      notes,
      activity_definition_id: activityDef.activity_id || activityDef.code,
      source_form_config_id,
      clinical_intent_json: clinicalIntentJson,
      execution_form_config_id: activityDef.execution_form_config_id || null,
      result_form_config_id: activityDef.result_form_config_id || null,
    });

    // 4. Record Audit Trail
    if (actorUserId || effectiveOrderedBy) {
      await auditService.logAudit({
        actorUserId: actorUserId || effectiveOrderedBy,
        action: "workflow:intent_submit",
        resourceType: "CLINICAL_ORDER",
        resourceId: order.order_id,
        details: { activity_code: activityDef.code, order_type: activityDef.order_type },
      });
    }

    // 5. Register SLA Timer
    try {
      const targetMins = activityDef.sla_configuration?.target_minutes || 60;
      await unifiedClinicalSLAEngine.registerOrderSLA(order.order_id, activityDef.order_type, orderPriority, targetMins);
    } catch (e) {
      // Silently capture SLA registration fallback
    }

    // 6. Emit Timeline Event
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "CLINICAL_ORDER_INTENT_CREATED",
          title: `Dynamic Order Created: ${orderTitle}`,
          notes: `Activity ${activityDef.code} submitted via Dynamic Clinical Workflow`,
          domain: activityDef.order_type,
          patient_id,
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    // 7. Dispatch Notification
    if (notificationService && typeof notificationService.sendNotification === "function") {
      try {
        await notificationService.sendNotification({
          type: "CLINICAL_ORDER_NOTIFICATION",
          title: `New Dynamic Order: ${orderTitle}`,
          message: `Dynamic order submitted for ${activityDef.order_type}`,
        });
      } catch (e) {
        // Silently capture notification error
      }
    }

    return {
      success: true,
      order_id: order.order_id,
      activity: activityDef,
      order,
      intent: clinicalIntentJson,
    };
  }

  /**
   * Get dynamic workflow definitions.
   */
  async getWorkflowDefinitions() {
    const defaultWorkflows = [
      {
        workflow_id: "wf-physio-01",
        name: "Physiotherapy Rehabilitation Workflow",
        code: "PHYSIO_REHAB_WORKFLOW",
        department_id: "PHYSIOTHERAPY",
        description: "Configurable dynamic workflow for physiotherapy patient rehabilitation",
        steps: [
          { step_number: 1, name: "Initial Assessment Form", type: "DYNAMIC_FORM", form_code: "PHYSIO_ASSESSMENT_FORM" },
          { step_number: 2, name: "Therapy Order Intent", type: "CLINICAL_INTENT", activity_code: "PHYSIO_ASSESSMENT" },
          { step_number: 3, name: "Physiotherapy Queue Fulfillment", type: "DEPARTMENT_FULFILLMENT" },
          { step_number: 4, name: "Progress Evaluation Dynamic Form", type: "DYNAMIC_FORM", form_code: "PHYSIO_PROGRESS_FORM" },
        ],
        is_active: true,
      },
    ];

    if (db.ClinicalWorkflowDefinition) {
      try {
        const dbWorkflows = await db.ClinicalWorkflowDefinition.findAll({ where: { is_active: true } });
        if (dbWorkflows.length > 0) {
          return dbWorkflows.map((w) => w.get({ plain: true }));
        }
      } catch (e) {
        // Fallback
      }
    }

    return defaultWorkflows;
  }
}

module.exports = new ClinicalWorkflowEngine();
