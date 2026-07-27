"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const notificationService = require("./notificationService");
const auditService = require("./auditService");

class ExecutionQueueService {
  /**
   * List active execution queues with filtering.
   */
  async listQueues(query = {}) {
    const { queue_type, department_id, is_active = true } = query;
    const where = {};
    if (is_active !== undefined) where.is_active = is_active === "true" || is_active === true;
    if (queue_type) where.queue_type = queue_type;
    if (department_id) where.department_id = department_id;

    return db.ExecutionQueue.findAll({
      where,
      include: [
        {
          model: db.Department,
          as: "department",
          attributes: ["department_id", "name", "code"],
        },
      ],
      order: [["priority", "ASC"], ["queue_name", "ASC"]],
    });
  }

  /**
   * Get queue by ID or code.
   */
  async getQueueById(queueId) {
    const queue = await db.ExecutionQueue.findByPk(queueId, {
      include: [
        {
          model: db.Department,
          as: "department",
          attributes: ["department_id", "name", "code"],
        },
      ],
    });
    if (!queue) {
      const err = new Error("Execution Queue not found");
      err.status = 404;
      throw err;
    }
    return queue;
  }

  /**
   * Seed/Create default execution queue if missing.
   */
  async ensureQueue({ queue_code, queue_name, queue_type = "DEPARTMENT", department_id = null }) {
    let queue = await db.ExecutionQueue.findOne({ where: { queue_code } });
    if (!queue) {
      queue = await db.ExecutionQueue.create({
        queue_id: uuidv4(),
        queue_code,
        queue_name,
        queue_type,
        department_id,
        is_active: true,
        is_claimable: true,
        priority: 10,
        sla_minutes: 60,
      });
    }
    return queue;
  }

  /**
   * Claim a task from an execution queue.
   */
  async claimTask(taskId, staffId) {
    const task = await db.WorkflowTask.findByPk(taskId, {
      include: [{ model: db.ExecutionQueue, as: "executionQueue" }],
    });

    if (!task) {
      const err = new Error("Workflow task not found");
      err.status = 404;
      throw err;
    }

    if (task.status === "completed" || task.status === "cancelled") {
      const err = new Error(`Task is already ${task.status}`);
      err.status = 400;
      throw err;
    }

    if (task.claimed_by_staff_id && task.claimed_by_staff_id !== staffId) {
      const err = new Error("Task is already claimed by another staff member");
      err.status = 409;
      throw err;
    }

    await task.update({
      claimed_by_staff_id: staffId,
      claimed_at: new Date(),
      status: "in_progress",
    });

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "EXECUTION_QUEUE_CLAIMED",
        resourceType: "WorkflowTask",
        resourceId: taskId,
        details: { appointment_id: task.appointment_id, queue_id: task.execution_queue_id },
      });
    }

    return task.reload({
      include: [
        { model: db.User, as: "claimedByStaff", attributes: ["user_id", "full_name", "email"] },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
        { model: db.ExecutionQueue, as: "executionQueue" },
      ],
    });
  }

  /**
   * Release a claimed task back to the execution queue pool.
   */
  async releaseTask(taskId, staffId, reason = null) {
    const task = await db.WorkflowTask.findByPk(taskId);

    if (!task) {
      const err = new Error("Workflow task not found");
      err.status = 404;
      throw err;
    }

    if (task.claimed_by_staff_id !== staffId) {
      const err = new Error("You can only release tasks claimed by yourself");
      err.status = 403;
      throw err;
    }

    await task.update({
      claimed_by_staff_id: null,
      claimed_at: null,
      status: "pending",
    });

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "EXECUTION_QUEUE_RELEASED",
        resourceType: "WorkflowTask",
        resourceId: taskId,
        details: { reason, appointment_id: task.appointment_id },
      });
    }

    return task.reload();
  }

  /**
   * Transfer a task to a different Execution Queue.
   */
  async transferTask(taskId, targetQueueId, staffId, notes = null) {
    const task = await db.WorkflowTask.findByPk(taskId);
    const targetQueue = await this.getQueueById(targetQueueId);

    if (!task) {
      const err = new Error("Workflow task not found");
      err.status = 404;
      throw err;
    }

    await task.update({
      execution_queue_id: targetQueue.queue_id,
      claimed_by_staff_id: null,
      claimed_at: null,
      status: "pending",
    });

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "EXECUTION_QUEUE_TRANSFERRED",
        resourceType: "WorkflowTask",
        resourceId: taskId,
        details: { target_queue_id: targetQueueId, notes },
      });
    }

    return task.reload({ include: [{ model: db.ExecutionQueue, as: "executionQueue" }] });
  }

  /**
   * Escalate a task priority/SLA.
   */
  async escalateTask(taskId, staffId, reason = null) {
    const task = await db.WorkflowTask.findByPk(taskId);

    if (!task) {
      const err = new Error("Workflow task not found");
      err.status = 404;
      throw err;
    }

    await task.update({
      assignment_type: "ESCALATED",
      sla_due_at: new Date(Date.now() + 15 * 60 * 1000), // 15 min urgent SLA
    });

    if (auditService?.logAudit) {
      await auditService.logAudit({
        actorUserId: staffId,
        action: "EXECUTION_QUEUE_ESCALATED",
        resourceType: "WorkflowTask",
        resourceId: taskId,
        details: { reason },
      });
    }

    return task;
  }
}

module.exports = new ExecutionQueueService();
