"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/notification/notificationController");
const {
  authenticateToken,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", controller.listMine);
router.get("/unread-count", controller.unreadCount);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", controller.markRead);

module.exports = router;
