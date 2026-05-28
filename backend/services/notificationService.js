"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");

function getSocketIo() {
  try {
    const { io, onlineUsers } = require("../app");
    return { io, onlineUsers };
  } catch {
    return { io: null, onlineUsers: null };
  }
}

async function notifyInternalUser(userId, { title, message, relatedType, relatedId }) {
  const notification = await db.Notification.create({
    notification_id: uuidv4(),
    recipient_id: userId,
    recipient_type: "internal",
    title,
    message,
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

async function listForUser(userId, { unreadOnly = false } = {}) {
  const where = { recipient_id: userId, recipient_type: "internal" };
  if (unreadOnly) where.is_read = false;

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
  notifyInternalUser,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
};
