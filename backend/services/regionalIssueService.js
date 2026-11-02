"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  RegionalIssue,
  RegionalIssueHistory,
  RegionalIssueAttachment,
  RegionalIssueComment,
  Region,
  RegionalStructure,
  IssueCategory,
  IssuePriority,
  FormConfigContainer,
  Attachment,
  User,
} = require("../models");

const {
  REGIONAL_ISSUE_STATUS,
  assertValidRegionalTransition,
  isRegionalIssueEditable,
} = require("../utils/regionalIssueStatusUtils");

const {
  assertCanPerformRegionalIssueWorkflowAction,
  assertCanEditRegionalIssue,
} = require("../utils/regionalIssuePermissionUtils");

const { recordRegionalHistory } = require("./regionalIssueHistoryService");
const {
  REGIONAL_ISSUE_EVENTS,
  emitRegionalIssueEvent,
} = require("./regionalIssueNotificationService");

/**
 * Generate a concurrent-safe sequential issue number:
 * Format: REG-{REGION_CODE}-{YEAR}-{SEQUENCE}
 */
async function generateRegionalIssueNumber(regionId, transaction) {
  const region = await Region.findByPk(regionId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  const rawCode = (region?.code || "REG").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const regionCode = rawCode.slice(0, 10);
  const year = new Date().getFullYear();
  const prefix = `REG-${regionCode}-${year}-`;

  const [latest] = await RegionalIssue.findAll({
    where: {
      region_id: regionId,
      issue_number: { [Op.like]: `${prefix}%` },
    },
    order: [["issue_number", "DESC"]],
    limit: 1,
    attributes: ["issue_number"],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  let seq = 1;
  if (latest && latest.issue_number) {
    const parts = latest.issue_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(5, "0")}`;
}

/**
 * List regional issues with scoping and filters
 */
async function getIssues(regionId, query = {}, actor = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const whereClause = { region_id: regionId };

  // Permission scoping:
  const perms = (actor.permissions || []).map((p) => String(p).toLowerCase());
  const canReadAll =
    actor.isSuperAdmin ||
    perms.includes("regional_issues:read_all") ||
    perms.includes("regional_issues:manage");

  if (!canReadAll) {
    whereClause[Op.or] = [
      { raised_by: actor.user_id },
      { assigned_to: actor.user_id },
    ];
  }

  // Filters
  if (query.status) {
    whereClause.status = query.status;
  }
  if (query.escalation_status) {
    whereClause.escalation_status = query.escalation_status;
  }
  if (query.priority_id) {
    whereClause.issue_priority_id = query.priority_id;
  }
  if (query.category_id) {
    whereClause.issue_category_id = query.category_id;
  }
  if (query.assigned_to) {
    whereClause.assigned_to = query.assigned_to;
  }
  if (query.raised_by) {
    whereClause.raised_by = query.raised_by;
  }
  if (query.regional_structure_id) {
    whereClause.regional_structure_id = query.regional_structure_id;
  }
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push({
      [Op.or]: [
        { title: { [Op.iLike]: term } },
        { issue_number: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
      ],
    });
  }

  const { count, rows } = await RegionalIssue.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: IssueCategory,
        as: "category",
        attributes: ["issue_category_id", "name", "code"],
      },
      {
        model: IssuePriority,
        as: "priority",
        attributes: ["issue_priority_id", "code", "label", "color_hex", "display_order"],
      },
      {
        model: RegionalStructure,
        as: "regionalStructure",
        attributes: ["regional_structure_id", "name", "level"],
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
      {
        model: Attachment,
        as: "attachments",
        attributes: ["attachment_id", "file_name", "file_path", "uploaded_by", "created_at"],
        through: { attributes: [] },
      },
    ],
    order: [["created_at", "DESC"]],
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
 * Regional Dashboard KPI and analytics aggregation
 */
async function getDashboard(regionId, actor = {}) {
  const whereClause = { region_id: regionId };

  const perms = (actor.permissions || []).map((p) => String(p).toLowerCase());
  const canReadAll =
    actor.isSuperAdmin ||
    perms.includes("regional_issues:read_all") ||
    perms.includes("regional_issues:manage");

  if (!canReadAll) {
    whereClause[Op.or] = [
      { raised_by: actor.user_id },
      { assigned_to: actor.user_id },
    ];
  }

  const issues = await RegionalIssue.findAll({
    where: whereClause,
    attributes: [
      "regional_issue_id",
      "status",
      "escalation_status",
      "issue_priority_id",
      "issue_category_id",
      "created_at",
      "resolved_at",
    ],
    include: [
      {
        model: IssuePriority,
        as: "priority",
        attributes: ["issue_priority_id", "label", "code", "color_hex"],
      },
      {
        model: IssueCategory,
        as: "category",
        attributes: ["issue_category_id", "name", "code"],
      },
    ],
  });

  const stats = {
    total: issues.length,
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    resolved: 0,
    closed: 0,
    escalated_count: 0,
    by_priority: {},
    by_category: {},
  };

  for (const item of issues) {
    if (stats[item.status] !== undefined) {
      stats[item.status] += 1;
    }
    if (item.escalation_status && item.escalation_status !== "none") {
      stats.escalated_count += 1;
    }

    const pLabel = item.priority?.label || "Unassigned";
    stats.by_priority[pLabel] = (stats.by_priority[pLabel] || 0) + 1;

    const cName = item.category?.name || "Uncategorized";
    stats.by_category[cName] = (stats.by_category[cName] || 0) + 1;
  }

  return stats;
}

/**
 * Retrieve single regional issue details with full relations
 */
async function getIssueById(regionId, issueId, actor = {}) {
  const issue = await RegionalIssue.findOne({
    where: {
      regional_issue_id: issueId,
      region_id: regionId,
    },
    include: [
      {
        model: Region,
        as: "region",
        attributes: ["region_id", "name", "code"],
      },
      {
        model: RegionalStructure,
        as: "regionalStructure",
        attributes: ["regional_structure_id", "name", "level"],
      },
      {
        model: IssueCategory,
        as: "category",
        attributes: ["issue_category_id", "name", "code"],
      },
      {
        model: IssuePriority,
        as: "priority",
        attributes: ["issue_priority_id", "code", "label", "color_hex", "display_order"],
      },
      {
        model: FormConfigContainer,
        as: "formConfigContainer",
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
      {
        model: RegionalIssueHistory,
        as: "histories",
        include: [
          {
            model: User,
            as: "performer",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["created_at", "ASC"]],
      },
      {
        model: RegionalIssueComment,
        as: "comments",
        include: [
          {
            model: User,
            as: "author",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        order: [["created_at", "ASC"]],
      },
      {
        model: Attachment,
        as: "attachments",
        through: { attributes: [] },
      },
    ],
  });

  if (!issue) {
    const error = new Error("Regional issue not found in this region.");
    error.status = 404;
    throw error;
  }

  // Scope check
  const perms = (actor.permissions || []).map((p) => String(p).toLowerCase());
  const canReadAll =
    actor.isSuperAdmin ||
    perms.includes("regional_issues:read_all") ||
    perms.includes("regional_issues:manage");

  if (!canReadAll) {
    const isOwner = String(issue.raised_by) === String(actor.user_id);
    const isAssignee = String(issue.assigned_to) === String(actor.user_id);
    if (!isOwner && !isAssignee) {
      const error = new Error("Access denied: You do not have permission to view this regional issue.");
      error.status = 403;
      throw error;
    }
  }

  return issue;
}

/**
 * Create a new regional issue
 */
async function createIssue(regionId, payload, actor, req) {
  if (!payload.title || !payload.description) {
    const error = new Error("Title and description are required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const issueNumber = await generateRegionalIssueNumber(regionId, t);

    const issue = await RegionalIssue.create(
      {
        region_id: regionId,
        regional_structure_id:
          payload.regional_structure_id || actor.regional_structure_id || null,
        issue_number: issueNumber,
        title: payload.title.trim(),
        description: payload.description.trim(),
        issue_category_id: payload.issue_category_id || null,
        issue_priority_id: payload.issue_priority_id || null,
        form_config_container_id: payload.form_config_container_id || null,
        status: REGIONAL_ISSUE_STATUS.SUBMITTED,
        escalation_status: "none",
        raised_by: actor.user_id,
        assigned_to: payload.assigned_to || null,
        entity_type: payload.entity_type || null,
        entity_id: payload.entity_id || null,
        current_value: payload.current_value || null,
        suggested_value: payload.suggested_value || null,
        form_data: payload.form_data || {},
        justification: payload.justification || null,
      },
      { transaction: t }
    );

    // Attachments if provided
    if (Array.isArray(payload.attachment_ids) && payload.attachment_ids.length > 0) {
      const attachmentRows = payload.attachment_ids.map((attId) => ({
        regional_issue_id: issue.regional_issue_id,
        attachment_id: attId,
      }));
      await RegionalIssueAttachment.bulkCreate(attachmentRows, { transaction: t });
    }

    // Initial audit log
    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "created",
      performed_by: actor.user_id,
      notes: `Regional issue ${issueNumber} submitted.`,
      transaction: t,
    });

    return issue;
  });
}

/**
 * Update regional issue while in submitted status
 */
async function updateIssue(regionId, issueId, payload, actor, req) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanEditRegionalIssue(issue, actor.user_id, req);

  if (!isRegionalIssueEditable(issue.status)) {
    const error = new Error(
      `Issue cannot be edited in '${issue.status}' status. Only submitted issues can be modified.`
    );
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const updates = {};
    if (payload.title) updates.title = payload.title.trim();
    if (payload.description) updates.description = payload.description.trim();
    if (payload.issue_category_id !== undefined) updates.issue_category_id = payload.issue_category_id;
    if (payload.issue_priority_id !== undefined) updates.issue_priority_id = payload.issue_priority_id;
    if (payload.regional_structure_id !== undefined) updates.regional_structure_id = payload.regional_structure_id;
    if (payload.current_value !== undefined) updates.current_value = payload.current_value;
    if (payload.suggested_value !== undefined) updates.suggested_value = payload.suggested_value;
    if (payload.justification !== undefined) updates.justification = payload.justification;
    if (payload.form_data !== undefined) updates.form_data = payload.form_data;

    await issue.update(updates, { transaction: t });

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "updated",
      performed_by: actor.user_id,
      notes: "Issue details updated by raiser.",
      transaction: t,
    });

    return issue;
  });
}

/**
 * Assign or reassign issue
 */
async function assignIssue(regionId, issueId, assigneeId, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  if (assigneeId) {
    const targetUser = await User.findByPk(assigneeId);
    if (!targetUser || (targetUser.region_id && targetUser.region_id !== regionId)) {
      const error = new Error("Assignee must be an active user in the same region.");
      error.status = 400;
      throw error;
    }
  }

  const oldAssignee = issue.assigned_to;
  return await sequelize.transaction(async (t) => {
    await issue.update({ assigned_to: assigneeId || null }, { transaction: t });

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "assigned",
      field_name: "assigned_to",
      old_value: oldAssignee,
      new_value: assigneeId,
      performed_by: actor.user_id,
      notes: assigneeId ? `Assigned to user ${assigneeId}` : "Unassigned",
      transaction: t,
    });

    if (assigneeId) {
      emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.ASSIGNED, {
        regionId,
        issue,
        actor,
        recipients: [assigneeId],
      });
    }

    return issue;
  });
}

/**
 * Workflow Action: Start Review
 */
async function startReview(regionId, issueId, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanPerformRegionalIssueWorkflowAction(issue, actor.user_id, "review");
  assertValidRegionalTransition(issue.status, REGIONAL_ISSUE_STATUS.UNDER_REVIEW);

  return await sequelize.transaction(async (t) => {
    const oldStatus = issue.status;
    await issue.update({ status: REGIONAL_ISSUE_STATUS.UNDER_REVIEW }, { transaction: t });

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "status_changed",
      field_name: "status",
      old_value: oldStatus,
      new_value: REGIONAL_ISSUE_STATUS.UNDER_REVIEW,
      performed_by: actor.user_id,
      notes: "Review started.",
      transaction: t,
    });

    emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.REVIEW_STARTED, {
      regionId,
      issue,
      actor,
      recipients: [issue.raised_by],
    });

    return issue;
  });
}

/**
 * Workflow Action: Accept Issue
 */
async function acceptIssue(regionId, issueId, { assigned_to, response }, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanPerformRegionalIssueWorkflowAction(issue, actor.user_id, "accept");
  assertValidRegionalTransition(issue.status, REGIONAL_ISSUE_STATUS.ACCEPTED);

  return await sequelize.transaction(async (t) => {
    const oldStatus = issue.status;
    const updates = {
      status: REGIONAL_ISSUE_STATUS.ACCEPTED,
    };
    if (response) updates.response = response.trim();
    if (assigned_to) updates.assigned_to = assigned_to;

    await issue.update(updates, { transaction: t });

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "status_changed",
      field_name: "status",
      old_value: oldStatus,
      new_value: REGIONAL_ISSUE_STATUS.ACCEPTED,
      performed_by: actor.user_id,
      notes: response || "Issue accepted.",
      transaction: t,
    });

    emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.ACCEPTED, {
      regionId,
      issue,
      actor,
      recipients: [issue.raised_by, issue.assigned_to],
    });

    return issue;
  });
}

/**
 * Workflow Action: Reject Issue
 */
async function rejectIssue(regionId, issueId, { rejection_reason }, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanPerformRegionalIssueWorkflowAction(issue, actor.user_id, "reject");
  assertValidRegionalTransition(issue.status, REGIONAL_ISSUE_STATUS.REJECTED);

  if (!rejection_reason || !rejection_reason.trim()) {
    const error = new Error("Rejection reason is required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const oldStatus = issue.status;
    await issue.update(
      {
        status: REGIONAL_ISSUE_STATUS.REJECTED,
        rejection_reason: rejection_reason.trim(),
      },
      { transaction: t }
    );

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "status_changed",
      field_name: "status",
      old_value: oldStatus,
      new_value: REGIONAL_ISSUE_STATUS.REJECTED,
      performed_by: actor.user_id,
      notes: rejection_reason.trim(),
      transaction: t,
    });

    emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.REJECTED, {
      regionId,
      issue,
      actor,
      recipients: [issue.raised_by],
    });

    return issue;
  });
}

/**
 * Workflow Action: Resolve Issue
 */
async function resolveIssue(regionId, issueId, { resolution_notes }, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanPerformRegionalIssueWorkflowAction(issue, actor.user_id, "resolve");
  assertValidRegionalTransition(issue.status, REGIONAL_ISSUE_STATUS.RESOLVED);

  if (!resolution_notes || !resolution_notes.trim()) {
    const error = new Error("Resolution notes are required.");
    error.status = 400;
    throw error;
  }

  return await sequelize.transaction(async (t) => {
    const oldStatus = issue.status;
    await issue.update(
      {
        status: REGIONAL_ISSUE_STATUS.RESOLVED,
        resolution_notes: resolution_notes.trim(),
        resolved_at: new Date(),
      },
      { transaction: t }
    );

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "status_changed",
      field_name: "status",
      old_value: oldStatus,
      new_value: REGIONAL_ISSUE_STATUS.RESOLVED,
      performed_by: actor.user_id,
      notes: resolution_notes.trim(),
      transaction: t,
    });

    emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.RESOLVED, {
      regionId,
      issue,
      actor,
      recipients: [issue.raised_by],
    });

    return issue;
  });
}

/**
 * Workflow Action: Close Issue
 */
async function closeIssue(regionId, issueId, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  assertCanPerformRegionalIssueWorkflowAction(issue, actor.user_id, "close");
  assertValidRegionalTransition(issue.status, REGIONAL_ISSUE_STATUS.CLOSED);

  return await sequelize.transaction(async (t) => {
    const oldStatus = issue.status;
    await issue.update(
      {
        status: REGIONAL_ISSUE_STATUS.CLOSED,
        closed_at: new Date(),
      },
      { transaction: t }
    );

    await recordRegionalHistory({
      regional_issue_id: issue.regional_issue_id,
      action_type: "status_changed",
      field_name: "status",
      old_value: oldStatus,
      new_value: REGIONAL_ISSUE_STATUS.CLOSED,
      performed_by: actor.user_id,
      notes: "Issue formally closed.",
      transaction: t,
    });

    emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.CLOSED, {
      regionId,
      issue,
      actor,
      recipients: [issue.raised_by, issue.assigned_to],
    });

    return issue;
  });
}

/**
 * Add comment to regional issue
 */
async function addComment(regionId, issueId, { comment_text, is_internal = true }, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  if (!comment_text || !comment_text.trim()) {
    const error = new Error("Comment text cannot be empty.");
    error.status = 400;
    throw error;
  }

  const comment = await RegionalIssueComment.create({
    regional_issue_id: issueId,
    user_id: actor.user_id,
    comment_text: comment_text.trim(),
    is_internal: Boolean(is_internal),
  });

  emitRegionalIssueEvent(REGIONAL_ISSUE_EVENTS.COMMENT_ADDED, {
    regionId,
    issue,
    actor,
    recipients: [issue.raised_by, issue.assigned_to],
  });

  return comment;
}

/**
 * Link attachment to regional issue
 */
async function addAttachment(regionId, issueId, attachmentId, actor) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
  });
  if (!issue) {
    const error = new Error("Regional issue not found.");
    error.status = 404;
    throw error;
  }

  const attachment = await Attachment.findByPk(attachmentId);
  if (!attachment) {
    const error = new Error("Attachment not found.");
    error.status = 404;
    throw error;
  }

  await RegionalIssueAttachment.findOrCreate({
    where: { regional_issue_id: issueId, attachment_id: attachmentId },
  });

  await recordRegionalHistory({
    regional_issue_id: issueId,
    action_type: "attachment_added",
    performed_by: actor.user_id,
    notes: `Attachment ${attachment.file_name || attachmentId} added.`,
  });

  return { success: true };
}

/**
 * Retrieve regional issue attachment for secure download
 */
async function getRegionalIssueAttachmentForDownload(regionId, issueId, attachmentId) {
  const issue = await RegionalIssue.findOne({
    where: { regional_issue_id: issueId, region_id: regionId },
    attributes: ["regional_issue_id", "region_id", "issue_number"],
  });
  if (!issue) {
    const error = new Error("Regional issue not found in this region.");
    error.status = 404;
    throw error;
  }

  const link = await RegionalIssueAttachment.findOne({
    where: { regional_issue_id: issueId, attachment_id: attachmentId },
  });
  if (!link) {
    const error = new Error("Attachment does not belong to this regional issue.");
    error.status = 404;
    throw error;
  }

  const attachment = await Attachment.findByPk(attachmentId);
  if (!attachment) {
    const error = new Error("Attachment record not found.");
    error.status = 404;
    throw error;
  }

  return { issue, attachment };
}

module.exports = {
  generateRegionalIssueNumber,
  getIssues,
  getDashboard,
  getIssueById,
  createIssue,
  updateIssue,
  assignIssue,
  startReview,
  acceptIssue,
  rejectIssue,
  resolveIssue,
  closeIssue,
  addComment,
  addAttachment,
  getRegionalIssueAttachmentForDownload,
};
