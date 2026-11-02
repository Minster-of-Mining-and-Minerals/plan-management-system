"use strict";

const path = require("path");
const fs = require("fs");
const federalRegionalEscalationService = require("../../services/federalRegionalEscalationService");
const {
  resolveAndVerifyUploadPath,
  sanitizeDownloadFilename,
} = require("../../utils/attachmentStorageSecurity");
const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

function getActor(req) {
  return {
    user_id: req.user?.user_id,
    full_name: req.user?.full_name,
    email: req.user?.email,
    permissions: req.user?.permissions || [],
    isSuperAdmin: isSuperAdminActor(req),
  };
}

exports.getEscalations = async (req, res, next) => {
  try {
    const actor = getActor(req);
    const result = await federalRegionalEscalationService.getEscalations(req.query, actor);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await federalRegionalEscalationService.getDashboardStats(req.query);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.getEscalationById = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const escalation = await federalRegionalEscalationService.getEscalationById(escalationId);
    res.json({
      success: true,
      data: escalation,
    });
  } catch (error) {
    next(error);
  }
};

exports.assignFederalOfficer = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const { federal_user_id } = req.body;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.assignFederalOfficer(
      escalationId,
      federal_user_id,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Federal officer assigned successfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.startFederalReview = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.startFederalReview(escalationId, actor);
    res.json({
      success: true,
      data: escalation,
      message: "Federal review started.",
    });
  } catch (error) {
    next(error);
  }
};

exports.requestClarification = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.requestClarification(
      escalationId,
      req.body,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Clarification request submitted to Region.",
    });
  } catch (error) {
    next(error);
  }
};

exports.provideAssistance = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.provideAssistance(
      escalationId,
      req.body,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Official Federal assistance and guidance recorded.",
    });
  } catch (error) {
    next(error);
  }
};

exports.returnToRegion = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.returnToRegion(
      escalationId,
      req.body,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Escalation returned to region.",
    });
  } catch (error) {
    next(error);
  }
};

exports.closeFederalIntervention = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const escalation = await federalRegionalEscalationService.closeFederalIntervention(
      escalationId,
      actor
    );
    res.json({
      success: true,
      data: escalation,
      message: "Federal intervention closed.",
    });
  } catch (error) {
    next(error);
  }
};

exports.addFederalMessage = async (req, res, next) => {
  try {
    const { escalationId } = req.params;
    const actor = getActor(req);
    const message = await federalRegionalEscalationService.addFederalMessage(
      escalationId,
      req.body,
      actor
    );
    res.status(201).json({
      success: true,
      data: message,
      message: "Message recorded.",
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadEscalationAttachment = async (req, res, next) => {
  try {
    const { escalationId, attachmentId } = req.params;
    const { attachment } = await federalRegionalEscalationService.getEscalationAttachmentForDownload(
      escalationId,
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

