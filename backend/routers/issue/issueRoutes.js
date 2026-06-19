const express = require("express");
const router = express.Router();

const {
  getIssuePriorities,
  getIssues,
  getIssueDashboard,
  getIssueById,
  createIssue,
  updateIssue,
  getIssueHistory,
  startIssueReview,
  acceptIssue,
  rejectIssue,
  resolveIssue,
  closeIssue,
} = require("../../controllers/issue/issueController");

const {
  validateIdParam,
  validateCreateIssue,
  validateUpdateIssue,
  validateListIssuesQuery,
  validateDashboardQuery,
  validateAcceptIssue,
  validateRejectIssue,
  validateResolveIssue,
} = require("../../validators/issue/issueValidator");

const {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

const VIEW_ISSUE_PERMISSIONS = [
  { resource: "ISSUES", action: "READ_ALL" },
  { resource: "ISSUES", action: "READ" },
  { resource: "ISSUES", action: "READ_OWN" },
  { resource: "ISSUES", action: "READ_ASSIGNED" },
];

router.get(
  "/priorities",
  checkAnyPermission([
    ...VIEW_ISSUE_PERMISSIONS,
    { resource: "PLAN", action: "RAISE_REVIEW_ISSUE" },
    { resource: "PLAN", action: "VIEW_OWN_REVIEW_ISSUES" },
    { resource: "PLAN", action: "VIEW_REVIEW_DASHBOARD" },
  ]),
  getIssuePriorities
);

router.get(
  "/dashboard",
  checkAnyPermission(VIEW_ISSUE_PERMISSIONS),
  validateDashboardQuery,
  getIssueDashboard
);

router.get(
  "/",
  checkAnyPermission(VIEW_ISSUE_PERMISSIONS),
  validateListIssuesQuery,
  getIssues
);

router.get(
  "/:id/history",
  checkAnyPermission(VIEW_ISSUE_PERMISSIONS),
  validateIdParam,
  getIssueHistory
);

router.get(
  "/:id",
  checkAnyPermission(VIEW_ISSUE_PERMISSIONS),
  validateIdParam,
  getIssueById
);

router.post(
  "/",
  checkAnyPermission([
    { resource: "ISSUES", action: "CREATE" },
    { resource: "PLAN", action: "RAISE_REVIEW_ISSUE" },
  ]),
  validateCreateIssue,
  createIssue
);

router.put(
  "/:id",
  checkPermission("ISSUES", "CREATE"),
  validateIdParam,
  validateUpdateIssue,
  updateIssue
);

router.post(
  "/:id/start-review",
  checkPermission("ISSUES", "REVIEW"),
  validateIdParam,
  startIssueReview
);

router.post(
  "/:id/accept",
  checkPermission("ISSUES", "REVIEW"),
  validateIdParam,
  validateAcceptIssue,
  acceptIssue
);

router.post(
  "/:id/reject",
  checkPermission("ISSUES", "REVIEW"),
  validateIdParam,
  validateRejectIssue,
  rejectIssue
);

router.post(
  "/:id/resolve",
  checkPermission("ISSUES", "RESOLVE"),
  validateIdParam,
  validateResolveIssue,
  resolveIssue
);

router.post(
  "/:id/close",
  checkPermission("ISSUES", "CLOSE"),
  validateIdParam,
  closeIssue
);

module.exports = router;
