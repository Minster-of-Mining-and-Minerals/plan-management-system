const express = require("express");
const router = express.Router();

const {
  getIssueCategories,
  getIssueCategoryById,
  createIssueCategory,
  updateIssueCategory,
  deactivateIssueCategory,
} = require("../../controllers/issue/issueCategoryController");

const {
  validateIdParam,
  validateCreateCategory,
  validateUpdateCategory,
  validateListCategoriesQuery,
} = require("../../validators/issue/issueCategoryValidator");

const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

const VIEW_CATEGORY_PERMISSIONS = [
  { resource: "ISSUE_CATEGORIES", action: "READ" },
  { resource: "ISSUES", action: "CREATE" },
];

router.use(authenticateToken);

router.get(
  "/",
  checkAnyPermission(VIEW_CATEGORY_PERMISSIONS),
  validateListCategoriesQuery,
  getIssueCategories
);

router.get(
  "/:id",
  checkPermission("ISSUE_CATEGORIES", "READ"),
  validateIdParam,
  getIssueCategoryById
);

router.post(
  "/",
  checkPermission("ISSUE_CATEGORIES", "CREATE"),
  validateCreateCategory,
  createIssueCategory
);

router.put(
  "/:id",
  checkPermission("ISSUE_CATEGORIES", "UPDATE"),
  validateIdParam,
  validateUpdateCategory,
  updateIssueCategory
);

router.patch(
  "/:id/deactivate",
  checkPermission("ISSUE_CATEGORIES", "UPDATE"),
  validateIdParam,
  deactivateIssueCategory
);

module.exports = router;
