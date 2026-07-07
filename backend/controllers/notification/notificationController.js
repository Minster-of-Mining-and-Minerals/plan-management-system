"use strict";

const { Notification, NotificationTemplate, sequelize } = require("../../models");
const { v4: uuidv4, validate: isUuid } = require("uuid");
const { Op } = require("sequelize");
const { sendNotification } = require("../../utils/notification");

const getNotifications = async (req, res) => {
  try {
    const { category, unread_only } = req.query;
    const where = { recipient_id: req.user.user_id };

    if (category) where.category = category;
    if (unread_only === "true") where.is_read = false;

    const notifications = await Notification.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        recipient_id: req.user.user_id,
        is_read: false,
      },
    });

    return res.json({ success: true, data: { count } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getNotificationTemplates = async (req, res) => {
  try {
    const templates = await NotificationTemplate.findAll({
      where: { is_active: true },
      order: [
        ["category", "ASC"],
        ["template_code", "ASC"],
      ],
    });

    return res.json({ success: true, data: templates });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (!isUuid(id)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }

    const notification = await Notification.findOne({
      where: {
        notification_id: id,
        recipient_id: req.user.user_id,
      },
      transaction: t,
    });

    if (!notification) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (!notification.is_read) {
      await notification.update({ is_read: true }, { transaction: t });
    }

    await t.commit();
    return res.json({ success: true, data: notification });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { category } = req.body || {};
    const where = {
      recipient_id: req.user.user_id,
      is_read: false,
    };

    if (category) where.category = category;

    await Notification.update(
      { is_read: true },
      { where, transaction: t }
    );

    await t.commit();
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const forwardDocumentNotification = async (req, res) => {
  try {
    const {
      recipient_user_id: recipientUserId,
      document_id: documentId,
      document_title: documentTitle,
      message,
      sender_name: senderName,
      link_path: linkPath,
    } = req.body || {};

    if (!isUuid(recipientUserId) || !isUuid(documentId)) {
      return res.status(400).json({
        success: false,
        message: "recipient_user_id and document_id are required",
      });
    }

    const title = `${senderName || "Someone"} forwarded a document to you`;
    const body =
      message ||
      `Open "${documentTitle || "Document"}" shared with you.`;

    let io = null;
    try {
      io = require("../../app").io;
    } catch {
      io = null;
    }

    const notifications = await sendNotification(
      [{ user_id: recipientUserId }],
      {
        category: "documents",
        notification_type: "document_forwarded",
        title,
        message: body,
        related_entity_type: "document",
        related_entity_id: documentId,
        link_path: linkPath || `/documents/${documentId}`,
        icon_variant: "file",
        priority: "normal",
        metadata: {
          document_id: documentId,
          document_title: documentTitle || null,
          forwarded_by: req.user.user_id,
        },
      },
      io
    );

    return res.status(201).json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getNotificationTemplates,
  markNotificationRead,
  markAllNotificationsRead,
  forwardDocumentNotification,
};
