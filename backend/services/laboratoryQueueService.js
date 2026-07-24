"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class LaboratoryQueueService {
  /**
   * Helper to log audit events.
   */
  async logAudit(action, resourceId, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "LaboratoryQueue",
        resourceId,
        details,
      });
    }
  }

  /**
   * Create a new work queue item.
   */
  async createQueueItem(params, staffId = null) {
    const { order_id, specimen_id, queue_type, priority = "ROUTINE", department_id } = params;

    if (!order_id || !queue_type) {
      const err = new Error("order_id and queue_type are required");
      err.status = 400;
      throw err;
    }

    const order = await db.ClinicalOrder.findByPk(order_id);
    const resolvedPriority = order ? order.priority || priority : priority;
    const resolvedDept = order ? order.assigned_department_id || department_id : department_id;

    const item = await db.LaboratoryWorkQueueItem.create({
      id: uuidv4(),
      order_id,
      specimen_id: specimen_id || null,
      queue_type,
      status: "WAITING",
      priority: resolvedPriority,
      department_id: resolvedDept || null,
      entered_at: new Date(),
    });

    if (staffId) {
      await this.logAudit("LAB_QUEUE_CREATED", item.id, staffId, {
        order_id,
        queue_type,
        priority: resolvedPriority,
      });
    }

    return item.get({ plain: true });
  }

  /**
   * Fetch active laboratory work queue sorted by priority and age.
   * Priority order: STAT (1) > URGENT (2) > ROUTINE (3).
   * Secondary sort: entered_at ASC (Oldest First).
   */
  async getQueue({ queue_type, status = "WAITING", department_id } = {}) {
    const where = {};
    if (queue_type) where.queue_type = queue_type;
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;

    const items = await db.LaboratoryWorkQueueItem.findAll({
      where,
      include: [
        {
          model: db.ClinicalOrder,
          as: "order",
          include: [
            { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
            { model: db.User, as: "orderedByUser", attributes: ["user_id", "full_name"] },
          ],
        },
        {
          model: db.LaboratorySpecimen,
          as: "specimen",
        },
        {
          model: db.User,
          as: "assignedStaff",
          attributes: ["user_id", "full_name"],
        },
      ],
      order: [["entered_at", "ASC"]],
    });

    const plainItems = items.map((i) => i.get({ plain: true }));

    // Priority sorting STAT (1) > URGENT (2) > ROUTINE (3)
    const priorityWeight = { STAT: 1, URGENT: 2, ROUTINE: 3 };

    return plainItems.sort((a, b) => {
      const weightA = priorityWeight[a.priority] || 99;
      const weightB = priorityWeight[b.priority] || 99;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime();
    });
  }

  /**
   * Get worklist assigned to current staff member.
   */
  async getStaffWorklist(staffId) {
    const items = await db.LaboratoryWorkQueueItem.findAll({
      where: {
        assigned_staff_id: staffId,
        status: ["CLAIMED", "IN_PROGRESS"],
      },
      include: [
        {
          model: db.ClinicalOrder,
          as: "order",
          include: [
            { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
          ],
        },
        { model: db.LaboratorySpecimen, as: "specimen" },
      ],
      order: [["entered_at", "ASC"]],
    });

    return items.map((i) => i.get({ plain: true }));
  }

  /**
   * Claim a waiting queue item.
   */
  async claimQueueItem(queueItemId, staffId) {
    const item = await db.LaboratoryWorkQueueItem.findByPk(queueItemId);
    if (!item) {
      const err = new Error("Work queue item not found");
      err.status = 404;
      throw err;
    }

    if (item.status !== "WAITING") {
      const err = new Error(`Cannot claim queue item in status ${item.status}`);
      err.status = 400;
      throw err;
    }

    await item.update({
      status: "CLAIMED",
      assigned_staff_id: staffId,
      claimed_at: new Date(),
    });

    await this.logAudit("LAB_WORK_CLAIMED", queueItemId, staffId, {
      order_id: item.order_id,
      queue_type: item.queue_type,
    });

    return item.get({ plain: true });
  }

  /**
   * Start processing a claimed queue item.
   */
  async startQueueItem(queueItemId, staffId) {
    const item = await db.LaboratoryWorkQueueItem.findByPk(queueItemId);
    if (!item) {
      const err = new Error("Work queue item not found");
      err.status = 404;
      throw err;
    }

    if (item.assigned_staff_id && item.assigned_staff_id !== staffId) {
      const err = new Error("Cannot start work item claimed by another staff member");
      err.status = 403;
      throw err;
    }

    if (item.status !== "CLAIMED") {
      const err = new Error(`Cannot start queue item in status ${item.status}`);
      err.status = 400;
      throw err;
    }

    await item.update({ status: "IN_PROGRESS" });

    await this.logAudit("LAB_WORK_STARTED", queueItemId, staffId, {
      order_id: item.order_id,
      queue_type: item.queue_type,
    });

    return item.get({ plain: true });
  }

  /**
   * Complete work on a queue item.
   */
  async completeQueueItem(queueItemId, staffId) {
    const item = await db.LaboratoryWorkQueueItem.findByPk(queueItemId);
    if (!item) {
      const err = new Error("Work queue item not found");
      err.status = 404;
      throw err;
    }

    if (item.status !== "IN_PROGRESS" && item.status !== "CLAIMED") {
      const err = new Error(`Cannot complete queue item in status ${item.status}`);
      err.status = 400;
      throw err;
    }

    await item.update({
      status: "COMPLETED",
      completed_at: new Date(),
    });

    await this.logAudit("LAB_WORK_COMPLETED", queueItemId, staffId, {
      order_id: item.order_id,
      queue_type: item.queue_type,
    });

    return item.get({ plain: true });
  }

  /**
   * Transition work queue to next operational stage.
   */
  async transitionQueueStage(orderId, specimenId, nextQueueType, staffId = null) {
    // Close existing active queue items for this order
    const activeItems = await db.LaboratoryWorkQueueItem.findAll({
      where: {
        order_id: orderId,
        status: ["WAITING", "CLAIMED", "IN_PROGRESS"],
      },
    });

    for (const item of activeItems) {
      await item.update({
        status: "COMPLETED",
        completed_at: new Date(),
      });
    }

    // If a next stage is requested, open a new queue item
    if (nextQueueType) {
      const order = await db.ClinicalOrder.findByPk(orderId);
      return await this.createQueueItem(
        {
          order_id: orderId,
          specimen_id: specimenId || null,
          queue_type: nextQueueType,
          priority: order ? order.priority : "ROUTINE",
          department_id: order ? order.assigned_department_id : null,
        },
        staffId
      );
    }
  }
}

module.exports = new LaboratoryQueueService();
