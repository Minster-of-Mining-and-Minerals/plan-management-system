"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/workflowBuilderController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Ideally we'd add RBAC middlewares here
router.use(authMiddleware.authenticateToken);

router.get("/", controller.getWorkflows);
router.post("/", controller.createWorkflow);
router.get("/:id", controller.getWorkflowById);
router.post("/:id/steps", controller.addStep);
router.put("/:id/reorder", controller.reorderSteps);
router.delete("/:id/steps/:stepId", controller.deleteStep);

module.exports = router;
