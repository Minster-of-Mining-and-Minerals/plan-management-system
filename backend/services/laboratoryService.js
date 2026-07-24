"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const clinicalOrderService = require("./clinicalOrderService");

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

    const { specimen_type = "BLOOD", notes } = payload || {};

    const specimen = await db.LaboratorySpecimen.create({
      specimen_id: uuidv4(),
      order_id: orderId,
      specimen_type,
      collection_status: "PENDING_COLLECTION",
      notes: notes || null,
    });

    await this.logAudit("LAB_SPECIMEN_CREATED", specimen.specimen_id, staffId, {
      order_id: orderId,
      specimen_type,
    });

    return specimen.get({ plain: true });
  }

  /**
   * Collect a specimen.
   */
  async collectSpecimen(specimenId, staffId, notes = null) {
    const specimen = await db.LaboratorySpecimen.findByPk(specimenId);
    if (!specimen) {
      const err = new Error("Laboratory specimen not found");
      err.status = 404;
      throw err;
    }

    await specimen.update({
      collection_status: "COLLECTED",
      collected_by: staffId,
      collected_at: new Date(),
      notes: notes || specimen.notes,
    });

    // Update parent order laboratory status to SPECIMEN_COLLECTED
    const order = await db.ClinicalOrder.findByPk(specimen.order_id);
    if (order) {
      await order.update({ laboratory_status: "SPECIMEN_COLLECTED" });
      await clinicalOrderService.recordStatusHistory(
        order.order_id,
        order.status,
        order.status,
        staffId,
        `Specimen collected: ${specimen.specimen_type}`
      );
    }

    await this.logAudit("SPECIMEN_COLLECTED", specimenId, staffId, {
      order_id: specimen.order_id,
      specimen_type: specimen.specimen_type,
    });

    // Append to timeline via MedicalHistoryLog
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

    // Call clinicalOrderService.recordResult
    const updatedOrder = await clinicalOrderService.recordResult(orderId, payload, staffId);

    // Set lab status to COMPLETED
    await db.ClinicalOrder.update(
      { laboratory_status: "COMPLETED" },
      { where: { order_id: orderId } }
    );

    await this.logAudit("LAB_RESULT_SUBMITTED", orderId, staffId, {
      verification_status: payload.verification_status || "FINAL",
    });

    return clinicalOrderService.getOrder(orderId);
  }
}

module.exports = new LaboratoryService();
