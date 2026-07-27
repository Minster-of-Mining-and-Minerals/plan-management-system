"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const notificationService = require("./notificationService");

class ClinicalOrderService {
  /**
   * Helper to record immutable status transition history.
   */
  async recordStatusHistory(orderId, previousStatus, newStatus, staffId, reason = null) {
    if (db.ClinicalOrderStatusHistory) {
      await db.ClinicalOrderStatusHistory.create({
        history_id: uuidv4(),
        order_id: orderId,
        previous_status: previousStatus || null,
        new_status: newStatus,
        changed_by: staffId,
        reason: reason || null,
      });
    }
  }

  /**
   * Helper to log audit events into NovaCure audit architecture.
   */
  async logAudit(action, order, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "ClinicalOrder",
        resourceId: order.order_id,
        details: {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          order_type: order.order_type,
          title: order.title,
          status: order.status,
          ...details,
        },
      });
    }
  }

  /**
   * Create a new clinical order for an encounter.
   */
  async createOrder(payload, staffId) {
    const {
      appointment_id,
      patient_id,
      order_type = "LABORATORY",
      priority = "ROUTINE",
      title,
      clinical_reason,
      order_items = [],
      notes,
      assigned_department_id,
      intent_data,
      originating_form_config_id,
    } = payload;

    if (!appointment_id) {
      const err = new Error("appointment_id is required");
      err.status = 400;
      throw err;
    }

    if (!title?.trim()) {
      const err = new Error("Order title is required");
      err.status = 400;
      throw err;
    }

    const appointment = await db.StaffAppointment.findByPk(appointment_id, {
      attributes: ["appointment_id", "patient_id", "workflow_status"],
    });

    if (!appointment) {
      const err = new Error("Appointment not found");
      err.status = 404;
      throw err;
    }

    const resolvedPatientId = patient_id || appointment.patient_id;

    const order = await db.ClinicalOrder.create({
      order_id: uuidv4(),
      appointment_id,
      patient_id: resolvedPatientId,
      ordered_by: staffId,
      assigned_department_id: assigned_department_id || null,
      order_type,
      priority,
      status: "SUBMITTED",
      title: title.trim(),
      clinical_reason: clinical_reason || null,
      order_items: Array.isArray(order_items) ? order_items : [],
      notes: notes || null,
      intent_data: intent_data || null,
      originating_form_config_id: originating_form_config_id || null,
    });

    // Record status transition history (NULL -> SUBMITTED)
    await this.recordStatusHistory(order.order_id, null, "SUBMITTED", staffId, "Order placed");

    // Record Audit Event
    await this.logAudit("ORDER_CREATED", order, staffId);

    // Create a workflow history log for timeline tracing
    await db.MedicalHistoryLog.create({
      log_id: uuidv4(),
      patient_id: resolvedPatientId,
      appointment_id,
      sender_staff_id: staffId,
      action_type: "submit",
      header_title: `Order Placed: ${title.trim()} (${order_type})`,
      notes: clinical_reason || null,
      status: "submitted",
    });

    return this.getOrder(order.order_id);
  }

  /**
   * Fetch a single clinical order by ID with associations and history.
   */
  async getOrder(orderId) {
    const includeOptions = [
      {
        model: db.User,
        as: "patient",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: db.User,
        as: "orderedByUser",
        attributes: ["user_id", "full_name"],
      },
      {
        model: db.User,
        as: "assignedStaff",
        attributes: ["user_id", "full_name"],
        required: false,
      },
      {
        model: db.Department,
        as: "department",
        attributes: ["department_id", "name"],
        required: false,
      },
    ];

    if (db.ClinicalOrderStatusHistory) {
      includeOptions.push({
        model: db.ClinicalOrderStatusHistory,
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

    const resultInclude = [
      {
        model: db.User,
        as: "recordedByUser",
        attributes: ["user_id", "full_name"],
      },
    ];

    if (db.ClinicalOrderResultHistory) {
      resultInclude.push({
        model: db.ClinicalOrderResultHistory,
        as: "amendmentHistory",
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

    includeOptions.push({
      model: db.ClinicalOrderResult,
      as: "result",
      required: false,
      include: resultInclude,
    });

    const order = await db.ClinicalOrder.findByPk(orderId, {
      include: includeOptions,
    });

    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    return order.get({ plain: true });
  }

  /**
   * List all clinical orders for an encounter.
   */
  async listOrdersForEncounter(appointmentId) {
    const rows = await db.ClinicalOrder.findAll({
      where: { appointment_id: appointmentId },
      include: [
        {
          model: db.User,
          as: "orderedByUser",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.ClinicalOrderResult,
          as: "result",
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return rows.map((r) => r.get({ plain: true }));
  }

  /**
   * List all clinical orders for a patient.
   */
  async listOrdersForPatient(patientId) {
    const rows = await db.ClinicalOrder.findAll({
      where: { patient_id: patientId },
      include: [
        {
          model: db.User,
          as: "orderedByUser",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.ClinicalOrderResult,
          as: "result",
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return rows.map((r) => r.get({ plain: true }));
  }

  /**
   * List department queue orders.
   */
  async listDepartmentQueue(departmentId, filters = {}) {
    const where = {};
    if (departmentId) {
      where.assigned_department_id = departmentId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.order_type) {
      where.order_type = filters.order_type;
    }

    const rows = await db.ClinicalOrder.findAll({
      where,
      include: [
        {
          model: db.User,
          as: "patient",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.User,
          as: "orderedByUser",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.User,
          as: "assignedStaff",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.ClinicalOrderResult,
          as: "result",
          required: false,
        },
      ],
      order: [
        [db.Sequelize.literal(`CASE WHEN priority = 'STAT' THEN 1 WHEN priority = 'URGENT' THEN 2 ELSE 3 END`), "ASC"],
        ["created_at", "ASC"],
      ],
    });

    return rows.map((r) => r.get({ plain: true }));
  }

  /**
   * Auto-assign order to the least-loaded technician in the department.
   */
  async autoAssignQueueOrder(orderId, departmentId = null, actorUserId = null) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const targetDeptId = departmentId || order.assigned_department_id;
    if (!targetDeptId) {
      const err = new Error("Order has no assigned department for load balancing");
      err.status = 400;
      throw err;
    }

    const staffProfiles = await db.InternalUserProfile.findAll({
      where: { department_id: targetDeptId },
      attributes: ["user_id"],
    });

    const staffUserIds = staffProfiles.map((p) => p.user_id);
    if (staffUserIds.length === 0) {
      const err = new Error(`No staff members found assigned to department '${targetDeptId}'`);
      err.status = 404;
      throw err;
    }

    const activeCounts = await db.ClinicalOrder.findAll({
      where: {
        assigned_staff_id: { [db.Sequelize.Op.in]: staffUserIds },
        status: { [db.Sequelize.Op.in]: ["ACCEPTED", "IN_PROGRESS"] },
      },
      attributes: ["assigned_staff_id", [db.Sequelize.fn("COUNT", db.Sequelize.col("order_id")), "active_count"]],
      group: ["assigned_staff_id"],
      raw: true,
    });

    const countMap = new Map();
    staffUserIds.forEach((id) => countMap.set(id, 0));
    activeCounts.forEach((row) => countMap.set(row.assigned_staff_id, Number(row.active_count || 0)));

    let minStaffId = staffUserIds[0];
    let minCount = countMap.get(minStaffId) || 0;

    for (const id of staffUserIds) {
      const count = countMap.get(id) || 0;
      if (count < minCount) {
        minCount = count;
        minStaffId = id;
      }
    }

    const oldStatus = order.status;
    await order.update({
      assigned_staff_id: minStaffId,
      assigned_department_id: targetDeptId,
      status: "ACCEPTED",
    });

    await this.recordStatusHistory(orderId, oldStatus, "ACCEPTED", actorUserId || minStaffId, "Auto-assigned by load balancing engine");
    await this.logAudit("ORDER_AUTO_ASSIGNED", order, actorUserId || minStaffId, {
      assigned_to: minStaffId,
      active_load: minCount,
    });

    return this.getOrder(orderId);
  }

  /**
   * Accept / claim an order for execution.
   */
  async acceptOrder(orderId, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      const err = new Error(`Cannot accept order in status ${order.status}`);
      err.status = 400;
      throw err;
    }

    const oldStatus = order.status;

    await order.update({
      assigned_staff_id: staffId,
      status: "ACCEPTED",
    });

    await this.recordStatusHistory(orderId, oldStatus, "ACCEPTED", staffId, "Order claimed by staff");
    await this.logAudit("ORDER_ACCEPTED", order, staffId);

    return this.getOrder(orderId);
  }

  /**
   * Update order status.
   */
  async updateOrderStatus(orderId, status, staffId, reason = null) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const oldStatus = order.status;

    await order.update({
      status,
      assigned_staff_id: staffId || order.assigned_staff_id,
    });

    await this.recordStatusHistory(orderId, oldStatus, status, staffId, reason);
    const auditAction = status === "IN_PROGRESS" ? "ORDER_STARTED" : `ORDER_${status}`;
    await this.logAudit(auditAction, order, staffId, { reason });

    return this.getOrder(orderId);
  }

  /**
   * Cancel an order with a mandatory cancellation reason.
   */
  async cancelOrder(orderId, cancellationReason, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    if (order.status === "COMPLETED") {
      const err = new Error("Cannot cancel a completed clinical order");
      err.status = 400;
      throw err;
    }

    if (order.status === "CANCELLED") {
      const err = new Error("Order is already cancelled");
      err.status = 400;
      throw err;
    }

    if (!cancellationReason?.trim()) {
      const err = new Error("cancellation_reason is required when cancelling an order");
      err.status = 400;
      throw err;
    }

    const oldStatus = order.status;

    await order.update({
      status: "CANCELLED",
      cancellation_reason: cancellationReason.trim(),
    });

    await this.recordStatusHistory(
      orderId,
      oldStatus,
      "CANCELLED",
      staffId,
      cancellationReason.trim()
    );

    await this.logAudit("ORDER_CANCELLED", order, staffId, {
      cancellation_reason: cancellationReason.trim(),
    });

    // Medical history log for timeline
    await db.MedicalHistoryLog.create({
      log_id: uuidv4(),
      patient_id: order.patient_id,
      appointment_id: order.appointment_id,
      sender_staff_id: staffId,
      action_type: "update",
      header_title: `Order Cancelled: ${order.title}`,
      notes: `Reason: ${cancellationReason.trim()}`,
      status: "cancelled",
    });

    return this.getOrder(orderId);
  }

  /**
   * Record a clinical result for an order and mark order as COMPLETED.
   */
  async recordResult(orderId, payload, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const oldStatus = order.status;
    const { result_summary, result_data = {}, verification_status = "FINAL" } = payload;

    const [result, created] = await db.ClinicalOrderResult.findOrCreate({
      where: { order_id: orderId },
      defaults: {
        result_id: uuidv4(),
        order_id: orderId,
        recorded_by: staffId,
        verification_status,
        result_summary: result_summary || null,
        result_data,
        recorded_at: new Date(),
      },
    });

    if (!created) {
      await result.update({
        recorded_by: staffId,
        verification_status,
        result_summary: result_summary || result.result_summary,
        result_data: { ...result.result_data, ...result_data },
        recorded_at: new Date(),
      });
    }

    await order.update({ status: "COMPLETED" });

    await this.recordStatusHistory(orderId, oldStatus, "COMPLETED", staffId, "Order resulted");
    await this.logAudit(created ? "RESULT_CREATED" : "RESULT_VERIFIED", order, staffId, {
      verification_status,
    });

    // Notify originating physician and current encounter owner
    try {
      const recipients = new Set();
      if (order.ordered_by) recipients.add(order.ordered_by);
      if (order.appointment_id && db.StaffAppointment) {
        const appt = await db.StaffAppointment.findByPk(order.appointment_id, { attributes: ["current_assigned_user_id"] });
        if (appt?.current_assigned_user_id) recipients.add(appt.current_assigned_user_id);
      }
      for (const recipientId of recipients) {
        await notificationService.notifyInternalUser(recipientId, {
          title: `Clinical Order Completed: ${order.title}`,
          message: `Result submitted for order '${order.title}' (${order.order_type}). Summary: ${result_summary || 'Final result recorded.'}`,
          category: "workflow",
          relatedType: "clinical_order",
          relatedId: order.order_id,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send order result notifications:", notifErr);
    }

    // Log to MedicalHistoryLog for timeline integration
    await db.MedicalHistoryLog.create({
      log_id: uuidv4(),
      patient_id: order.patient_id,
      appointment_id: order.appointment_id,
      sender_staff_id: staffId,
      action_type: "submit",
      header_title: `Order Result: ${order.title}`,
      notes: result_summary || null,
      status: "submitted",
    });

    return this.getOrder(orderId);
  }

  /**
   * Amend an existing clinical order result with history tracking.
   */
  async amendResult(orderId, payload, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const result = await db.ClinicalOrderResult.findOne({
      where: { order_id: orderId },
    });

    if (!result) {
      const err = new Error("No result exists for this order to amend");
      err.status = 404;
      throw err;
    }

    const { result_summary, result_data = {}, reason, verification_status = "FINAL" } = payload;

    if (!reason?.trim()) {
      const err = new Error("Amendment reason is required");
      err.status = 400;
      throw err;
    }

    // Save amendment history record
    if (db.ClinicalOrderResultHistory) {
      await db.ClinicalOrderResultHistory.create({
        history_id: uuidv4(),
        result_id: result.result_id,
        previous_summary: result.result_summary,
        previous_data: result.result_data,
        new_summary: result_summary || result.result_summary,
        new_data: result_data,
        changed_by: staffId,
        reason: reason.trim(),
      });
    }

    // Update result
    await result.update({
      recorded_by: staffId,
      verified_by: staffId,
      verification_status,
      result_summary: result_summary || result.result_summary,
      result_data: result_data || result.result_data,
      verified_at: new Date(),
    });

    await this.logAudit("RESULT_AMENDED", order, staffId, {
      reason: reason.trim(),
      verification_status,
    });

    // Medical history log for timeline
    await db.MedicalHistoryLog.create({
      log_id: uuidv4(),
      patient_id: order.patient_id,
      appointment_id: order.appointment_id,
      sender_staff_id: staffId,
      action_type: "update",
      header_title: `Order Result Amended: ${order.title}`,
      notes: `Reason: ${reason.trim()} | Summary: ${result_summary || result.result_summary}`,
      status: "amended",
    });

    return this.getOrder(orderId);
  }
}

module.exports = new ClinicalOrderService();
