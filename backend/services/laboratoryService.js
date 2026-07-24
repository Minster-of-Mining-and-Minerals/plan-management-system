"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const clinicalOrderService = require("./clinicalOrderService");
const laboratoryQueueService = require("./laboratoryQueueService");

class LaboratoryService {
  /**
   * Helper to log audit events into NovaCure audit log.
   */
  async logAudit(action, resourceId, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "Laboratory",
        resourceId,
        details,
      });
    }
  }

  /**
   * Record immutable specimen status transition history.
   */
  async recordSpecimenStatusHistory(specimenId, previousStatus, newStatus, staffId, reason = null) {
    if (db.LaboratorySpecimenStatusHistory) {
      await db.LaboratorySpecimenStatusHistory.create({
        specimen_status_history_id: uuidv4(),
        specimen_id: specimenId,
        previous_status: previousStatus || null,
        new_status: newStatus,
        changed_by: staffId,
        reason: reason || null,
      });
    }
  }

  /**
   * Create a new laboratory test catalog entry.
   */
  async createTestCatalog(payload, staffId) {
    const {
      code,
      name,
      description,
      category = "HEMATOLOGY",
      sample_type = "BLOOD",
      unit,
      reference_range,
      billing_service_id,
    } = payload;

    if (!code?.trim() || !name?.trim()) {
      const err = new Error("Test catalog code and name are required");
      err.status = 400;
      throw err;
    }

    const test = await db.LaboratoryTestCatalog.create({
      test_catalog_id: uuidv4(),
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description || null,
      category,
      sample_type,
      unit: unit || null,
      reference_range: reference_range || null,
      billing_service_id: billing_service_id || null,
      is_active: true,
    });

    await this.logAudit("LAB_TEST_CATALOG_CREATED", test.test_catalog_id, staffId, {
      code: test.code,
      name: test.name,
    });

    return test.get({ plain: true });
  }

  /**
   * List all laboratory test catalog entries.
   */
  async listTestCatalog(category) {
    const where = { is_active: true };
    if (category) {
      where.category = category;
    }

    const rows = await db.LaboratoryTestCatalog.findAll({
      where,
      order: [["category", "ASC"], ["name", "ASC"]],
    });

    return rows.map((r) => r.get({ plain: true }));
  }

  /**
   * Add test items to an existing laboratory order.
   */
  async addTestItems(orderId, items = [], staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error("Items array is required");
      err.status = 400;
      throw err;
    }

    const createdItems = [];
    for (const item of items) {
      const created = await db.LaboratoryOrderItem.create({
        item_id: uuidv4(),
        order_id: orderId,
        test_catalog_id: item.test_catalog_id || null,
        test_name: item.test_name || "Laboratory Test",
        status: "PENDING",
      });
      createdItems.push(created.get({ plain: true }));
    }

    await this.logAudit("LAB_ORDER_ITEMS_ADDED", orderId, staffId, {
      item_count: createdItems.length,
    });

    return createdItems;
  }

  /**
   * Create a new specimen tracking entry for a lab order.
   */
  async createSpecimen(orderId, payload, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const { specimen_type = "BLOOD", notes, parent_specimen_id } = payload || {};

    const specimen = await db.LaboratorySpecimen.create({
      specimen_id: uuidv4(),
      order_id: orderId,
      parent_specimen_id: parent_specimen_id || null,
      specimen_type,
      collection_status: "PENDING_COLLECTION",
      notes: notes || null,
    });

    await this.recordSpecimenStatusHistory(
      specimen.specimen_id,
      null,
      "PENDING_COLLECTION",
      staffId,
      "Specimen request initialized"
    );

    await this.logAudit("SPECIMEN_CREATED", specimen.specimen_id, staffId, {
      order_id: orderId,
      specimen_type,
    });

    await laboratoryQueueService.transitionQueueStage(orderId, specimen.specimen_id, "COLLECTION", staffId);

    return specimen.get({ plain: true });
  }

  /**
   * Collect a specimen and log collection details.
   */
  async collectSpecimen(specimenId, staffId, notes = null, site = null) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    const oldStatus = specimen.collection_status;

    await specimen.update({
      collection_status: "COLLECTED",
      collected_by: staffId,
      collected_at: new Date(),
      notes: notes || specimen.notes,
    });

    // Record collection detail record
    if (db.LaboratorySpecimenCollection) {
      await db.LaboratorySpecimenCollection.create({
        collection_id: uuidv4(),
        specimen_id: specimenId,
        collected_by: staffId,
        collection_time: new Date(),
        collection_site: site || null,
        collector_notes: notes || null,
      });
    }

    await this.recordSpecimenStatusHistory(
      specimenId,
      oldStatus,
      "COLLECTED",
      staffId,
      "Specimen collected"
    );

    // Update parent order laboratory status to SPECIMEN_COLLECTED
    const order = await db.ClinicalOrder.findByPk(specimen.order_id);
    if (order) {
      await order.update({ laboratory_status: "SPECIMEN_COLLECTED" });
    }

    await this.logAudit("SPECIMEN_COLLECTED", specimenId, staffId, {
      order_id: specimen.order_id,
      specimen_type: specimen.specimen_type,
    });

    await laboratoryQueueService.transitionQueueStage(specimen.order_id, specimenId, "RECEPTION", staffId);

    if (order) {
      await db.MedicalHistoryLog.create({
        log_id: uuidv4(),
        patient_id: order.patient_id,
        appointment_id: order.appointment_id,
        sender_staff_id: staffId,
        action_type: "update",
        header_title: `Specimen Collected: ${specimen.specimen_type}`,
        notes: notes || `Specimen collected for order ${order.title}`,
        status: "collected",
      });
    }

    return specimen.get({ plain: true });
  }

  /**
   * Receive a specimen into the laboratory.
   */
  async receiveSpecimen(specimenId, staffId) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    if (specimen.collection_status !== "COLLECTED") {
      const err = new Error(`Cannot receive specimen in status ${specimen.collection_status}`);
      err.status = 400;
      throw err;
    }

    const oldStatus = specimen.collection_status;

    await specimen.update({ collection_status: "RECEIVED" });
    await this.recordSpecimenStatusHistory(
      specimenId,
      oldStatus,
      "RECEIVED",
      staffId,
      "Specimen received by laboratory"
    );

    await this.logAudit("SPECIMEN_RECEIVED", specimenId, staffId, {
      order_id: specimen.order_id,
    });

    await laboratoryQueueService.transitionQueueStage(specimen.order_id, specimenId, "PROCESSING", staffId);

    return specimen.get({ plain: true });
  }

  /**
   * Accept a received specimen into processing.
   */
  async acceptSpecimen(specimenId, staffId) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    if (specimen.collection_status !== "RECEIVED" && specimen.collection_status !== "COLLECTED") {
      const err = new Error(`Cannot accept specimen in status ${specimen.collection_status}`);
      err.status = 400;
      throw err;
    }

    const oldStatus = specimen.collection_status;

    await specimen.update({ collection_status: "ACCEPTED" });
    await this.recordSpecimenStatusHistory(
      specimenId,
      oldStatus,
      "ACCEPTED",
      staffId,
      "Specimen accepted for testing"
    );

    // Update order lab status to PROCESSING
    const order = await db.ClinicalOrder.findByPk(specimen.order_id);
    if (order) {
      await order.update({ laboratory_status: "PROCESSING" });
    }

    await this.logAudit("SPECIMEN_ACCEPTED", specimenId, staffId, {
      order_id: specimen.order_id,
    });

    await laboratoryQueueService.transitionQueueStage(specimen.order_id, specimenId, "PROCESSING", staffId);

    return specimen.get({ plain: true });
  }

  /**
   * Reject a specimen with mandatory reason.
   */
  async rejectSpecimen(specimenId, reason, staffId) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    if (!reason?.trim()) {
      const err = new Error("Rejection reason is required");
      err.status = 400;
      throw err;
    }

    if (specimen.collection_status === "REJECTED" || specimen.collection_status === "CANCELLED") {
      const err = new Error(`Specimen is already in status ${specimen.collection_status}`);
      err.status = 400;
      throw err;
    }

    const oldStatus = specimen.collection_status;

    await specimen.update({ collection_status: "REJECTED" });
    await this.recordSpecimenStatusHistory(
      specimenId,
      oldStatus,
      "REJECTED",
      staffId,
      reason.trim()
    );

    await this.logAudit("SPECIMEN_REJECTED", specimenId, staffId, {
      order_id: specimen.order_id,
      reason: reason.trim(),
    });

    const order = await db.ClinicalOrder.findByPk(specimen.order_id);
    if (order) {
      await db.MedicalHistoryLog.create({
        log_id: uuidv4(),
        patient_id: order.patient_id,
        appointment_id: order.appointment_id,
        sender_staff_id: staffId,
        action_type: "update",
        header_title: `Specimen Rejected: ${specimen.specimen_type}`,
        notes: `Reason: ${reason.trim()}`,
        status: "rejected",
      });
    }

    return specimen.get({ plain: true });
  }

  /**
   * Create a recollection request for a rejected specimen.
   */
  async createRecollectionRequest(specimenId, staffId, notes = null) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    if (specimen.collection_status !== "REJECTED") {
      const err = new Error("Recollection can only be created for rejected specimens");
      err.status = 400;
      throw err;
    }

    // Update status to RECOLLECTION_REQUIRED
    await specimen.update({ collection_status: "RECOLLECTION_REQUIRED" });
    await this.recordSpecimenStatusHistory(
      specimenId,
      "REJECTED",
      "RECOLLECTION_REQUIRED",
      staffId,
      "Recollection requested"
    );

    // Create replacement specimen linked via parent_specimen_id
    const newSpecimen = await db.LaboratorySpecimen.create({
      specimen_id: uuidv4(),
      order_id: specimen.order_id,
      parent_specimen_id: specimen.specimen_id,
      specimen_type: specimen.specimen_type,
      collection_status: "PENDING_COLLECTION",
      notes: notes || `Recollection replacement for specimen ${specimen.specimen_id}`,
    });

    await this.recordSpecimenStatusHistory(
      newSpecimen.specimen_id,
      null,
      "PENDING_COLLECTION",
      staffId,
      `Replacement specimen created for rejected parent ${specimen.specimen_id}`
    );

    await this.logAudit("SPECIMEN_RECOLLECTION_CREATED", newSpecimen.specimen_id, staffId, {
      parent_specimen_id: specimen.specimen_id,
      order_id: specimen.order_id,
    });

    // Reset parent order lab status to WAITING_FOR_COLLECTION
    const order = await db.ClinicalOrder.findByPk(specimen.order_id);
    if (order) {
      await order.update({ laboratory_status: "WAITING_FOR_COLLECTION" });
    }

    return newSpecimen.get({ plain: true });
  }

  /**
   * Get specimen history including status transitions and collection attempts.
   */
  async getSpecimenHistory(specimenId) {
    const includeOptions = [];
    if (db.LaboratorySpecimenStatusHistory) {
      includeOptions.push({
        model: db.LaboratorySpecimenStatusHistory,
        as: "statusHistory",
        required: false,
        include: [
          {
            model: db.User,
            as: "changedByUser",
            attributes: ["user_id", "full_name"],
          },
        ],
      });
    }

    if (db.LaboratorySpecimenCollection) {
      includeOptions.push({
        model: db.LaboratorySpecimenCollection,
        as: "collections",
        required: false,
        include: [
          {
            model: db.User,
            as: "collector",
            attributes: ["user_id", "full_name"],
          },
        ],
      });
    }

    const specimen = await db.LaboratorySpecimen.findByPk(specimenId, {
      include: includeOptions,
    });

    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    return specimen.get({ plain: true });
  }

  /**
   * Update laboratory status on a clinical order.
   */
  async updateLaboratoryStatus(orderId, laboratoryStatus, staffId, reason = null) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    await order.update({ laboratory_status: laboratoryStatus });

    await clinicalOrderService.recordStatusHistory(
      orderId,
      order.status,
      order.status,
      staffId,
      `Laboratory status updated to ${laboratoryStatus}`
    );

    await this.logAudit("LAB_STATUS_UPDATED", orderId, staffId, {
      laboratory_status: laboratoryStatus,
      reason,
    });

    return clinicalOrderService.getOrder(orderId);
  }

  /**
   * Submit laboratory result.
   */
  async submitLaboratoryResult(orderId, payload, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const updatedOrder = await clinicalOrderService.recordResult(orderId, payload, staffId);

    await db.ClinicalOrder.update(
      { laboratory_status: "COMPLETED" },
      { where: { order_id: orderId } }
    );

    await this.logAudit("LAB_RESULT_SUBMITTED", orderId, staffId, {
      verification_status: payload.verification_status || "FINAL",
    });

    await laboratoryQueueService.transitionQueueStage(orderId, null, "VERIFICATION", staffId);

    return clinicalOrderService.getOrder(orderId);
  }
}

module.exports = new LaboratoryService();
