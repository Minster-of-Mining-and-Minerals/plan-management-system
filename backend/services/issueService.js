"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  Issue,
  IssueCategory,
  IssuePriority,
  IssueHistory,
  IssueAttachment,
  Attachment,
  User,
  sequelize,
} = require("../models");
const {
  assertValidTransition,
  isEditableStatus,
  STATUS_LABELS,
} = require("../utils/issueStatusUtils");
const {
  logIssueHistory,
  logFieldChange,
  logStatusChange,
} = require("./issueHistoryService");
const { buildIssueAccessScope, canViewIssue } = require("../utils/issuePermissionUtils");
const { validateRaisePlanReviewIssue } = require("./planReviewService");
const { emitIssueEvent, ISSUE_EVENTS } = require("./issueNotificationService");

const ISSUE_INCLUDES = [
  { model: IssueCategory, as: "category", attributes: ["issue_category_id", "name", "description"] },
  { model: IssuePriority, as: "priority", attributes: ["issue_priority_id", "code", "label", "color_hex"] },
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
    through: { attributes: [] },
  },
];

async function generateIssueNumber(transaction) {
  const year = new Date().getFullYear();
  const prefix = `ISS-${year}-`;

  const [result] = await sequelize.query(
    `SELECT issue_number FROM issues WHERE issue_number LIKE :prefix ORDER BY issue_number DESC LIMIT 1`,
    {
      replacements: { prefix: `${prefix}%` },
      transaction,
      type: sequelize.QueryTypes.SELECT,
    }
  );

  let nextSeq = 1;
  if (result?.issue_number) {
    const parts = result.issue_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

async function listPriorities({ isActive } = {}) {
  const where = {};
  if (isActive !== undefined) where.is_active = isActive;
  return IssuePriority.findAll({
    where,
    order: [
      ["display_order", "ASC"],
      ["label", "ASC"],
    ],
  });
}

async function getIssueById(id, { userId, userPermissions } = {}) {
  const issue = await Issue.findByPk(id, { include: ISSUE_INCLUDES });
  if (!issue) {
    const error = new Error("Issue not found");
    error.statusCode = 404;
    throw error;
  }

  if (userId && userPermissions && !canViewIssue(issue, userId, userPermissions)) {
    const error = new Error("You do not have permission to view this issue");
    error.statusCode = 403;
    throw error;
  }

  return issue;
}

async function listIssues(query, { userId, userPermissions }) {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    issue_category_id,
    issue_priority_id,
    raised_by,
    assigned_to,
    entity_type,
    entity_id,
    date_from,
    date_to,
    sort_by = "created_at",
    sort_order = "DESC",
  } = query;

  const accessScope = buildIssueAccessScope(userId, userPermissions);
  if (accessScope.type === "none") {
    return { rows: [], count: 0, page: Number(page), limit: Number(limit), totalPages: 0 };
  }

  const where = {};
  if (accessScope.type === "scoped") {
    Object.assign(where, accessScope.where);
  }

  if (status) where.status = status;
  if (issue_category_id) where.issue_category_id = issue_category_id;
  if (issue_priority_id) where.issue_priority_id = issue_priority_id;
  if (raised_by) where.raised_by = raised_by;
  if (assigned_to) where.assigned_to = assigned_to;
  if (entity_type) where.entity_type = entity_type;
  if (entity_id) where.entity_id = entity_id;

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at[Op.gte] = new Date(date_from);
    if (date_to) where.created_at[Op.lte] = new Date(date_to);
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { issue_number: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const allowedSortFields = ["created_at", "updated_at", "issue_number", "title", "status"];
  const orderField = allowedSortFields.includes(sort_by) ? sort_by : "created_at";
  const orderDir = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const { rows, count } = await Issue.findAndCountAll({
    where,
    include: ISSUE_INCLUDES,
    order: [[orderField, orderDir]],
    limit: Number(limit),
    offset,
    distinct: true,
  });

  return {
    rows,
    count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / Number(limit)),
  };
}

async function getIssueDashboardStats(query, { userId, userPermissions }) {
  const accessScope = buildIssueAccessScope(userId, userPermissions);
  if (accessScope.type === "none") {
    return {
      total: 0,
      submitted: 0,
      under_review: 0,
      accepted: 0,
      rejected: 0,
      resolved: 0,
      closed: 0,
    };
  }

  const where = {};
  if (accessScope.type === "scoped") {
    Object.assign(where, accessScope.where);
  }

  const {
    issue_category_id,
    issue_priority_id,
    raised_by,
    assigned_to,
    date_from,
    date_to,
  } = query || {};

  if (issue_category_id) where.issue_category_id = issue_category_id;
  if (issue_priority_id) where.issue_priority_id = issue_priority_id;
  if (raised_by) where.raised_by = raised_by;
  if (assigned_to) where.assigned_to = assigned_to;

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) where.created_at[Op.gte] = new Date(date_from);
    if (date_to) where.created_at[Op.lte] = new Date(date_to);
  }

  const issues = await Issue.findAll({
    where,
    attributes: ["status"],
    raw: true,
  });

  const stats = {
    total: issues.length,
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    resolved: 0,
    closed: 0,
  };

  for (const row of issues) {
    if (stats[row.status] !== undefined) {
      stats[row.status] += 1;
    }
  }

  return stats;
}

async function createIssue(data, userId, io = null) {
  const t = await sequelize.transaction();
  try {
    const category = await IssueCategory.findByPk(data.issue_category_id, { transaction: t });
    if (!category || !category.is_active) {
      const error = new Error("Invalid or inactive issue category");
      error.statusCode = 400;
      throw error;
    }

    const priority = await IssuePriority.findByPk(data.issue_priority_id, { transaction: t });
    if (!priority || !priority.is_active) {
      const error = new Error("Invalid or inactive issue priority");
      error.statusCode = 400;
      throw error;
    }

    const reviewSnapshotId = await validateRaisePlanReviewIssue(
      data.entity_type,
      data.entity_id,
      t
    );

    const issueNumber = await generateIssueNumber(t);

    const issue = await Issue.create(
      {
        issue_id: uuidv4(),
        issue_number: issueNumber,
        title: data.title,
        description: data.description,
        issue_category_id: data.issue_category_id,
        issue_priority_id: data.issue_priority_id,
        status: "submitted",
        raised_by: userId,
        assigned_to: data.assigned_to ?? null,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        review_snapshot_id: reviewSnapshotId,
        current_value: data.current_value ?? null,
        suggested_value: data.suggested_value ?? null,
        justification: data.justification,
        attachment_path: data.attachment_path ?? null,
      },
      { transaction: t }
    );

    if (data.attachment_ids?.length) {
      for (const attachmentId of data.attachment_ids) {
        await IssueAttachment.create(
          {
            issue_attachment_id: uuidv4(),
            issue_id: issue.issue_id,
            attachment_id: attachmentId,
          },
          { transaction: t }
        );
      }
    }

    await logIssueHistory(
      {
        issueId: issue.issue_id,
        actionType: "created",
        notes: "Issue submitted",
        performedBy: userId,
      },
      t
    );

    await t.commit();

    const fullIssue = await getIssueById(issue.issue_id);

    const recipients = [];
    if (fullIssue.assigned_to) {
      recipients.push({ user_id: fullIssue.assigned_to });
    }
    await emitIssueEvent(
      ISSUE_EVENTS.CREATED,
      { issue: fullIssue, actor: { user_id: userId }, recipients },
      io
    );

    if (fullIssue.assigned_to) {
      await emitIssueEvent(
        ISSUE_EVENTS.ASSIGNED,
        {
          issue: fullIssue,
          actor: { user_id: userId },
          recipients: [{ user_id: fullIssue.assigned_to }],
        },
        io
      );
    }

    return fullIssue;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function updateIssue(id, data, userId, userPermissions) {
  const issue = await getIssueById(id, { userId, userPermissions });

  if (!isEditableStatus(issue.status)) {
    const error = new Error("Only submitted issues can be edited");
    error.statusCode = 400;
    throw error;
  }

  const canUpdateAll = buildIssueAccessScope(userId, userPermissions).type === "all";
  if (!canUpdateAll && issue.raised_by !== userId) {
    const error = new Error("You can only edit issues you created");
    error.statusCode = 403;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const updates = {};
    const trackFields = [
      "title",
      "description",
      "issue_category_id",
      "issue_priority_id",
      "current_value",
      "suggested_value",
      "justification",
      "attachment_path",
      "assigned_to",
      "entity_type",
      "entity_id",
    ];

    for (const field of trackFields) {
      if (data[field] !== undefined && data[field] !== issue[field]) {
        await logFieldChange(
          {
            issueId: id,
            fieldName: field,
            oldValue: issue[field],
            newValue: data[field],
            performedBy: userId,
          },
          t
        );
        updates[field] = data[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      await issue.update(updates, { transaction: t });
    }

    const previousAssignee = issue.assigned_to;
    await t.commit();

    const fullIssue = await getIssueById(id);
    if (updates.assigned_to && updates.assigned_to !== previousAssignee) {
      await emitIssueEvent(
        ISSUE_EVENTS.ASSIGNED,
        {
          issue: fullIssue,
          actor: { user_id: userId },
          recipients: [{ user_id: updates.assigned_to }],
        }
      );
    }

    return fullIssue;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function transitionIssueStatus(id, toStatus, { userId, userPermissions, notes, fieldUpdates = {} }, io = null) {
  const issue = await getIssueById(id, { userId, userPermissions });
  const fromStatus = issue.status;

  assertValidTransition(fromStatus, toStatus);

  const t = await sequelize.transaction();
  try {
    const updates = { status: toStatus, ...fieldUpdates };

    if (toStatus === "resolved") {
      updates.resolved_at = new Date();
    }
    if (toStatus === "closed") {
      updates.closed_at = new Date();
    }

    await issue.update(updates, { transaction: t });

    await logStatusChange(
      {
        issueId: id,
        oldStatus: fromStatus,
        newStatus: toStatus,
        performedBy: userId,
        notes,
      },
      t
    );

    if (notes) {
      await logIssueHistory(
        {
          issueId: id,
          actionType: "notes",
          notes,
          performedBy: userId,
        },
        t
      );
    }

    await t.commit();

    const fullIssue = await getIssueById(id);
    const recipients = [{ user_id: fullIssue.raised_by }];
    if (fullIssue.assigned_to) {
      recipients.push({ user_id: fullIssue.assigned_to });
    }

    const eventMap = {
      under_review: null,
      accepted: ISSUE_EVENTS.ACCEPTED,
      rejected: ISSUE_EVENTS.REJECTED,
      resolved: ISSUE_EVENTS.RESOLVED,
      closed: ISSUE_EVENTS.CLOSED,
    };

    const eventType = eventMap[toStatus];
    if (eventType) {
      await emitIssueEvent(
        eventType,
        { issue: fullIssue, actor: { user_id: userId }, recipients },
        io
      );
    }

    return fullIssue;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function startReview(id, userId, userPermissions, io = null) {
  return transitionIssueStatus(id, "under_review", {
    userId,
    userPermissions,
    notes: "Review started",
  }, io);
}

async function acceptIssue(id, { reviewNotes }, userId, userPermissions, io = null) {
  return transitionIssueStatus(
    id,
    "accepted",
    {
      userId,
      userPermissions,
      notes: reviewNotes,
      fieldUpdates: { response: reviewNotes ?? null },
    },
    io
  );
}

async function rejectIssue(id, { rejectionReason }, userId, userPermissions, io = null) {
  if (!rejectionReason?.trim()) {
    const error = new Error("Rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  return transitionIssueStatus(
    id,
    "rejected",
    {
      userId,
      userPermissions,
      notes: rejectionReason,
      fieldUpdates: { rejection_reason: rejectionReason },
    },
    io
  );
}

async function resolveIssue(id, { resolutionNotes }, userId, userPermissions, io = null) {
  return transitionIssueStatus(
    id,
    "resolved",
    {
      userId,
      userPermissions,
      notes: resolutionNotes,
      fieldUpdates: { resolution_notes: resolutionNotes ?? null },
    },
    io
  );
}

async function closeIssue(id, userId, userPermissions, io = null) {
  return transitionIssueStatus(
    id,
    "closed",
    { userId, userPermissions, notes: "Issue closed" },
    io
  );
}

async function getIssueHistory(id, { userId, userPermissions }) {
  await getIssueById(id, { userId, userPermissions });

  return IssueHistory.findAll({
    where: { issue_id: id },
    include: [
      {
        model: User,
        as: "performer",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["created_at", "ASC"]],
  });
}

module.exports = {
  ISSUE_INCLUDES,
  listPriorities,
  getIssueById,
  listIssues,
  getIssueDashboardStats,
  createIssue,
  updateIssue,
  startReview,
  acceptIssue,
  rejectIssue,
  resolveIssue,
  closeIssue,
  getIssueHistory,
  STATUS_LABELS,
};
