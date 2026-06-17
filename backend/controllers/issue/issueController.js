"use strict";

const issueService = require("../../services/issueService");

function getUserContext(req) {
  return {
    userId: req.user?.user_id,
    userPermissions: req.user?.permissions || [],
  };
}

function handleServiceError(res, error) {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message,
  });
}

const getIssuePriorities = async (req, res) => {
  try {
    const isActive =
      req.query.is_active !== undefined
        ? req.query.is_active === "true" || req.query.is_active === true
        : true;
    const priorities = await issueService.listPriorities({ isActive });
    return res.json({ success: true, data: priorities });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getIssues = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const result = await issueService.listIssues(query, getUserContext(req));
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.count,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getIssueDashboard = async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const stats = await issueService.getIssueDashboardStats(query, getUserContext(req));
    return res.json({ success: true, data: stats });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getIssueById = async (req, res) => {
  try {
    const issue = await issueService.getIssueById(req.params.id, getUserContext(req));
    return res.json({ success: true, data: issue });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const createIssue = async (req, res) => {
  try {
    const issue = await issueService.createIssue(
      req.body,
      req.user.user_id,
      req.app.get("io")
    );
    return res.status(201).json({
      success: true,
      message: "Issue created",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const updateIssue = async (req, res) => {
  try {
    const issue = await issueService.updateIssue(
      req.params.id,
      req.body,
      req.user.user_id,
      req.user.permissions || []
    );
    return res.json({
      success: true,
      message: "Issue updated",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const getIssueHistory = async (req, res) => {
  try {
    const history = await issueService.getIssueHistory(req.params.id, getUserContext(req));
    return res.json({ success: true, data: history });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const startIssueReview = async (req, res) => {
  try {
    const issue = await issueService.startReview(
      req.params.id,
      req.user.user_id,
      req.user.permissions || [],
      req.app.get("io")
    );
    return res.json({
      success: true,
      message: "Issue moved to under review",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const acceptIssue = async (req, res) => {
  try {
    const issue = await issueService.acceptIssue(
      req.params.id,
      { reviewNotes: req.body.review_notes },
      req.user.user_id,
      req.user.permissions || [],
      req.app.get("io")
    );
    return res.json({
      success: true,
      message: "Issue accepted",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const rejectIssue = async (req, res) => {
  try {
    const issue = await issueService.rejectIssue(
      req.params.id,
      { rejectionReason: req.body.rejection_reason },
      req.user.user_id,
      req.user.permissions || [],
      req.app.get("io")
    );
    return res.json({
      success: true,
      message: "Issue rejected",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const resolveIssue = async (req, res) => {
  try {
    const issue = await issueService.resolveIssue(
      req.params.id,
      { resolutionNotes: req.body.resolution_notes },
      req.user.user_id,
      req.user.permissions || [],
      req.app.get("io")
    );
    return res.json({
      success: true,
      message: "Issue resolved",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

const closeIssue = async (req, res) => {
  try {
    const issue = await issueService.closeIssue(
      req.params.id,
      req.user.user_id,
      req.user.permissions || [],
      req.app.get("io")
    );
    return res.json({
      success: true,
      message: "Issue closed",
      data: issue,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
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
};
