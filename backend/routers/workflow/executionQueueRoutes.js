"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/workflow/executionQueueController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/queues", checkPermission("workflow", "read"), controller.listQueues);
router.get("/queues/:queueId", checkPermission("workflow", "read"), controller.getQueue);
router.post("/tasks/:taskId/claim", checkPermission("workflow", "read"), controller.claimTask);
router.post("/tasks/:taskId/release", checkPermission("workflow", "read"), controller.releaseTask);
router.post("/tasks/:taskId/transfer", checkPermission("workflow", "read"), controller.transferTask);
router.post("/tasks/:taskId/escalate", checkPermission("workflow", "read"), controller.escalateTask);

module.exports = router;
