"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/clinical/timelineController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/patient/:patientId", controller.listEvents);
router.post("/emit", controller.emitEvent);

module.exports = router;
