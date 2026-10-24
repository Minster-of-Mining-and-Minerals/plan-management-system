"use strict";

const companyPlanService = require("../../services/companyPlanService");
const { assertCompanyAccessible } = require("../../utils/structureScopeUtils");

function resolveEffectiveCompanyId(req) {
  let companyId = req.params.companyId || req.query.company_id || req.body.company_id;

  if (req.user?.company_id) {
    const userCompanyId = req.user.company_id;
    if (companyId && companyId !== userCompanyId) {
      const error = new Error("Access denied: cannot access another company's planning records");
      error.status = 403;
      throw error;
    }
    companyId = userCompanyId;
  }

  if (!companyId) {
    const error = new Error("company_id is required");
    error.status = 400;
    throw error;
  }

  return companyId;
}

// -------------------------------------------------------------
// Configuration & Rules Handlers
// -------------------------------------------------------------

async function getPlanningConfigHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getEffectiveCompanyPlanningConfig(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanningConfigHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPlanningConfig(companyId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listPlanRulesHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.listCompanyPlanRules(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanRuleByIdHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPlanRuleById(req.params.id, companyId);
    if (!data) return res.status(404).json({ success: false, message: "Rule not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanRuleHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "create");
    const data = await companyPlanService.createCompanyPlanRule(companyId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanRuleHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPlanRule(req.params.id, companyId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanRuleHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "delete");
    const data = await companyPlanService.deleteCompanyPlanRule(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Execution Dashboard Handlers
// -------------------------------------------------------------

async function getExecutionDashboardSummaryHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyExecutionDashboardSummary(companyId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getExecutionDashboardProgressTreeHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyExecutionDashboardProgressTree(companyId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getExecutionDashboardDepartmentUserHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyExecutionDashboardDepartmentUser(companyId, req.query);
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
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.listCompanyPlanVersions(companyId, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanVersionByIdHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPlanVersionById(req.params.id, companyId);
    if (!data) return res.status(404).json({ success: false, message: "Plan version not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanDraftHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "create");
    const data = await companyPlanService.createCompanyPlanDraft(companyId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanVersionHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPlanVersion(req.params.id, companyId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanVersionHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "delete");
    const data = await companyPlanService.deleteCompanyPlanVersion(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function duplicatePlanDraftHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "create");
    const data = await companyPlanService.duplicateCompanyPlanDraft(req.params.id, companyId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Finalization & Start Handlers
async function getDraftFinalizationReadinessHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyDraftFinalizationReadiness(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizePlanDraftHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.finalizeCompanyPlanDraft(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function reopenPlanDraftHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.reopenCompanyPlanDraftForEdit(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getStartProcessReadinessHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyStartProcessReadiness(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function startPlanProcessHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.startCompanyPlanProcess(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Annual Planning Handlers
async function listAnnualVersionsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.listCompanyAnnualVersions(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAnnualTargetAllocationsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyAnnualTargetAllocations(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updateAnnualTargetHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyAnnualTarget(
      req.params.id,
      companyId,
      req.body.annual_target,
      req.user
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAnnualExecutionReadinessHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyAnnualExecutionReadiness(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizeAnnualExecutionHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.finalizeCompanyAnnualExecution(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function lockAnnualPlanHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.lockCompanyAnnualPlan(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function unlockAnnualPlanHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.unlockCompanyAnnualPlan(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function completeAnnualPlanHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.completeCompanyAnnualPlan(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Period Planning Handlers
async function listExecutionPeriodsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.listCompanyExecutionPeriods(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function initializeExecutionPeriodsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.initializeCompanyExecutionPeriods(req.params.id, companyId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPeriodTargetAllocationsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPeriodTargetAllocations(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePeriodTargetHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPeriodTarget(
      req.params.id,
      companyId,
      req.body.period_target,
      req.user
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPeriodFinalizationReadinessHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPeriodFinalizationReadiness(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function finalizePeriodTargetsHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.finalizeCompanyPeriodTargets(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function completeExecutionPeriodHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.completeCompanyExecutionPeriod(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Hierarchy & Plan Nodes Handlers
// -------------------------------------------------------------

async function getPlanHierarchyHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPlanHierarchy(req.params.id, companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function createPlanNodeHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "create");
    const data = await companyPlanService.createCompanyPlanNode(companyId, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getPlanNodeByIdHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "read");
    const data = await companyPlanService.getCompanyPlanNodeById(req.params.id, companyId);
    if (!data) return res.status(404).json({ success: false, message: "Node not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function updatePlanNodeHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPlanNode(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function deletePlanNodeHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "delete");
    const data = await companyPlanService.deleteCompanyPlanNode(req.params.id, companyId, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function reorderPlanNodesHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.reorderCompanyPlanNodes(companyId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Actuals & Signoff Handlers
// -------------------------------------------------------------

async function updatePeriodActualHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.updateCompanyPeriodActual(
      req.params.id,
      companyId,
      req.body.period_actual,
      req.user
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function submitAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.submitCompanyAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function approveAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.approveCompanyAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function rejectAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.rejectCompanyAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function validateAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.validateCompanyAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function rejectValidationAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.rejectValidationCompanyAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Annual Achievements
async function submitAnnualAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.submitCompanyAnnualAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function approveAnnualAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.approveCompanyAnnualAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function rejectAnnualAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.rejectCompanyAnnualAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function validateAnnualAchievementHandler(req, res, next) {
  try {
    const companyId = resolveEffectiveCompanyId(req);
    assertCompanyAccessible(req, companyId, "update");
    const data = await companyPlanService.validateCompanyAnnualAchievement(req.params.id, companyId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Config & Rules
  getPlanningConfigHandler,
  updatePlanningConfigHandler,
  listPlanRulesHandler,
  getPlanRuleByIdHandler,
  createPlanRuleHandler,
  updatePlanRuleHandler,
  deletePlanRuleHandler,

  // Dashboard
  getExecutionDashboardSummaryHandler,
  getExecutionDashboardProgressTreeHandler,
  getExecutionDashboardDepartmentUserHandler,

  // Versions
  listPlanVersionsHandler,
  getPlanVersionByIdHandler,
  createPlanDraftHandler,
  updatePlanVersionHandler,
  deletePlanVersionHandler,
  duplicatePlanDraftHandler,

  // Finalization & Start
  getDraftFinalizationReadinessHandler,
  finalizePlanDraftHandler,
  reopenPlanDraftHandler,
  getStartProcessReadinessHandler,
  startPlanProcessHandler,

  // Annual
  listAnnualVersionsHandler,
  getAnnualTargetAllocationsHandler,
  updateAnnualTargetHandler,
  getAnnualExecutionReadinessHandler,
  finalizeAnnualExecutionHandler,
  lockAnnualPlanHandler,
  unlockAnnualPlanHandler,
  completeAnnualPlanHandler,

  // Periods
  listExecutionPeriodsHandler,
  initializeExecutionPeriodsHandler,
  getPeriodTargetAllocationsHandler,
  updatePeriodTargetHandler,
  getPeriodFinalizationReadinessHandler,
  finalizePeriodTargetsHandler,
  completeExecutionPeriodHandler,

  // Hierarchy
  getPlanHierarchyHandler,
  createPlanNodeHandler,
  getPlanNodeByIdHandler,
  updatePlanNodeHandler,
  deletePlanNodeHandler,
  reorderPlanNodesHandler,

  // Actuals & Signoff
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
};
