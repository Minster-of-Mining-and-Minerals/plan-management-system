const { Notification } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { onlineUsers } = require("../app");

function interpolateTemplate(template, variables = {}) {
  if (!template) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : ""
  );
}

/**
 * Send in-app notifications to one or more users.
 * @param {Array<{ user_id: string }>} recipients
 * @param {object} payload
 * @param {object|null} io - Socket.IO instance
 */
const sendNotification = async (recipients, payload, io = null) => {
  try {
    const notifications = [];

    for (const recipient of recipients) {
      const userId = recipient.user_id || recipient.id;
      if (!userId) continue;

      const newNotification = await Notification.create({
        notification_id: uuidv4(),
        recipient_id: userId,
        template_code: payload.template_code || null,
        category: payload.category || "system",
        notification_type: payload.notification_type || "general",
        title: payload.title,
        message: payload.message,
        related_entity_type: payload.related_entity_type || null,
        related_entity_id: payload.related_entity_id || null,
        link_path: payload.link_path || null,
        icon_variant: payload.icon_variant || null,
        priority: payload.priority || "normal",
        metadata: payload.metadata || null,
        is_read: false,
      });

      const socketId = onlineUsers?.get?.(userId);
      if (io && socketId) {
        io.to(socketId).emit("notification", newNotification);
      }

      notifications.push(newNotification);
    }

    return notifications;
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new Error("Server error: " + error.message);
  }
};

/**
 * Build notification content from a template record and variables.
 */
const buildFromTemplate = (template, variables = {}) => ({
  template_code: template.template_code,
  category: template.category,
  notification_type: template.notification_type,
  title: interpolateTemplate(template.title_template, variables),
  message: interpolateTemplate(template.message_template, variables),
  related_entity_type: template.related_entity_type,
  related_entity_id: variables.related_entity_id || null,
  link_path: interpolateTemplate(template.default_link_path, variables),
  icon_variant: template.icon_variant,
  priority: template.priority,
  metadata: variables,
});

module.exports = { sendNotification, buildFromTemplate, interpolateTemplate };
