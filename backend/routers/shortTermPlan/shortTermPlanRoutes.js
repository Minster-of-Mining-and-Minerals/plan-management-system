"use strict";

const express = require("express");
const router = express.Router();
const shortTermPlanController = require("../../controllers/shortTermPlan/shortTermPlanController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/", checkPermission("short_term_plan", "view"), shortTermPlanController.listPlans);
router.get("/configurations", checkPermission("short_term_plan", "view"), shortTermPlanController.listConfigurations);
router.post("/configurations", checkPermission("short_term_plan", "create"), shortTermPlanController.createConfiguration);
router.put("/configurations/:configurationId", checkPermission("short_term_plan", "edit"), shortTermPlanController.updateConfiguration);
router.get("/analytics", checkPermission("short_term_plan", "view"), shortTermPlanController.getDashboardAnalytics);
router.get("/kpis/:kpiId", checkPermission("short_term_plan", "view"), shortTermPlanController.getKpiDetail);
router.post("/", checkPermission("short_term_plan", "create"), shortTermPlanController.createPlan);
router.get("/:planId", checkPermission("short_term_plan", "view"), shortTermPlanController.getPlanDetail);
router.put("/:planId", checkPermission("short_term_plan", "edit"), shortTermPlanController.updatePlan);
router.delete("/:planId", checkPermission("short_term_plan", "delete"), shortTermPlanController.deletePlan);
router.post("/:planId/duplicate", checkPermission("short_term_plan", "create"), shortTermPlanController.duplicatePlan);
router.post("/:planId/kpis", checkPermission("short_term_plan", "create"), shortTermPlanController.addKpi);
router.put("/kpis/:kpiId", checkPermission("short_term_plan", "edit"), shortTermPlanController.updateKpi);
router.delete("/kpis/:kpiId", checkPermission("short_term_plan", "delete"), shortTermPlanController.deleteKpi);
router.post("/kpis/:kpiId/assign", checkPermission("short_term_plan", "assign"), shortTermPlanController.assignKpi);
router.put("/assignments/:assignmentId", checkPermission("short_term_plan", "assign"), shortTermPlanController.updateAssignment);
router.post("/assignments/:assignmentId/reports", checkPermission("short_term_plan", "report"), shortTermPlanController.submitPeriodReport);

module.exports = router;
