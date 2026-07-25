"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");
const notificationService = require("./notificationService");
const pharmacyPrescriptionService = require("./pharmacyPrescriptionService");
const { pharmacyWorkflowStateMachine } = require("./pharmacy/pharmacyWorkflowStateMachine");
const pharmacyClinicalResultService = require("./pharmacyClinicalResultService");

class PharmacyClinicalIntegrationService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "PharmacyClinicalOrder",
        resourceId,
        details,
      });
    }
  }

  async emitTimelineEvent(eventData, transaction = null) {
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(eventData, transaction);
      } catch (err) {
        console.error("Failed to emit pharmacy clinical timeline event:", err.message);
      }
    }
  }

  /**
   * Create ClinicalOrder (order_type = 'PHARMACY') for an issued prescription.
   */
  async createPharmacyOrder(prescriptionId, staffId) {
    if (!prescriptionId) {
      const err = new Error("prescription_id is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const prescription = await db.Prescription.findByPk(prescriptionId, {
        include: [{ model: db.PrescriptionItem, as: "items" }],
        transaction: t,
      });

      if (!prescription) {
        const err = new Error("Prescription not found");
        err.status = 404;
        throw err;
      }

      // Check if order already created for this prescription
      let existingOrder = await db.ClinicalOrder.findOne({
        where: { prescription_id: prescriptionId },
        transaction: t,
      });

      if (existingOrder) {
        await t.commit();
        return existingOrder.get({ plain: true });
      }

      const orderItems = (prescription.items || []).map((item) => ({
        name: item.item_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
      }));

      const clinicalOrder = await db.ClinicalOrder.create(
        {
          order_id: uuidv4(),
          appointment_id: prescription.appointment_id,
          patient_id: prescription.patient_id,
          ordered_by: prescription.prescriber_id || staffId,
          prescription_id: prescription.prescription_id,
          order_type: "PHARMACY",
          priority: "ROUTINE",
          status: "SUBMITTED",
          pharmacy_status: "PENDING_FORWARD",
          title: `Pharmacy Order: ${prescription.header_title || "Medication Order"}`,
          order_items: orderItems,
          clinical_reason: prescription.notes || null,
        },
        { transaction: t }
      );

      await db.ClinicalOrderStatusHistory.create(
        {
          history_id: uuidv4(),
          order_id: clinicalOrder.order_id,
          previous_status: null,
          new_status: "SUBMITTED",
          changed_by: staffId || prescription.prescriber_id,
          change_reason: "Pharmacy clinical order created",
        },
        { transaction: t }
      );

      await this.logAudit(
        "PHARMACY_ORDER_CREATED",
        clinicalOrder.order_id,
        staffId || prescription.prescriber_id,
        { prescription_id: prescriptionId },
        t
      );

      await this.emitTimelineEvent(
        {
          patient_id: prescription.patient_id,
          appointment_id: prescription.appointment_id,
          event_type: "PHARMACY_ORDER_CREATED",
          title: `Pharmacy Order Created`,
          description: `Prescription created with ${orderItems.length} medication items`,
          actor_id: staffId || prescription.prescriber_id,
          resource_type: "ClinicalOrder",
          resource_id: clinicalOrder.order_id,
        },
        t
      );

      await t.commit();
      return clinicalOrder.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Forward prescription to a pharmacy and update ClinicalOrder status.
   */
  async forwardToPharmacy(orderId, pharmacyId, staffId) {
    if (!orderId || !pharmacyId) {
      const err = new Error("order_id and pharmacy_id are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const order = await db.ClinicalOrder.findByPk(orderId, { transaction: t });
      if (!order) {
        const err = new Error("Clinical order not found");
        err.status = 404;
        throw err;
      }

      if (!order.prescription_id) {
        const err = new Error("Clinical order has no linked prescription");
        err.status = 400;
        throw err;
      }

      // Enforce State Machine transition check
      pharmacyWorkflowStateMachine.validateTransition(order.pharmacy_status || "PENDING_FORWARD", "FORWARDED");

      const forwardResult = await pharmacyPrescriptionService.sendPrescriptionToPharmacy(
        {
          prescription_id: order.prescription_id,
          pharmacy_id: pharmacyId,
        },
        staffId
      );

      const oldStatus = order.status;
      await order.update(
        {
          status: "IN_PROGRESS",
          pharmacy_status: "FORWARDED",
        },
        { transaction: t }
      );

      await db.ClinicalOrderStatusHistory.create(
        {
          history_id: uuidv4(),
          order_id: order.order_id,
          previous_status: oldStatus,
          new_status: "IN_PROGRESS",
          changed_by: staffId,
          change_reason: `Forwarded to Pharmacy ID ${pharmacyId}`,
        },
        { transaction: t }
      );

      await this.logAudit(
        "PHARMACY_FORWARD_CREATED",
        order.order_id,
        staffId,
        { pharmacy_id: pharmacyId, forward_id: forwardResult?.forward_id },
        t
      );

      await this.emitTimelineEvent(
        {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          event_type: "PHARMACY_SENT_TO_PHARMACY",
          title: `Prescription Sent to Pharmacy`,
          description: `Prescription transmitted to pharmacy for fulfillment`,
          actor_id: staffId,
          resource_type: "ClinicalOrder",
          resource_id: order.order_id,
        },
        t
      );

      if (notificationService && typeof notificationService.notifyInternalUser === "function") {
        try {
          await notificationService.notifyInternalUser(order.ordered_by, {
            title: `Prescription Sent to Pharmacy`,
            message: `Prescription order #${order.order_id.slice(0, 8)} forwarded to pharmacy.`,
            category: "workflow",
            relatedType: "pharmacy_order",
            relatedId: order.order_id,
          });
        } catch (nErr) {
          console.error("Failed to send doctor pharmacy notification:", nErr.message);
        }
      }

      await t.commit();
      return {
        order: order.get({ plain: true }),
        forward: forwardResult,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Synchronize Pharmacy Portal dispensing workflow status changes back to EMR ClinicalOrder, Timeline, and Doctor Notifications.
   */
  async syncPharmacyStatus(pharmacyPrescriptionId, newPharmacyStatus, staffId) {
    if (!pharmacyPrescriptionId || !newPharmacyStatus) {
      return null;
    }

    const forward = await db.PrescriptionPharmacyForward.findOne({
      where: { pharmacy_prescription_id: pharmacyPrescriptionId },
    });

    if (!forward) {
      return null;
    }

    const order = await db.ClinicalOrder.findOne({
      where: { prescription_id: forward.prescription_id },
    });

    if (!order) {
      return null;
    }

    const statusUpper = newPharmacyStatus.trim().toUpperCase();

    // Enforce State Machine transition validation
    pharmacyWorkflowStateMachine.validateTransition(order.pharmacy_status || "PENDING_FORWARD", statusUpper);

    let emrStatus = "IN_PROGRESS";
    let timelineEventType = "PHARMACY_STATUS_TRANSITION";
    let timelineTitle = `Pharmacy Order Status: ${statusUpper}`;

    switch (statusUpper) {
      case "RECEIVED":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_RECEIVED";
        timelineTitle = "Pharmacy Received Prescription";
        break;
      case "REVIEWING":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_REVIEW_STARTED";
        timelineTitle = "Pharmacist Review Started";
        break;
      case "PREPARING":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_PREPARING";
        timelineTitle = "Medication Preparation in Progress";
        break;
      case "WAITING_DOCTOR_APPROVAL":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_SUBSTITUTION_REQUIRED";
        timelineTitle = "Pharmacist Waiting for Doctor Approval";
        break;
      case "SUBSTITUTION_REQUIRED":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_SUBSTITUTION_REQUIRED";
        timelineTitle = "Medication Substitution Proposed by Pharmacy";
        break;
      case "PARTIALLY_DISPENSED":
        emrStatus = "IN_PROGRESS";
        timelineEventType = "PHARMACY_PARTIALLY_DISPENSED";
        timelineTitle = "Medication Partially Dispensed";
        break;
      case "DISPENSED":
        emrStatus = "COMPLETED";
        timelineEventType = "PHARMACY_DISPENSED";
        timelineTitle = "Medication Dispensed";
        break;
      case "COMPLETED":
        emrStatus = "COMPLETED";
        timelineEventType = "PHARMACY_COMPLETED";
        timelineTitle = "Pharmacy Fulfillment Completed";
        break;
      case "CANCELLED":
      case "REJECTED":
      case "UNAVAILABLE":
        emrStatus = "CANCELLED";
        timelineEventType = "PHARMACY_CANCELLED";
        timelineTitle = `Pharmacy Order ${statusUpper}`;
        break;
    }

    const t = await db.sequelize.transaction();
    try {
      const oldStatus = order.status;
      await order.update(
        {
          status: emrStatus,
          pharmacy_status: statusUpper,
        },
        { transaction: t }
      );

      await db.ClinicalOrderStatusHistory.create(
        {
          history_id: uuidv4(),
          order_id: order.order_id,
          previous_status: oldStatus,
          new_status: emrStatus,
          changed_by: staffId || order.ordered_by,
          change_reason: `Pharmacy status transitioned from ${order.pharmacy_status} to ${statusUpper}`,
        },
        { transaction: t }
      );

      let auditAction = "PHARMACY_STATUS_TRANSITION";
      if (statusUpper === "RECEIVED") auditAction = "PHARMACY_RECEIVED";
      if (statusUpper === "DISPENSED" || statusUpper === "COMPLETED") auditAction = "PHARMACY_DISPENSE_COMPLETED";
      if (statusUpper === "CANCELLED" || statusUpper === "REJECTED") auditAction = "PHARMACY_CANCELLED";

      await this.logAudit(auditAction, order.order_id, staffId || order.ordered_by, { from: order.pharmacy_status, to: statusUpper }, t);

      await this.emitTimelineEvent(
        {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          event_type: timelineEventType,
          title: timelineTitle,
          description: `Dispensing workflow transitioned to ${statusUpper}`,
          actor_id: staffId || order.ordered_by,
          resource_type: "ClinicalOrder",
          resource_id: order.order_id,
        },
        t
      );

      if (notificationService && typeof notificationService.notifyInternalUser === "function") {
        try {
          await notificationService.notifyInternalUser(order.ordered_by, {
            title: `Pharmacy Update: ${timelineTitle}`,
            message: `Prescription order status transitioned to ${statusUpper}.`,
            category: "workflow",
            relatedType: "pharmacy_order",
            relatedId: order.order_id,
          });
        } catch (nErr) {
          console.error("Failed to send doctor notification on pharmacy status update:", nErr.message);
        }
      }

      await t.commit();

      // Trigger Clinical Result creation if order reached DISPENSED or COMPLETED
      if (statusUpper === "DISPENSED" || statusUpper === "COMPLETED") {
        try {
          await pharmacyClinicalResultService.createPharmacyResult(order.order_id, staffId);
        } catch (resErr) {
          console.error("Failed to generate clinical order result for completed pharmacy order:", resErr.message);
        }
      }

      return order.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Request Doctor Approval for medication substitution or stock unavailability.
   */
  async requestDoctorApproval(orderId, substitutionNotes, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Pharmacy clinical order not found");
      err.status = 404;
      throw err;
    }

    pharmacyWorkflowStateMachine.validateTransition(order.pharmacy_status || "RECEIVED", "WAITING_DOCTOR_APPROVAL");

    const t = await db.sequelize.transaction();
    try {
      await order.update(
        {
          pharmacy_status: "WAITING_DOCTOR_APPROVAL",
        },
        { transaction: t }
      );

      await db.ClinicalOrderStatusHistory.create(
        {
          history_id: uuidv4(),
          order_id: order.order_id,
          previous_status: order.status,
          new_status: "IN_PROGRESS",
          changed_by: staffId,
          change_reason: `Doctor approval requested for substitution: ${substitutionNotes || "Alternative proposed"}`,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_DOCTOR_APPROVAL_REQUIRED", order.order_id, staffId, { notes: substitutionNotes }, t);

      await this.emitTimelineEvent(
        {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          event_type: "PHARMACY_SUBSTITUTION_REQUIRED",
          title: `Pharmacist Proposed Substitution — Doctor Approval Required`,
          description: substitutionNotes || "Pharmacist requested approval for alternative medication.",
          actor_id: staffId,
          resource_type: "ClinicalOrder",
          resource_id: order.order_id,
        },
        t
      );

      if (notificationService && typeof notificationService.notifyInternalUser === "function") {
        try {
          await notificationService.notifyInternalUser(order.ordered_by, {
            title: `🚨 ACTION REQUIRED: Pharmacist Substitution Request`,
            message: `Pharmacist proposed alternative medication: ${substitutionNotes}`,
            category: "workflow",
            relatedType: "pharmacy_order",
            relatedId: order.order_id,
          });
        } catch (nErr) {
          console.error("Failed to notify doctor of substitution request:", nErr.message);
        }
      }

      await t.commit();
      return order.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get pharmacy clinical order status and workflow logs.
   */
  async getPharmacyOrderStatus(orderId) {
    const order = await db.ClinicalOrder.findByPk(orderId, {
      include: [
        { model: db.Prescription, as: "prescription", include: [{ model: db.PrescriptionItem, as: "items" }] },
        { model: db.ClinicalOrderStatusHistory, as: "statusHistory" },
        { model: db.ClinicalOrderResult, as: "result" },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "orderedByUser", attributes: ["user_id", "full_name"] },
      ],
    });

    if (!order) {
      const err = new Error("Pharmacy clinical order not found");
      err.status = 404;
      throw err;
    }

    return order.get({ plain: true });
  }

  /**
   * Get patient pharmacy clinical history.
   */
  async getPatientPharmacyHistory(patientId) {
    const orders = await db.ClinicalOrder.findAll({
      where: {
        patient_id: patientId,
        order_type: "PHARMACY",
      },
      include: [
        { model: db.Prescription, as: "prescription", include: [{ model: db.PrescriptionItem, as: "items" }] },
        { model: db.ClinicalOrderResult, as: "result" },
        { model: db.User, as: "orderedByUser", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders.map((o) => o.get({ plain: true }));
  }
}

module.exports = new PharmacyClinicalIntegrationService();
