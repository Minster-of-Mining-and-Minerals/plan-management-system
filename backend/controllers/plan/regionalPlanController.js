"use strict";

const regionalPlanService = require("../../services/regionalPlanService");
const { assertRegionAccessible } = require("../../utils/structureScopeUtils");

function resolveEffectiveRegionId(req) {
  let regionId = req.params.regionId || req.query.region_id || req.body.region_id;

  if (req.user?.is_regional || req.user?.region_id) {
    const userRegionId = req.user.region_id;
    if (regionId && regionId !== userRegionId) {
      const error = new Error("Access denied: cannot access another region's planning records");
      error.status = 403;
      throw error;
    }
    regionId = userRegionId;
  }

  if (!regionId) {
    const error = new Error("region_id is required");
    error.status = 400;
    throw error;
  }

  return regionId;
}

// -------------------------------------------------------------
// Configuration & Rules Handlers
// -------------------------------------------------------------

async function getPlanningConfigHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getEffectiveRegionalPlanningConfig(regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanningConfigHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanningConfig(regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function restoreDefaultPlanningConfigHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.restoreDefaultRegionalPlanningConfig(regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanningConfigForVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanningConfigForVersion(req.params.id, regionId);
    if (!data) return res.status(404).json({ success: false, message: "Planning configuration not found for version" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanningConfigForVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanningConfigForVersion(req.params.id, regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listPlanRulesHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.listRegionalPlanRules(regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanRuleByIdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanRuleById(req.params.id, regionId);
    if (!data) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanRuleHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "create");
    const data = await regionalPlanService.createRegionalPlanRule(regionId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanRuleHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanRule(req.params.id, regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanRuleHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "delete");
    await regionalPlanService.deleteRegionalPlanRule(req.params.id, regionId);
    res.json({ success: true, message: "Plan rule deleted successfully" });
  } catch (err) {
    next(err);
  }
}

async function getPlanRuleForVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanRuleForVersion(req.params.id, regionId);
    if (!data) return res.status(404).json({ success: false, message: "Plan rule not found for version" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanRuleForVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanRuleForVersion(req.params.id, regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Regional Performance Color Threshold Handlers
// -------------------------------------------------------------

async function listPerformanceColorThresholdsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.listRegionalPerformanceColorThresholds(regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPerformanceColorThresholdByIdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPerformanceColorThresholdById(req.params.id, regionId);
    if (!data) return res.status(404).json({ success: false, message: "Threshold not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPerformanceColorThresholdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "create");
    const data = await regionalPlanService.createRegionalPerformanceColorThreshold(regionId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePerformanceColorThresholdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPerformanceColorThreshold(req.params.id, regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePerformanceColorThresholdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "delete");
    await regionalPlanService.deleteRegionalPerformanceColorThreshold(req.params.id, regionId);
    res.json({ success: true, message: "Performance color threshold deleted successfully" });
  } catch (err) {
    next(err);
  }
}

async function resolvePerformanceColorHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const percentage = req.query.percentage !== undefined ? req.query.percentage : req.body?.percentage;
    const data = await regionalPlanService.resolveRegionalPerformanceColor(regionId, percentage);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Regional Plan Review Handlers
// -------------------------------------------------------------

async function getPlanVersionsForReviewHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanVersionsForReview(regionId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPublishForReviewReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPublishForReviewReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function publishForReviewHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.publishRegionalPlanForReview(req.params.id, regionId, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function unlockReviewCorrectionsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.unlockRegionalPlanReviewCorrections(req.params.id, regionId, req, req.body?.reason);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function republishForReviewHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.republishRegionalPlanForReview(req.params.id, regionId, req);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getCompleteReviewReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalCompleteReviewReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function completeReviewHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "finalize");
    const data = await regionalPlanService.completeRegionalPlanReview(req.params.id, regionId, req, req.body?.decision);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanReviewDashboardHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanReviewDashboard(req.params.id, regionId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Plan Versions Handlers
// -------------------------------------------------------------

async function listPlanVersionsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.listRegionalPlanVersions(regionId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanVersionByIdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanVersionById(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanDraftHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "create");
    const data = await regionalPlanService.createRegionalPlanDraft(regionId, req.body, req.user?.user_id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanVersion(req.params.id, regionId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanVersionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "delete");
    await regionalPlanService.deleteRegionalPlanVersion(req.params.id, regionId);
    res.json({ success: true, message: "Regional plan version deleted successfully" });
  } catch (err) {
    next(err);
  }
}

async function duplicatePlanDraftHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "create");
    const data = await regionalPlanService.duplicateRegionalPlanDraft(req.params.id, regionId, req.body, req.user?.user_id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Hierarchy & Nodes Handlers
// -------------------------------------------------------------

async function getPlanHierarchyHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanHierarchy(req.params.id, regionId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanNodeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "create");
    const versionId = req.body.regional_plan_version_id || req.params.versionId;
    if (!versionId) return res.status(400).json({ success: false, message: "regional_plan_version_id is required" });
    const data = await regionalPlanService.createRegionalPlanNode(versionId, regionId, req.body, req.user?.user_id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanNodeByIdHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanNodeById(req.params.id, regionId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanNodeAchievementHistoryHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPlanNodeAchievementHistory(req.params.id, regionId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanNodeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPlanNode(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanNodeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "delete");
    await regionalPlanService.deleteRegionalPlanNode(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, message: "Node deleted successfully" });
  } catch (err) {
    next(err);
  }
}

async function reorderPlanNodesHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const { version_id, ordered_node_ids } = req.body;
    await regionalPlanService.reorderRegionalPlanNodes(version_id, regionId, ordered_node_ids, req.user?.user_id);
    res.json({ success: true, message: "Nodes reordered successfully" });
  } catch (err) {
    next(err);
  }
}

async function assignPlanNodeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.assignRegionalPlanNode(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function removePlanNodeAssignmentHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.removeRegionalPlanNodeAssignment(
      req.params.id,
      req.params.assignment_id,
      regionId,
      req.user?.user_id
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Finalization & Lifecycle Handlers
// -------------------------------------------------------------

async function getDraftFinalizationReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalDraftFinalizationReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizePlanDraftHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.finalizeRegionalPlanDraft(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Regional plan draft finalized and annual plans initialized" });
  } catch (err) {
    next(err);
  }
}

async function reopenPlanDraftHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.reopenRegionalPlanDraftForEdit(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Plan reopened for edit" });
  } catch (err) {
    next(err);
  }
}

async function getStartProcessReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalStartProcessReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function startPlanProcessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.startRegionalPlanProcess(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Regional planning execution process started successfully" });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Annual & Period Planning Handlers
// -------------------------------------------------------------

async function listAnnualVersionsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.listRegionalAnnualVersions(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAnnualTargetAllocationsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalAnnualTargetAllocations(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateAnnualTargetHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalAnnualTarget(req.params.id, regionId, req.body.annual_target, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAnnualExecutionReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalAnnualExecutionReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizeAnnualExecutionHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.finalizeRegionalAnnualExecution(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Annual targets finalized" });
  } catch (err) {
    next(err);
  }
}

async function distributeAnnualTargetsEquallyHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.distributeRegionalAnnualTargetsEqually(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Annual targets distributed equally across years" });
  } catch (err) {
    next(err);
  }
}

async function lockAnnualPlanHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.lockRegionalAnnualPlan(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function unlockAnnualPlanHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.unlockRegionalAnnualPlan(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function completeAnnualPlanHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.completeRegionalAnnualPlan(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listExecutionPeriodsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.listRegionalExecutionPeriods(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function initializeExecutionPeriodsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const { subdivision_mode, custom_periods } = req.body;
    const data = await regionalPlanService.initializeRegionalExecutionPeriods(
      req.params.id,
      regionId,
      subdivision_mode,
      custom_periods,
      req.user?.user_id
    );
    res.json({ success: true, data, message: "Execution periods initialized" });
  } catch (err) {
    next(err);
  }
}

async function getPeriodTargetAllocationsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPeriodTargetAllocations(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePeriodTargetHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPeriodTarget(req.params.id, regionId, req.body.period_target, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPeriodFinalizationReadinessHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalPeriodFinalizationReadiness(req.params.id, regionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizePeriodTargetsHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.finalizeRegionalPeriodTargets(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Execution period targets finalized" });
  } catch (err) {
    next(err);
  }
}

async function distributePeriodTargetsEquallyHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.distributeRegionalPeriodTargetsEqually(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data, message: "Period targets distributed equally across execution periods" });
  } catch (err) {
    next(err);
  }
}

async function completeExecutionPeriodHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.completeRegionalExecutionPeriod(req.params.id, regionId, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Execution Reporting & Achievements Handlers
// -------------------------------------------------------------

async function updatePeriodActualHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.updateRegionalPeriodActual(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function submitAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.submitRegionalAchievement(req.params.id, regionId, req.body, req.user);
    res.json({ success: true, data, message: "Achievement submitted for department review" });
  } catch (err) {
    next(err);
  }
}

async function approveAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.approveRegionalAchievement(req.params.id, regionId, req.body, req.user);
    res.json({ success: true, data, message: "Achievement approved and pending validation" });
  } catch (err) {
    next(err);
  }
}

async function rejectAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.rejectRegionalAchievement(req.params.id, regionId, req.body.comment, req.user);
    res.json({ success: true, data, message: "Achievement rejected" });
  } catch (err) {
    next(err);
  }
}

async function validateAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.validateRegionalAchievement(req.params.id, regionId, req.body, req.user);
    res.json({ success: true, data, message: "Achievement validated and locked" });
  } catch (err) {
    next(err);
  }
}

async function rejectValidationAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.rejectValidationRegionalAchievement(req.params.id, regionId, req.body.comment, req.user);
    res.json({ success: true, data, message: "Validation rejected" });
  } catch (err) {
    next(err);
  }
}

async function getAchievementWorkflowScopeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const result = await regionalPlanService.resolveRegionalAchievementWorkflowScope(req.params.id, regionId, req.user);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    next(err);
  }
}

async function submitAnnualAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.submitRegionalAnnualAchievement(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data, message: "Annual achievement submitted for review" });
  } catch (err) {
    next(err);
  }
}

async function approveAnnualAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.approveRegionalAnnualAchievement(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data, message: "Annual achievement approved" });
  } catch (err) {
    next(err);
  }
}

async function rejectAnnualAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.rejectRegionalAnnualAchievement(req.params.id, regionId, req.body.comment, req.user?.user_id);
    res.json({ success: true, data, message: "Annual achievement rejected" });
  } catch (err) {
    next(err);
  }
}

async function validateAnnualAchievementHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "update");
    const data = await regionalPlanService.validateRegionalAnnualAchievement(req.params.id, regionId, req.body, req.user?.user_id);
    res.json({ success: true, data, message: "Annual achievement validated" });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Dashboard & Analytics Handlers
// -------------------------------------------------------------

async function getExecutionDashboardSummaryHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const data = await regionalPlanService.getRegionalExecutionDashboardSummary(regionId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getExecutionDashboardProgressTreeHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const planVersionId = req.query.plan_version_id || req.query.master_plan_version_id || req.params.versionId;
    const periodVersionId = req.query.period_version_id;
    const data = await regionalPlanService.getRegionalExecutionDashboardProgressTree(regionId, planVersionId, periodVersionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getExecutionDashboardDepartmentUserHandler(req, res, next) {
  try {
    const regionId = resolveEffectiveRegionId(req);
    assertRegionAccessible(req, regionId, "read");
    const planVersionId = req.query.plan_version_id || req.query.master_plan_version_id || req.params.versionId;
    const data = await regionalPlanService.getRegionalExecutionDashboardDepartmentUser(regionId, planVersionId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Config & Rules
  getPlanningConfigHandler,
  updatePlanningConfigHandler,
  restoreDefaultPlanningConfigHandler,
  getPlanningConfigForVersionHandler,
  updatePlanningConfigForVersionHandler,
  listPlanRulesHandler,
  getPlanRuleByIdHandler,
  getPlanRuleForVersionHandler,
  updatePlanRuleForVersionHandler,
  createPlanRuleHandler,
  updatePlanRuleHandler,
  deletePlanRuleHandler,

  // Performance Color Thresholds
  listPerformanceColorThresholdsHandler,
  getPerformanceColorThresholdByIdHandler,
  createPerformanceColorThresholdHandler,
  updatePerformanceColorThresholdHandler,
  deletePerformanceColorThresholdHandler,
  resolvePerformanceColorHandler,

  // Plan Review
  getPlanVersionsForReviewHandler,
  getPublishForReviewReadinessHandler,
  publishForReviewHandler,
  unlockReviewCorrectionsHandler,
  republishForReviewHandler,
  getCompleteReviewReadinessHandler,
  completeReviewHandler,
  getPlanReviewDashboardHandler,

  // Plan Versions
  listPlanVersionsHandler,
  getPlanVersionByIdHandler,
  createPlanDraftHandler,
  updatePlanVersionHandler,
  deletePlanVersionHandler,
  duplicatePlanDraftHandler,

  // Hierarchy & Nodes
  getPlanHierarchyHandler,
  createPlanNodeHandler,
  getPlanNodeByIdHandler,
  getPlanNodeAchievementHistoryHandler,
  updatePlanNodeHandler,
  deletePlanNodeHandler,
  reorderPlanNodesHandler,
  assignPlanNodeHandler,
  removePlanNodeAssignmentHandler,

  // Finalization & Start
  getDraftFinalizationReadinessHandler,
  finalizePlanDraftHandler,
  reopenPlanDraftHandler,
  getStartProcessReadinessHandler,
  startPlanProcessHandler,

  // Annual Planning
  listAnnualVersionsHandler,
  getAnnualTargetAllocationsHandler,
  updateAnnualTargetHandler,
  getAnnualExecutionReadinessHandler,
  finalizeAnnualExecutionHandler,
  distributeAnnualTargetsEquallyHandler,
  lockAnnualPlanHandler,
  unlockAnnualPlanHandler,
  completeAnnualPlanHandler,

  // Period Planning
  listExecutionPeriodsHandler,
  initializeExecutionPeriodsHandler,
  getPeriodTargetAllocationsHandler,
  updatePeriodTargetHandler,
  getPeriodFinalizationReadinessHandler,
  finalizePeriodTargetsHandler,
  distributePeriodTargetsEquallyHandler,
  completeExecutionPeriodHandler,

  // Achievement Workflow
  getAchievementWorkflowScopeHandler,
  updatePeriodActualHandler,
  submitAchievementHandler,
  approveAchievementHandler,
  rejectAchievementHandler,
  validateAchievementHandler,
  rejectValidationAchievementHandler,
  submitAnnualAchievementHandler,
  approveAnnualAchievementHandler,
  rejectAnnualAchievementHandler,
  validateAnnualAchievementHandler,

  // Dashboard
  getExecutionDashboardSummaryHandler,
  getExecutionDashboardProgressTreeHandler,
  getExecutionDashboardDepartmentUserHandler,
};

