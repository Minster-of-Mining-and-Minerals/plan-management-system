"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  RegionalIssue,
  RegionalIssueEscalation,
  RegionalIssueEscalationMessage,
  Region,
  User,
  Attachment,
} = require("../models");

const { recordRegionalHistory } = require("./regionalIssueHistoryService");
const { sendNotification } = require("../utils/notification");

/**
 * Generate sequential escalation number: ESC-{REGION_CODE}-{YEAR}-{SEQUENCE}
 */
async function generateEscalationNumber(regionId, transaction) {
  const region = await Region.findByPk(regionId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  const rawCode = (region?.code || "REG").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const regionCode = rawCode.slice(0, 10);
  const year = new Date().getFullYear();
  const prefix = `ESC-${regionCode}-${year}-`;

  const [latest] = await RegionalIssueEscalation.findAll({
    where: {
      region_id: regionId,
      escalation_number: { [Op.like]: `${prefix}%` },
    },
    order: [["escalation_number", "DESC"]],
    limit: 1,
    attributes: ["escalation_number"],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let seq = 1;
  if (latest && latest.escalation_number) {
    const parts = latest.escalation_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}

/**
 * Verify if the issue can be escalated
 */
function assertCanEscalateRegionalIssue(issue, actor) {
  const perms = (actor.permissions || []).map((p) => String(p).toLowerCase());
  const canEscalate =
    actor.isSuperAdmin ||
    perms.includes("regional_issues:escalate") ||
    perms.includes("regional_issues:manage");

  if (!canEscalate) {
    const error = new Error("Access denied: You do not have permission to escalate issues to Federal.");
    error.status = 403;
    throw error;
  }

  const eligibleStates = ["submitted", "under_review", "accepted"];
  if (!eligibleStates.includes(issue.status)) {
    const error = new Error(
      `Cannot escalate issue in '${issue.status}' status. Only submitted, under review, or accepted issues can be escalated.`
    );
    error.status = 400;
    throw error;
  }

  const activeEscalationStates = ["escalated", "under_federal_review", "clarification_requested"];
  if (activeEscalationStates.includes(issue.escalation_status)) {
    const error = new Error("This regional issue already has an active Federal escalation in progress.");
    error.status = 400;
    throw error;
  }
}

/**
 * Escalate a regional issue to Federal
 */
async function escalateIssue(regionId, issueId, payload, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanEscalateRegionalIssue(issue, actor);

  if (!payload.escalation_reason || !payload.escalation_reason.trim()) {
    const error = new Error("Escalation reason is required.");
    error.status = 400;
    throw error;
  }
  if (!payload.requested_assistance || !payload.requested_assistance.trim()) {
    const error = new Error("Requested assistance description is required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const escalationNumber = await generateEscalationNumber(regionId, t);

    const escalation = await RegionalIssueEscalation.create(
      {
        regional_issue_id: issueId,
        region_id: regionId,
        escalation_number: escalationNumber,
        escalated_by: actor.user_id,
        escalated_at: new Date(),
        escalation_reason: payload.escalation_reason.trim(),
        requested_assistance: payload.requested_assistance.trim(),
        assistance_type: payload.assistance_type || "technical_support",
        escalation_priority: payload.escalation_priority || "high",
        escalation_status: "escalated",
        selected_attachment_ids: Array.isArray(payload.selected_attachment_ids)
          ? payload.selected_attachment_ids
          : [],
      },
      { transaction: t }
    );

    // Update regional issue's escalation status
    await issue.update({ escalation_status: "escalated" }, { transaction: t });

    // Record audit history
    await recordRegionalHistory({
      regional_issue_id: issueId,
      action_type: "escalated",
      performed_by: actor.user_id,
      notes: `Escalated to Federal with reference ${escalationNumber} (${payload.assistance_type || "technical_support"}). Reason: ${payload.escalation_reason.trim()}`,
      transaction: t,
    });

    return escalation;
  });
}

/**
 * Recall an escalation while it remains in initial 'escalated' status
 */
async function recallEscalation(regionId, issueId, escalationId, { recall_reason }, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  const escalation = await RegionalIssueEscalation.findOne({
    where: {
      escalation_id: escalationId,
      regional_issue_id: issueId,
      region_id: regionId,
    },
  });
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  if (escalation.escalation_status !== "escalated") {
    const error = new Error(
      `Cannot recall escalation in '${escalation.escalation_status}' status. Recall is only permitted before Federal review commences.`
    );
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update(
      {
        escalation_status: "recalled",
        recalled_at: new Date(),
        recalled_by: actor.user_id,
        recall_reason: recall_reason ? recall_reason.trim() : "Recalled by regional administrator.",
      },
      { transaction: t }
    );

    await issue.update({ escalation_status: "none" }, { transaction: t });

    await recordRegionalHistory({
      regional_issue_id: issueId,
      action_type: "escalation_recalled",
      performed_by: actor.user_id,
      notes: `Federal escalation ${escalation.escalation_number} was recalled. ${recall_reason || ""}`,
      transaction: t,
    });

    return escalation;
  });
}

/**
 * Get all escalations for a regional issue
 */
async function getIssueEscalations(regionId, issueId, actor = {}) {
  const escalations = await RegionalIssueEscalation.findAll({
    where: {
      regional_issue_id: issueId,
      region_id: regionId,
    },
    include: [
      {
        model: User,
        as: "escalator",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: User,
        as: "federalAssignee",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: RegionalIssueEscalationMessage,
        as: "messages",
        where: { is_internal_federal_note: false },
        required: false,
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["created_at", "ASC"]],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return escalations;
}

/**
 * Add communication message to an escalation
 */
async function addEscalationMessage(
  regionId,
  issueId,
  escalationId,
  payload,
  actor,
  senderScope = "regional"
) {
  const escalation = await RegionalIssueEscalation.findOne({
    where: {
      escalation_id: escalationId,
      regional_issue_id: issueId,
      ...(regionId ? { region_id: regionId } : {}),
    },
  });
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  if (!payload.message_text || !payload.message_text.trim()) {
    const error = new Error("Message text cannot be empty.");
    error.status = 400;
    throw error;
  }

  const message = await RegionalIssueEscalationMessage.create({
    escalation_id: escalationId,
    sender_id: actor.user_id,
    sender_scope: senderScope,
    message_type: payload.message_type || "message",
    message_text: payload.message_text.trim(),
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    is_internal_federal_note: Boolean(payload.is_internal_federal_note && senderScope === "federal"),
  });

  return message;
}

module.exports = {
  generateEscalationNumber,
  assertCanEscalateRegionalIssue,
  escalateIssue,
  recallEscalation,
  getIssueEscalations,
  addEscalationMessage,
};

