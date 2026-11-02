"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  RegionalIssueEscalation,
  RegionalIssueEscalationMessage,
  RegionalIssue,
  Region,
  User,
  IssueCategory,
  IssuePriority,
  Attachment,
} = require("../models");

const { recordRegionalHistory } = require("./regionalIssueHistoryService");
const { sendNotification } = require("../utils/notification");

/**
 * List all regional escalations for Federal oversight
 */
async function getEscalations(query = {}, actor = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const whereClause = {
    escalation_status: { [Op.ne]: "recalled" },
  };

  if (query.region_id) {
    whereClause.region_id = query.region_id;
  }
  if (query.status) {
    whereClause.escalation_status = query.status;
  }
  if (query.priority) {
    whereClause.escalation_priority = query.priority;
  }
  if (query.assistance_type) {
    whereClause.assistance_type = query.assistance_type;
  }
  if (query.assigned_to) {
    whereClause.federal_assigned_to = query.assigned_to;
  }

  const issueWhere = {};
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    whereClause[Op.or] = [
      { escalation_number: { [Op.iLike]: term } },
      { escalation_reason: { [Op.iLike]: term } },
      { "$regionalIssue.title$": { [Op.iLike]: term } },
      { "$regionalIssue.issue_number$": { [Op.iLike]: term } },
    ];
  }

  const { count, rows } = await RegionalIssueEscalation.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Region,
        as: "region",
        attributes: ["region_id", "name", "code"],
      },
      {
        model: RegionalIssue,
        as: "regionalIssue",
        where: issueWhere,
        attributes: [
          "regional_issue_id",
          "issue_number",
          "title",
          "description",
          "status",
          "escalation_status",
          "created_at",
        ],
        include: [
          {
            model: IssueCategory,
            as: "category",
            attributes: ["issue_category_id", "name", "code"],
          },
          {
            model: IssuePriority,
            as: "priority",
            attributes: ["issue_priority_id", "code", "label", "color_hex"],
          },
        ],
      },
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
    ],
    order: [["escalated_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

/**
 * Aggregate Federal escalation statistics
 */
async function getDashboardStats(query = {}) {
  const whereClause = {
    escalation_status: { [Op.ne]: "recalled" },
  };
  if (query.region_id) {
    whereClause.region_id = query.region_id;
  }

  const escalations = await RegionalIssueEscalation.findAll({
    where: whereClause,
    attributes: [
      "escalation_id",
      "escalation_status",
      "assistance_type",
      "region_id",
      "created_at",
    ],
    include: [
      {
        model: Region,
        as: "region",
        attributes: ["region_id", "name", "code"],
      },
    ],
  });

  const stats = {
    total: escalations.length,
    escalated: 0,
    under_federal_review: 0,
    clarification_requested: 0,
    assistance_provided: 0,
    returned: 0,
    closed: 0,
    by_region: {},
    by_assistance_type: {},
  };

  for (const item of escalations) {
    if (stats[item.escalation_status] !== undefined) {
      stats[item.escalation_status] += 1;
    }

    const regName = item.region?.name || "Unknown Region";
    stats.by_region[regName] = (stats.by_region[regName] || 0) + 1;

    const aType = item.assistance_type || "other";
    stats.by_assistance_type[aType] = (stats.by_assistance_type[aType] || 0) + 1;
  }

  return stats;
}

/**
 * Single escalation detail for Federal review
 */
async function getEscalationById(escalationId) {
  const escalation = await RegionalIssueEscalation.findOne({
    where: { escalation_id: escalationId },
    include: [
      {
        model: Region,
        as: "region",
        attributes: ["region_id", "name", "code"],
      },
      {
        model: RegionalIssue,
        as: "regionalIssue",
        include: [
          {
            model: IssueCategory,
            as: "category",
            attributes: ["issue_category_id", "name", "code"],
          },
          {
            model: IssuePriority,
            as: "priority",
            attributes: ["issue_priority_id", "code", "label", "color_hex"],
          },
          {
            model: User,
            as: "raiser",
            attributes: ["user_id", "full_name", "email"],
          },
          {
            model: User,
            as: "assignee",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
      },
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
  });

  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  const result = escalation.toJSON();
  if (Array.isArray(result.selected_attachment_ids) && result.selected_attachment_ids.length > 0) {
    result.shared_attachments = await Attachment.findAll({
      where: { attachment_id: { [Op.in]: result.selected_attachment_ids } },
      attributes: ["attachment_id", "file_name", "file_path", "uploaded_by", "created_at"],
    });
  } else {
    result.shared_attachments = [];
  }

  return result;
}

/**
 * Assign Federal officer to manage the escalation
 */
async function assignFederalOfficer(escalationId, federalUserId, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  const assignee = await User.findByPk(federalUserId);
  if (!assignee) {
    const error = new Error("Federal user not found.");
    error.status = 404;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update({ federal_assigned_to: federalUserId }, { transaction: t });

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "message",
        message_text: `Escalation assigned to Federal Desk Officer: ${assignee.full_name || assignee.email}`,
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Start Federal Review
 */
async function startFederalReview(escalationId, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update({ escalation_status: "under_federal_review" }, { transaction: t });

    // Sync underlying regional issue escalation_status
    await RegionalIssue.update(
      { escalation_status: "under_federal_review" },
      { where: { regional_issue_id: escalation.regional_issue_id }, transaction: t }
    );

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "message",
        message_text: "Federal Ministry has commenced active review of this escalation.",
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Request Clarification from Region
 */
async function requestClarification(escalationId, { clarification_text }, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  if (!clarification_text || !clarification_text.trim()) {
    const error = new Error("Clarification text is required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update({ escalation_status: "clarification_requested" }, { transaction: t });

    await RegionalIssue.update(
      { escalation_status: "clarification_requested" },
      { where: { regional_issue_id: escalation.regional_issue_id }, transaction: t }
    );

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "clarification_request",
        message_text: clarification_text.trim(),
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Provide Official Federal Assistance & Guidance
 */
async function provideAssistance(
  escalationId,
  { federal_response_summary, federal_action_taken },
  actor
) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  if (!federal_response_summary || !federal_response_summary.trim()) {
    const error = new Error("Federal response summary is required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update(
      {
        escalation_status: "assistance_provided",
        federal_response_summary: federal_response_summary.trim(),
        federal_action_taken: federal_action_taken ? federal_action_taken.trim() : null,
        resolved_at: new Date(),
      },
      { transaction: t }
    );

    await RegionalIssue.update(
      { escalation_status: "assistance_provided" },
      { where: { regional_issue_id: escalation.regional_issue_id }, transaction: t }
    );

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "official_response",
        message_text: `OFFICIAL FEDERAL GUIDANCE:\n${federal_response_summary.trim()}\n\nAction Taken: ${
          federal_action_taken || "None specified"
        }`,
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Return Escalation to Region (e.g. out of scope or non-justified)
 */
async function returnToRegion(escalationId, { returned_reason }, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  if (!returned_reason || !returned_reason.trim()) {
    const error = new Error("Return explanation is required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update(
      {
        escalation_status: "returned",
        returned_reason: returned_reason.trim(),
      },
      { transaction: t }
    );

    await RegionalIssue.update(
      { escalation_status: "returned" },
      { where: { regional_issue_id: escalation.regional_issue_id }, transaction: t }
    );

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "official_response",
        message_text: `ESCALATION RETURNED TO REGION:\n${returned_reason.trim()}`,
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Conclude Federal Intervention
 */
async function closeFederalIntervention(escalationId, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    await escalation.update(
      {
        escalation_status: "closed",
        closed_at: new Date(),
      },
      { transaction: t }
    );

    await RegionalIssue.update(
      { escalation_status: "closed" },
      { where: { regional_issue_id: escalation.regional_issue_id }, transaction: t }
    );

    await RegionalIssueEscalationMessage.create(
      {
        escalation_id: escalationId,
        sender_id: actor.user_id,
        sender_scope: "federal",
        message_type: "message",
        message_text: "Federal Ministry has concluded and closed its intervention for this escalation.",
        is_internal_federal_note: false,
      },
      { transaction: t }
    );

    return escalation;
  });
}

/**
 * Post a Federal Message or Internal Federal Note
 */
async function addFederalMessage(escalationId, payload, actor) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
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

  return await RegionalIssueEscalationMessage.create({
    escalation_id: escalationId,
    sender_id: actor.user_id,
    sender_scope: "federal",
    message_type: payload.message_type || "message",
    message_text: payload.message_text.trim(),
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    is_internal_federal_note: Boolean(payload.is_internal_federal_note),
  });
}

/**
 * Retrieve escalation attachment for Federal download with shielding enforcement
 */
async function getEscalationAttachmentForDownload(escalationId, attachmentId) {
  const escalation = await RegionalIssueEscalation.findByPk(escalationId);
  if (!escalation) {
    const error = new Error("Escalation record not found.");
    error.status = 404;
    throw error;
  }

  const selectedIds = Array.isArray(escalation.selected_attachment_ids)
    ? escalation.selected_attachment_ids
    : [];

  if (!selectedIds.includes(attachmentId)) {
    const error = new Error("Access forbidden: Attachment was not shared with Federal escalation.");
    error.status = 403;
    throw error;
  }

  const attachment = await Attachment.findByPk(attachmentId);
  if (!attachment) {
    const error = new Error("Attachment record not found.");
    error.status = 404;
    throw error;
  }

  return { escalation, attachment };
}

module.exports = {
  getEscalations,
  getDashboardStats,
  getEscalationById,
  assignFederalOfficer,
  startFederalReview,
  requestClarification,
  provideAssistance,
  returnToRegion,
  closeFederalIntervention,
  addFederalMessage,
  getEscalationAttachmentForDownload,
};

