const express = require("express");
const router = express.Router();

const {
  getPerformanceColorThresholds,
  getPerformanceColorThresholdById,
  resolvePerformanceColor,
  createPerformanceColorThreshold,
  updatePerformanceColorThreshold,
  deletePerformanceColorThreshold,
} = require("../../controllers/config/performanceColorThresholdController");

const {
  validateCreateThreshold,
  validateUpdateThreshold,
  validateIdParam,
} = require("../../validators/config/performanceColorThresholdValidator");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("PLANS", "READ"),
  getPerformanceColorThresholds
);
router.get(
  "/resolve",
  checkPermission("PLANS", "READ"),
  resolvePerformanceColor
);
router.get(
  "/:id",
  checkPermission("PERFORMANCE_COLOR_THRESHOLDS", "READ"),
  validateIdParam,
  getPerformanceColorThresholdById
);
router.post(
  "/",
  checkPermission("PERFORMANCE_COLOR_THRESHOLDS", "CREATE"),
  validateCreateThreshold,
  createPerformanceColorThreshold
);
router.put(
  "/:id",
  checkPermission("PERFORMANCE_COLOR_THRESHOLDS", "UPDATE"),
  validateIdParam,
  validateUpdateThreshold,
  updatePerformanceColorThreshold
);
router.delete(
  "/:id",
  checkPermission("PERFORMANCE_COLOR_THRESHOLDS", "DELETE"),
  validateIdParam,
  deletePerformanceColorThreshold
);

module.exports = router;
