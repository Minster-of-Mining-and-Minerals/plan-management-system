"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const notificationService = require("./notificationService");

class ClinicalOrderService {
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
    });

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
   * Fetch a single clinical order by ID.
   */
  async getOrder(orderId) {
    const order = await db.ClinicalOrder.findByPk(orderId, {
      include: [
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
        {
          model: db.ClinicalOrderResult,
          as: "result",
          required: false,
          include: [
            {
              model: db.User,
              as: "recordedByUser",
              attributes: ["user_id", "full_name"],
            },
          ],
        },
      ],
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
          model: db.ClinicalOrderResult,
          as: "result",
          required: false,
        },
      ],
      order: [
        ["priority", "DESC"],
        ["created_at", "ASC"],
      ],
    });

    return rows.map((r) => r.get({ plain: true }));
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

    await order.update({
      assigned_staff_id: staffId,
      status: "ACCEPTED",
    });

    return this.getOrder(orderId);
  }

  /**
   * Update order status.
   */
  async updateOrderStatus(orderId, status, staffId) {
    const order = await db.ClinicalOrder.findByPk(orderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    await order.update({
      status,
      assigned_staff_id: staffId || order.assigned_staff_id,
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
}

module.exports = new ClinicalOrderService();
