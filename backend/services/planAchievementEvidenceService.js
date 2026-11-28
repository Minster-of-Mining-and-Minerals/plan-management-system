"use strict";

const { Op } = require("sequelize");
const { Attachment } = require("../models");
const { isNarrationRequiredForVariance } = require("../utils/planPerformanceScoringUtils");

const MAX_EVIDENCE_ATTACHMENTS = 20;

function normalizeEvidenceAttachmentIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => {
    if (id && typeof id === "object") return String(id.attachment_id || "").trim();
    return String(id || "").trim();
  }).filter(Boolean))].slice(
    0,
    MAX_EVIDENCE_ATTACHMENTS
  );
}

/**
 * Over/under achievement (actual differs from target) requires at least one evidence document,
 * alongside the narration. Attachment ids must exist (uploaded via the attachments service).
 *
 * @returns {{ valid: boolean, message?: string, attachmentIds: string[] }}
 */
async function validateAchievementEvidence(target, actual, evidenceAttachmentIds, transaction = null) {
  const requested = normalizeEvidenceAttachmentIds(evidenceAttachmentIds);

  let attachmentIds = [];
  if (requested.length > 0) {
    const existing = await Attachment.findAll({
      where: { attachment_id: { [Op.in]: requested } },
      attributes: ["attachment_id"],
      transaction,
    });
    const existingIds = new Set(existing.map((row) => row.attachment_id));
    attachmentIds = requested.filter((id) => existingIds.has(id));
    if (attachmentIds.length !== requested.length) {
      return {
        valid: false,
        message: "One or more evidence attachments could not be found. Please upload them again.",
        attachmentIds,
      };
    }
  }

  if (isNarrationRequiredForVariance(target, actual) && attachmentIds.length === 0) {
    return {
      valid: false,
      message:
        "An evidence document is required when actual achievement differs from the target. Attach supporting evidence with your narration.",
      attachmentIds,
    };
  }

  return { valid: true, attachmentIds };
}

module.exports = {
  MAX_EVIDENCE_ATTACHMENTS,
  normalizeEvidenceAttachmentIds,
  validateAchievementEvidence,
};
