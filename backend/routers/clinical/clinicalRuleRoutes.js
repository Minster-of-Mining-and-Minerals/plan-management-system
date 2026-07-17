"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/clinical/clinicalRuleController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/rules", controller.listRules);
router.put("/rules/:ruleId", controller.updateRule);
router.post("/evaluate", controller.evaluateRules);

router.get("/allergies/patient/:patientId", controller.listAllergies);
router.post("/allergies", controller.createAllergy);

module.exports = router;
