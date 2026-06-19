"use strict";

const { validate: isUuid } = require("uuid");
const {
  getPublishForReviewReadiness,
  publishForReview,
  unlockForCorrections,
  republishForReview,
  getCompleteReviewReadiness,
  completeReview,
  getReviewDashboardStats,
  getPlanReviewIssues,
  resolveReviewSnapshotRootForQuery,
} = require("../../services/planReviewService");

async function getPublishForReviewReadinessHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const data = await getPublishForReviewReadiness(id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function publishForReviewHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await publishForReview(id, req, req.app.get("io"));
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return res.json({
      success: true,
      message: "Plan published for review",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function unlockForCorrectionsHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await unlockForCorrections(id, req, req.app.get("io"));
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return res.json({
      success: true,
      message: "Plan unlocked for corrections",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function republishForReviewHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await republishForReview(id, req, req.app.get("io"));
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return res.json({
      success: true,
      message: "Plan republished for review",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getCompleteReviewReadinessHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const data = await getCompleteReviewReadiness(id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function completeReviewHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }
    const result = await completeReview(id, req, req.app.get("io"));
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    return res.json({
      success: true,
      message: "Plan review completed",
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getPlanReviewDashboardHandler(req, res) {
  try {
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const {
      canAccessPlanReviewDashboard,
      applyPlanReviewIssueFilters,
      hasPlanReviewDashboardAllAccess,
    } = require("../../utils/planReviewIssuePermissionUtils");

    const userPermissions = req.user?.permissions || [];
    if (!canAccessPlanReviewDashboard(userPermissions)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view the plan review dashboard",
      });
    }

    const query = req.validatedQuery || req.query;
    const scopedFilters = applyPlanReviewIssueFilters(
      query,
      req.user.user_id,
      userPermissions
    );
    if (!scopedFilters) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view plan review issues",
      });
    }

    const snapshotRootId =
      (await resolveReviewSnapshotRootForQuery(id)) || id;
    const stats = await getReviewDashboardStats(snapshotRootId, scopedFilters);
    const issues = await getPlanReviewIssues(snapshotRootId, scopedFilters);

    return res.json({
      success: true,
      data: {
        stats,
        issues,
        scope: hasPlanReviewDashboardAllAccess(userPermissions) ? "all" : "own",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getPublishForReviewReadinessHandler,
  publishForReviewHandler,
  unlockForCorrectionsHandler,
  republishForReviewHandler,
  getCompleteReviewReadinessHandler,
  completeReviewHandler,
  getPlanReviewDashboardHandler,
};
