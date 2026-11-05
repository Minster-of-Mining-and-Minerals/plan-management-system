"use strict";

const { Op } = require("sequelize");
const { sendNotification } = require("../utils/notification");
const { Notification, RegionalPlanNode, RegionalInternalAssignment, User } = require("../models");

const REGIONAL_PLAN_EVENTS = {
  REVIEW_PUBLISHED: "regional_plan_published_for_review",
  REVIEW_REOPENED: "regional_plan_review_reopened",
  REVIEW_COMPLETED: "regional_plan_review_completed",
  ACHIEVEMENT_SUBMITTED: "regional_plan_achievement_submitted",
  ACHIEVEMENT_APPROVED: "regional_plan_achievement_approved",
  ACHIEVEMENT_REJECTED: "regional_plan_achievement_rejected",
  ACHIEVEMENT_PENDING_VALIDATION: "regional_plan_achievement_pending_validation",
  ACHIEVEMENT_VALIDATED: "regional_plan_achievement_validated",
  ACHIEVEMENT_VALIDATION_REJECTED: "regional_plan_achievement_validation_rejected",
};

function buildRegionalPlanReviewLink(regionId, versionId) {
  return `/${regionId}/plans/${versionId}?tab=review`;
}

function buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, nodeId) {
  return `/${regionId}/plans/${periodVersionId}/nodes/${nodeId}?focus=achievement`;
}

function normalizeRecipients(recipients = [], excludeUserId = null) {
  const seen = new Set();
  const normalized = [];

  for (const recipient of recipients) {
    const userId = recipient?.user_id || recipient?.id || recipient;
    if (!userId || userId === excludeUserId || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    normalized.push({ user_id: userId });
  }

  return normalized;
}

/**
 * Resolves all assigned entities/users across a regional plan hierarchy.
 */
async function getRegionalReviewRecipients(versionId, regionId, transaction = null) {
  const nodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: versionId, is_active: true },
    attributes: ["regional_plan_node_id"],
    transaction,
  });
  const nodeIds = nodes.map((n) => n.regional_plan_node_id);
  if (!nodeIds.length) return [];

  const assignments = await RegionalInternalAssignment.findAll({
    where: { regional_plan_node_id: { [Op.in]: nodeIds }, is_active: true },
    transaction,
  });

  const recipientUserIds = new Set();
  const structureIdsToLookup = new Set();

  for (const a of assignments) {
    if (a.assigned_user_id) {
      recipientUserIds.add(a.assigned_user_id);
    } else if (a.regional_structure_id) {
      structureIdsToLookup.add(a.regional_structure_id);
    }
  }

  if (structureIdsToLookup.size > 0) {
    const structureUsers = await User.findAll({
      where: {
        region_id: regionId,
        regional_structure_id: { [Op.in]: Array.from(structureIdsToLookup) },
        is_active: true,
      },
      attributes: ["user_id"],
      transaction,
    });
    for (const u of structureUsers) {
      recipientUserIds.add(u.user_id);
    }
  }

  return Array.from(recipientUserIds).map((user_id) => ({ user_id }));
}

/**
 * Emits plan review lifecycle notifications with deduplication.
 */
async function emitRegionalPlanReviewEvent(
  eventType,
  { version, regionId, actor = null, recipients = [] },
  io = null
) {
  if (!version) return [];

  const templates = {
    [REGIONAL_PLAN_EVENTS.REVIEW_PUBLISHED]: {
      title: "Regional Plan published for review",
      message: `Regional plan "${version.draft_name}" has been published for review. You can validate and comment on your assigned sections.`,
      notification_type: REGIONAL_PLAN_EVENTS.REVIEW_PUBLISHED,
    },
    [REGIONAL_PLAN_EVENTS.REVIEW_REOPENED]: {
      title: "Regional Plan review reopened",
      message: `Regional plan "${version.draft_name}" review has been reopened for corrections.`,
      notification_type: REGIONAL_PLAN_EVENTS.REVIEW_REOPENED,
    },
    [REGIONAL_PLAN_EVENTS.REVIEW_COMPLETED]: {
      title: `Regional Plan review completed: ${version.draft_name}`,
      message: `Review for "${version.draft_name}" has been completed.`,
      notification_type: REGIONAL_PLAN_EVENTS.REVIEW_COMPLETED,
    },
  };

  const template = templates[eventType];
  if (!template) return [];

  const actorId = actor?.user_id || null;
  const rawRecipients = (recipients || [])
    .map((r) => r.user_id || r.id || r)
    .filter((id) => id && id !== actorId);

  const uniqueRecipients = [...new Set(rawRecipients)];
  if (uniqueRecipients.length === 0) return [];

  const publishedAtIso = version.published_for_review_at
    ? new Date(version.published_for_review_at).toISOString()
    : null;

  // Deduplication check: prevent creating duplicate notifications for same event & publication cycle
  const filteredRecipients = [];
  for (const userId of uniqueRecipients) {
    const existing = await Notification.findOne({
      where: {
        recipient_id: userId,
        notification_type: template.notification_type,
        related_entity_type: "regional_plan_version",
        related_entity_id: version.regional_plan_version_id,
        ...(publishedAtIso ? { metadata: { published_at: publishedAtIso } } : {}),
      },
    });

    if (!existing) {
      filteredRecipients.push({ user_id: userId });
    }
  }

  if (filteredRecipients.length === 0) return [];

  return sendNotification(
    filteredRecipients,
    {
      category: "plans",
      notification_type: template.notification_type,
      title: template.title,
      message: template.message,
      related_entity_type: "regional_plan_version",
      related_entity_id: version.regional_plan_version_id,
      link_path: buildRegionalPlanReviewLink(regionId, version.regional_plan_version_id),
      icon_variant: "clipboard-check",
      priority: "normal",
      metadata: {
        event_type: eventType,
        plan_version_id: version.regional_plan_version_id,
        region_id: regionId,
        actor_id: actorId,
        published_at: publishedAtIso,
      },
    },
    io
  );
}

/**
 * Achievement submitted notification to approvers.
 */
async function emitRegionalAchievementSubmittedEvent(
  { node, periodVersionId, regionId, approvers = [], actor = null },
  io = null
) {
  const recipients = normalizeRecipients(approvers, actor?.user_id);
  if (!recipients.length) return [];

  return sendNotification(
    recipients,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_SUBMITTED,
      title: "Achievement pending approval",
      message: `${actor?.full_name || "An assigned officer"} submitted achievement for "${node.title}". Review and approve or reject.`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "clipboard-check",
      priority: "normal",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_SUBMITTED,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        period_actual: node.period_actual,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

/**
 * Achievement approved notification to executor.
 */
async function emitRegionalAchievementApprovedEvent(
  { node, periodVersionId, regionId, recipients = [], actor = null, pendingValidation = false },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) return [];

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_APPROVED,
      title: pendingValidation ? "Achievement execution-approved" : "Achievement approved",
      message: pendingValidation
        ? `Achievement for "${node.title}" was approved by your department and is pending cross-branch validation.`
        : `Achievement for "${node.title}" was approved and now counts toward regional plan progress.`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "check-circle",
      priority: "normal",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_APPROVED,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        pending_validation: pendingValidation,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

/**
 * Achievement rejected notification to executor.
 */
async function emitRegionalAchievementRejectedEvent(
  { node, periodVersionId, regionId, recipients = [], actor = null, comment = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) return [];

  const suffix = comment ? ` Reason: ${comment}` : "";

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_REJECTED,
      title: "Achievement rejected",
      message: `Achievement for "${node.title}" was rejected. Please revise and resubmit.${suffix}`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "alert-circle",
      priority: "high",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_REJECTED,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        rejection_comment: comment,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

/**
 * Achievement pending validation notification to validators.
 */
async function emitRegionalAchievementPendingValidationEvent(
  { node, periodVersionId, regionId, validators = [], actor = null },
  io = null
) {
  const recipients = normalizeRecipients(validators, actor?.user_id);
  if (!recipients.length) return [];

  return sendNotification(
    recipients,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_PENDING_VALIDATION,
      title: "Achievement pending validation",
      message: `Achievement for "${node.title}" is awaiting your cross-branch validation before counting toward plan progress.`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "shield-check",
      priority: "normal",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_PENDING_VALIDATION,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

/**
 * Achievement validated notification to executor and approver.
 */
async function emitRegionalAchievementValidatedEvent(
  { node, periodVersionId, regionId, recipients = [], actor = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) return [];

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_VALIDATED,
      title: "Achievement validated",
      message: `Achievement for "${node.title}" was validated and now counts toward regional plan progress.`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "check-circle",
      priority: "normal",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_VALIDATED,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        validated_by: actor?.user_id || null,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

/**
 * Validation rejected notification to executor and approver.
 */
async function emitRegionalAchievementValidationRejectedEvent(
  { node, periodVersionId, regionId, recipients = [], actor = null, comment = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) return [];

  const suffix = comment ? ` Reason: ${comment}` : "";

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_VALIDATION_REJECTED,
      title: "Validation rejected",
      message: `Validation was rejected for "${node.title}". Please update and resubmit.${suffix}`,
      related_entity_type: "regional_plan_node",
      related_entity_id: node.regional_plan_node_id,
      link_path: buildRegionalPlanNodeAchievementLink(regionId, periodVersionId, node.regional_plan_node_id),
      icon_variant: "alert-circle",
      priority: "high",
      metadata: {
        event_type: REGIONAL_PLAN_EVENTS.ACHIEVEMENT_VALIDATION_REJECTED,
        plan_node_id: node.regional_plan_node_id,
        plan_version_id: periodVersionId,
        region_id: regionId,
        rejection_comment: comment,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

module.exports = {
  REGIONAL_PLAN_EVENTS,
  getRegionalReviewRecipients,
  emitRegionalPlanReviewEvent,
  emitRegionalAchievementSubmittedEvent,
  emitRegionalAchievementApprovedEvent,
  emitRegionalAchievementRejectedEvent,
  emitRegionalAchievementPendingValidationEvent,
  emitRegionalAchievementValidatedEvent,
  emitRegionalAchievementValidationRejectedEvent,
};

