"use strict";

const express = require("express");
const router = express.Router({ mergeParams: true }); // Important if we nest it under appointments
const controller = require("../../controllers/workflowExecutionController");
const authMiddleware = require("../../middlewares/authMiddleware");

router.use(authMiddleware.authenticateToken);

router.post("/start", controller.startWorkflow);
router.get("/", controller.getWorkflowState);
router.post("/steps/:step_instance_id/complete", controller.completeStep);
router.post("/steps/:step_instance_id/forward", controller.forwardStep);

module.exports = router;
