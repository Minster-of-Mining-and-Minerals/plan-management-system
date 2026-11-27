"use strict";

const express = require("express");
const router = express.Router();
const shortTermPlanController = require("../../controllers/shortTermPlan/shortTermPlanController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/", shortTermPlanController.listPlans);
router.post("/", shortTermPlanController.createPlan);
router.get("/:planId", shortTermPlanController.getPlanDetail);
router.post("/:planId/kpis", shortTermPlanController.addKpi);
router.post("/kpis/:kpiId/assign", shortTermPlanController.assignKpi);
router.post("/assignments/:assignmentId/reports", shortTermPlanController.submitPeriodReport);

module.exports = router;
