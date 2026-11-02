"use strict";

const express = require("express");
const router = express.Router();
const regionalIssueController = require("../../controllers/issue/regionalIssueController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Common Lookups
router.get("/priorities", regionalIssueController.getPriorities);
router.get("/categories", regionalIssueController.getCategories);

// Regional Issue Dashboard
router.get(
  "/:regionId/dashboard",
  checkAnyPermission([
    ["regional_issues", "view_dashboard"],
    ["regional_issues", "read"],
    ["regional_issues", "read_all"],
  ]),
  regionalIssueController.getDashboard
);

// Regional Issue Listing
router.get(
  "/:regionId",
  checkAnyPermission([
    ["regional_issues", "read"],
    ["regional_issues", "read_all"],
  ]),
  regionalIssueController.getIssues
);

// Regional Issue Creation
router.post(
  "/:regionId",
  checkPermission("regional_issues", "create"),
  regionalIssueController.createIssue
);

// Regional Issue Details
router.get(
  "/:regionId/:issueId",
  checkAnyPermission([
    ["regional_issues", "read"],
    ["regional_issues", "read_all"],
  ]),
  regionalIssueController.getIssueById
);

// Update Regional Issue (Submitted only)
router.put(
  "/:regionId/:issueId",
  checkPermission("regional_issues", "edit"),
  regionalIssueController.updateIssue
);

// Assignment
router.patch(
  "/:regionId/:issueId/assign",
  checkPermission("regional_issues", "assign"),
  regionalIssueController.assignIssue
);

// Workflow Actions
router.patch(
  "/:regionId/:issueId/review",
  checkPermission("regional_issues", "review"),
  regionalIssueController.startReview
);

router.patch(
  "/:regionId/:issueId/accept",
  checkPermission("regional_issues", "review"),
  regionalIssueController.acceptIssue
);

router.patch(
  "/:regionId/:issueId/reject",
  checkPermission("regional_issues", "review"),
  regionalIssueController.rejectIssue
);

router.patch(
  "/:regionId/:issueId/resolve",
  checkPermission("regional_issues", "resolve"),
  regionalIssueController.resolveIssue
);

router.patch(
  "/:regionId/:issueId/close",
  checkPermission("regional_issues", "close"),
  regionalIssueController.closeIssue
);

// Comments & Attachments
router.post(
  "/:regionId/:issueId/comments",
  checkPermission("regional_issues", "comment"),
  regionalIssueController.addComment
);

router.post(
  "/:regionId/:issueId/attachments",
  checkAnyPermission([
    ["regional_issues", "edit"],
    ["regional_issues", "comment"],
  ]),
  regionalIssueController.addAttachment
);

router.get(
  "/:regionId/:issueId/attachments/:attachmentId/download",
  checkAnyPermission([
    ["regional_issues", "read"],
    ["regional_issues", "read_all"],
  ]),
  regionalIssueController.downloadAttachment
);

// Escalation Gateway Routes
router.post(
  "/:regionId/:issueId/escalate",
  checkPermission("regional_issues", "escalate"),
  regionalIssueController.escalateIssue
);

router.post(
  "/:regionId/:issueId/escalations/:escalationId/recall",
  checkAnyPermission([
    ["regional_issues", "recall_escalation"],
    ["regional_issues", "escalate"],
  ]),
  regionalIssueController.recallEscalation
);

router.get(
  "/:regionId/:issueId/escalations",
  checkAnyPermission([
    ["regional_issues", "read"],
    ["regional_issues", "read_all"],
  ]),
  regionalIssueController.getIssueEscalations
);

router.post(
  "/:regionId/:issueId/escalations/:escalationId/messages",
  checkPermission("regional_issues", "comment"),
  regionalIssueController.addEscalationMessage
);

module.exports = router;
