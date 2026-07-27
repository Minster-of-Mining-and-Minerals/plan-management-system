"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/clinical/patientLocationController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/locations", checkPermission("workflow", "read"), controller.listLocations);
router.post("/assign", checkPermission("workflow", "read"), controller.assignLocation);
router.get("/appointment/:appointmentId/history", checkPermission("workflow", "read"), controller.getLocationHistory);

module.exports = router;
