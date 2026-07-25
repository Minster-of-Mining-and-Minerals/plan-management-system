"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const notificationService = require("../notificationService");

class ClinicalTaskService {
  async createTask({ patient_id, plan_id = null, alert_id = null, title, description, assigned_to, priority = "MEDIUM", due_date }, assignedBy) {
    if (!patient_id || !title || !assigned_to || !assignedBy) {
      throw Object.assign(new Error("patient_id, title, assigned_to, and assignedBy are required"), { status: 400 });
    }

    const task = await db.ClinicalTask.create({
      task_id: uuidv4(),
      patient_id,
      plan_id: plan_id || null,
      alert_id: alert_id || null,
      title: title.trim(),
      description: description || null,
      assigned_to,
      assigned_by: assignedBy,
      status: "OPEN",
      priority: (priority || "MEDIUM").toUpperCase(),
      due_date: due_date || null,
    });

    // Notify assigned clinician
    try {
      await notificationService.notifyInternalUser(assigned_to, {
        title: "New Clinical Task Assigned",
        message: `You have been assigned a clinical task: "${title}". Priority: ${priority}.`,
        category: "workflow",
        relatedType: "clinical_task",
        relatedId: task.task_id,
      });
    } catch (notifErr) {
      console.error("Failed to notify task assignee:", notifErr.message);
    }

    return task.get({ plain: true });
  }

  async acceptTask(taskId, userId) {
    return this._updateTaskStatus(taskId, "ACCEPTED", userId);
  }

  async completeTask(taskId, userId) {
    const task = await db.ClinicalTask.findByPk(taskId);
    if (!task) throw Object.assign(new Error("Clinical task not found"), { status: 404 });
    await task.update({ status: "COMPLETED", completed_at: new Date() });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "CLINICAL_TASK_COMPLETED",
      domain: "GENERAL",
      entity_type: "ClinicalTask",
      entity_id: taskId,
      patient_id: task.patient_id,
      actor_id: userId,
      action: "COMPLETE_TASK",
      new_value: { status: "COMPLETED" },
    });

    return task.get({ plain: true });
  }

  async markOverdueTasks() {
    const now = new Date();
    const [affectedCount] = await db.ClinicalTask.update(
      { status: "OVERDUE" },
      { where: { status: { [Op.in]: ["OPEN", "ACCEPTED"] }, due_date: { [Op.lt]: now } } }
    );
    return { marked_overdue: affectedCount };
  }

  async getTasksForPatient(patientId, statusFilter = null) {
    const where = { patient_id: patientId };
    if (statusFilter) where.status = statusFilter.toUpperCase();

    const tasks = await db.ClinicalTask.findAll({
      where,
      include: [
        { model: db.User, as: "assignee", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "assigner", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });
    return tasks.map((t) => t.get({ plain: true }));
  }

  async _updateTaskStatus(taskId, newStatus, userId) {
    const task = await db.ClinicalTask.findByPk(taskId);
    if (!task) throw Object.assign(new Error("Clinical task not found"), { status: 404 });
    await task.update({ status: newStatus });
    return task.get({ plain: true });
  }
}

module.exports = new ClinicalTaskService();
