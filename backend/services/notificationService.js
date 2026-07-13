"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const NOTIFICATION_CATEGORIES = {
  SYSTEM: "system",
  LOGS: "logs",
  APPOINTMENTS: "appointments",
  WORKFLOW: "workflow",
  FINANCE: "finance",
};

function normalizeCategory(value) {
  const v = String(value || "").toLowerCase();
  if (
    v === NOTIFICATION_CATEGORIES.SYSTEM ||
    v === NOTIFICATION_CATEGORIES.LOGS ||
    v === NOTIFICATION_CATEGORIES.APPOINTMENTS ||
    v === NOTIFICATION_CATEGORIES.WORKFLOW ||
    v === NOTIFICATION_CATEGORIES.FINANCE
  ) {
    return v;
  }
  return null;
}

function inferCategoryFromRelatedType(relatedType) {
  const rt = String(relatedType || "").toLowerCase();
  if (rt === "appointment") return NOTIFICATION_CATEGORIES.APPOINTMENTS;
  if (
    rt === "workflow" ||
    rt === "medical_history" ||
    rt === "workflow_task"
  ) {
    return NOTIFICATION_CATEGORIES.WORKFLOW;
  }
  if (rt === "log" || rt === "logs" || rt === "audit" || rt === "audit_log") {
    return NOTIFICATION_CATEGORIES.LOGS;
  }
  if (rt === "billing_collection" || rt === "cashier_payment") {
    return NOTIFICATION_CATEGORIES.FINANCE;
  }
  return NOTIFICATION_CATEGORIES.SYSTEM;
}

function getSocketIo() {
  try {
    const { io, onlineUsers } = require("../app");
    return { io, onlineUsers };
  } catch {
    return { io: null, onlineUsers: null };
  }
}

async function notifyInternalUser(
  userId,
  { title, message, category, relatedType, relatedId }
) {
  const resolvedCategory =
    normalizeCategory(category) || inferCategoryFromRelatedType(relatedType);

  const notification = await db.Notification.create({
    notification_id: uuidv4(),
    recipient_id: userId,
    recipient_type: "internal",
    title,
    message,
    category: resolvedCategory,
    related_entity_type: relatedType || null,
    related_entity_id: relatedId || null,
    is_read: false,
  });

  const { io, onlineUsers } = getSocketIo();
  if (io && onlineUsers) {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit("notification", notification.get({ plain: true }));
    }
  }

  return notification;
}

async function listForUser(userId, { unreadOnly = false, category } = {}) {
  const where = { recipient_id: userId, recipient_type: "internal" };
  if (unreadOnly) where.is_read = false;
  const resolvedCategory = normalizeCategory(category);
  if (resolvedCategory) where.category = resolvedCategory;

  return db.Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: 100,
  });
}

async function unreadCount(userId) {
  return db.Notification.count({
    where: {
      recipient_id: userId,
      recipient_type: "internal",
      is_read: false,
    },
  });
}

async function markRead(notificationId, userId) {
  const row = await db.Notification.findOne({
    where: { notification_id: notificationId, recipient_id: userId },
  });
  if (!row) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }
  await row.update({ is_read: true });
  return row;
}

async function markAllRead(userId) {
  await db.Notification.update(
    { is_read: true },
    { where: { recipient_id: userId, recipient_type: "internal", is_read: false } }
  );
  return { success: true };
}

module.exports = {
  NOTIFICATION_CATEGORIES,
  notifyInternalUser,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
};
