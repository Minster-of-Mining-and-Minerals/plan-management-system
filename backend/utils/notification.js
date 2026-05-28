const { Notification } = require("../models");
const { v4: uuidv4 } = require("uuid");
const { onlineUsers } = require("../app"); 

const resolveCategory = (category, related) => {
  const direct = String(category || "").toLowerCase();
  if (direct === "system" || direct === "logs" || direct === "appointments") {
    return direct;
  }
  const rt = String(related?.type || "").toLowerCase();
  if (rt === "appointment") return "appointments";
  if (rt === "log" || rt === "logs" || rt === "audit" || rt === "audit_log") return "logs";
  return "system";
};

const sendNotification = async (
  recipients,
  title,
  message,
  io,
  related = null,
  category = null
) => {
  try {
    const notifications = [];

    for (const recipient of recipients) {
      const newNotification = await Notification.create({
        notification_id: uuidv4(),
        recipient_id: recipient.id,
        recipient_type: recipient.type,
        title,
        message,
        category: resolveCategory(category, related),
        related_entity_type: related?.type || null,
        related_entity_id: related?.id || null,
        is_read: false,
        created_at: new Date(),
      });

      // Emit real-time notification if user is online
      const socketId = onlineUsers.get(recipient.id);
      if (socketId) {
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

module.exports = { sendNotification };
