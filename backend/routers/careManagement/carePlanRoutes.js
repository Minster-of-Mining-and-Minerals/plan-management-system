"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/careManagement/carePlanController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/appointment/:appointmentId", checkPermission("workflow", "read"), controller.getCarePlan);
router.post("/appointment/:appointmentId", checkPermission("workflow", "read"), controller.upsertCarePlan);

module.exports = router;
