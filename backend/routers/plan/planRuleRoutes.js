const express = require("express");
const router = express.Router();

const {
  validateCreatePlanRule,
  validateUpdatePlanRule,
  validateIdParam,
} = require("../../validators/plan/planRuleValidator");

const {
  getPlanRules,
  getPlanRuleById,
  getPlanRuleForVersion,
  createPlanRule,
  updatePlanRule,
  deletePlanRule,
} = require("../../controllers/plan/planRuleController");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get("/rules", checkPermission("PLANS", "READ"), getPlanRules);
router.get("/rules/:id", checkPermission("PLANS", "READ"), validateIdParam, getPlanRuleById);
router.get(
  "/versions/:versionId/rule",
  checkPermission("PLANS", "READ"),
  getPlanRuleForVersion
);
router.post("/rules", checkPermission("PLANS", "UPDATE"), validateCreatePlanRule, createPlanRule);
router.put(
  "/rules/:id",
  checkPermission("PLANS", "UPDATE"),
  validateIdParam,
  validateUpdatePlanRule,
  updatePlanRule
);
router.delete(
  "/rules/:id",
  checkPermission("PLANS", "DELETE"),
  validateIdParam,
  deletePlanRule
);

module.exports = router;
