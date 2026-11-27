"use strict";

const express = require("express");
const router = express.Router();
const shortTermPlanController = require("../../controllers/shortTermPlan/shortTermPlanController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/", shortTermPlanController.listPlans);
router.get("/analytics", shortTermPlanController.getDashboardAnalytics);
router.post("/", shortTermPlanController.createPlan);
router.get("/:planId", shortTermPlanController.getPlanDetail);
router.post("/:planId/kpis", shortTermPlanController.addKpi);
router.put("/kpis/:kpiId", shortTermPlanController.updateKpi);
router.delete("/kpis/:kpiId", shortTermPlanController.deleteKpi);
router.post("/kpis/:kpiId/assign", shortTermPlanController.assignKpi);
router.put("/assignments/:assignmentId", shortTermPlanController.updateAssignment);
router.post("/assignments/:assignmentId/reports", shortTermPlanController.submitPeriodReport);

module.exports = router;
