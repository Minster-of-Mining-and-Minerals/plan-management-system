"use strict";

const path = require("path");
const fs = require("fs");
const regionalIssueService = require("../../services/regionalIssueService");
const regionalIssueEscalationService = require("../../services/regionalIssueEscalationService");
const {
  resolveAndVerifyUploadPath,
  sanitizeDownloadFilename,
} = require("../../utils/attachmentStorageSecurity");
const { IssuePriority, IssueCategory } = require("../../models");
const { assertRegionAccessible, isSuperAdminActor } = require("../../utils/structureScopeUtils");

function getActor(req) {
  return {
    user_id: req.user?.user_id,
    full_name: req.user?.full_name,
    email: req.user?.email,
    permissions: req.user?.permissions || [],
    isSuperAdmin: isSuperAdminActor(req),
    regional_structure_id: req.user?.regional_structure_id,
  };
}

function resolveRegionId(req) {
  const regionId = req.params.regionId || req.params.id;
  if (!regionId) {
    const error = new Error("Missing region identifier in request.");
    error.status = 400;
    throw error;
  }
  assertRegionAccessible(req, regionId);
  return regionId;
}

exports.getIssues = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const actor = getActor(req);
    const result = await regionalIssueService.getIssues(regionId, req.query, actor);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const actor = getActor(req);
    const stats = await regionalIssueService.getDashboard(regionId, actor);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getIssueById = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.getIssueById(regionId, issueId, actor);
    res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};

exports.createIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const actor = getActor(req);
    const issue = await regionalIssueService.createIssue(regionId, req.body, actor, req);
    res.status(201).json({
      success: true,
      data: issue,
      message: "Regional issue submitted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.updateIssue(regionId, issueId, req.body, actor, req);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.assignIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const { assigned_to } = req.body;
    const actor = getActor(req);
    const issue = await regionalIssueService.assignIssue(regionId, issueId, assigned_to, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue assignment updated.",
    });
  } catch (error) {
    next(error);
  }
};

exports.startReview = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.startReview(regionId, issueId, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue is now under review.",
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.acceptIssue(regionId, issueId, req.body, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue accepted.",
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.rejectIssue(regionId, issueId, req.body, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue rejected.",
    });
  } catch (error) {
    next(error);
  }
};

exports.resolveIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.resolveIssue(regionId, issueId, req.body, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue resolved.",
    });
  } catch (error) {
    next(error);
  }
};

exports.closeIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const issue = await regionalIssueService.closeIssue(regionId, issueId, actor);
    res.json({
      success: true,
      data: issue,
      message: "Regional issue closed.",
    });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const comment = await regionalIssueService.addComment(regionId, issueId, req.body, actor);
    res.status(201).json({
      success: true,
      data: comment,
      message: "Comment added successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.addAttachment = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const { attachment_id } = req.body;
    const actor = getActor(req);
    await regionalIssueService.addAttachment(regionId, issueId, attachment_id, actor);
    res.json({
      success: true,
      message: "Attachment linked successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getPriorities = async (req, res, next) => {
  try {
    const priorities = await IssuePriority.findAll({
      where: { is_active: true },
      order: [["display_order", "ASC"]],
    });
    res.json({
      success: true,
      data: priorities,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await IssueCategory.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

exports.escalateIssue = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const escalation = await regionalIssueEscalationService.escalateIssue(
      regionId,
      issueId,
      req.body,
      actor
    );
    res.status(201).json({
      success: true,
      data: escalation,
      message: "Regional issue successfully escalated to Federal.",
    });
  } catch (error) {
    next(error);
  }
};

exports.recallEscalation = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId, escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await regionalIssueEscalationService.recallEscalation(
      regionId,
      issueId,
      escalationId,
      req.body,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Federal escalation was successfully recalled.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getIssueEscalations = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId } = req.params;
    const actor = getActor(req);
    const escalations = await regionalIssueEscalationService.getIssueEscalations(
      regionId,
      issueId,
      actor
    );
    res.json({
      success: true,
      data: escalations,
    });
  } catch (error) {
    next(error);
  }
};

exports.addEscalationMessage = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId, escalationId } = req.params;
    const actor = getActor(req);
    const message = await regionalIssueEscalationService.addEscalationMessage(
      regionId,
      issueId,
      escalationId,
      req.body,
      actor,
      "regional"
    );
    res.status(201).json({
      success: true,
      data: message,
      message: "Escalation communication sent.",
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const regionId = resolveRegionId(req);
    const { issueId, attachmentId } = req.params;
    const { attachment } = await regionalIssueService.getRegionalIssueAttachmentForDownload(
      regionId,
      issueId,
      attachmentId
    );

    const safeFilePath = resolveAndVerifyUploadPath(attachment.file_path);
    const cleanFilename = sanitizeDownloadFilename(attachment.file_name);

    return res.download(safeFilePath, cleanFilename);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};
