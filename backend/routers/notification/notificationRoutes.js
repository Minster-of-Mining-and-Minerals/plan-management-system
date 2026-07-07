const express = require("express");
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  getNotificationTemplates,
  markNotificationRead,
  markAllNotificationsRead,
  forwardDocumentNotification,
} = require("../../controllers/notification/notificationController");

const {
  validateGetNotificationsQuery,
  validateMarkAllRead,
  validateIdParam,
} = require("../../validators/notificationValidator");

const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/", validateGetNotificationsQuery, getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/templates", getNotificationTemplates);
router.patch("/read-all", validateMarkAllRead, markAllNotificationsRead);
router.post("/document-forward", forwardDocumentNotification);
router.patch("/:id/read", validateIdParam, markNotificationRead);

module.exports = router;
