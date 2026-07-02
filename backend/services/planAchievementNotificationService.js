"use strict";

const { sendNotification } = require("../utils/notification");

const PLAN_ACHIEVEMENT_EVENTS = {
  SUBMITTED: "plan_achievement_submitted",
  APPROVED: "plan_achievement_approved",
  REJECTED: "plan_achievement_rejected",
};

function buildPlanNodeAchievementLink(periodVersionId, planNodeId) {
  return `/plans/${periodVersionId}/nodes/${planNodeId}?focus=achievement`;
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

async function emitAchievementSubmittedEvent(
  { node, periodVersionId, approvers = [], actor = null },
  io = null
) {
  const recipients = normalizeRecipients(approvers, actor?.user_id);
  if (!recipients.length) {
    return [];
  }

  return sendNotification(
    recipients,
    {
      category: "plans",
      notification_type: PLAN_ACHIEVEMENT_EVENTS.SUBMITTED,
      title: "Achievement pending approval",
      message: `${actor?.full_name || "An executor"} submitted achievement for "${node.title}". Review and approve or reject.`,
      related_entity_type: "plan_node",
      related_entity_id: node.plan_node_id,
      link_path: buildPlanNodeAchievementLink(periodVersionId, node.plan_node_id),
      icon_variant: "clipboard-check",
      priority: "normal",
      metadata: {
        event_type: PLAN_ACHIEVEMENT_EVENTS.SUBMITTED,
        plan_node_id: node.plan_node_id,
        plan_version_id: periodVersionId,
        period_actual: node.period_actual,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitAchievementApprovedEvent(
  { node, periodVersionId, recipients = [], actor = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) {
    return [];
  }

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: PLAN_ACHIEVEMENT_EVENTS.APPROVED,
      title: "Achievement approved",
      message: `Achievement for "${node.title}" was approved and now counts toward plan progress.`,
      related_entity_type: "plan_node",
      related_entity_id: node.plan_node_id,
      link_path: buildPlanNodeAchievementLink(periodVersionId, node.plan_node_id),
      icon_variant: "check-circle",
      priority: "normal",
      metadata: {
        event_type: PLAN_ACHIEVEMENT_EVENTS.APPROVED,
        plan_node_id: node.plan_node_id,
        plan_version_id: periodVersionId,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitAchievementRejectedEvent(
  { node, periodVersionId, recipients = [], actor = null, comment = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) {
    return [];
  }

  const suffix = comment ? ` Comment: ${comment}` : "";

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: PLAN_ACHIEVEMENT_EVENTS.REJECTED,
      title: "Achievement rejected",
      message: `Achievement for "${node.title}" was rejected. Update and resubmit.${suffix}`,
      related_entity_type: "plan_node",
      related_entity_id: node.plan_node_id,
      link_path: buildPlanNodeAchievementLink(periodVersionId, node.plan_node_id),
      icon_variant: "alert-circle",
      priority: "high",
      metadata: {
        event_type: PLAN_ACHIEVEMENT_EVENTS.REJECTED,
        plan_node_id: node.plan_node_id,
        plan_version_id: periodVersionId,
        rejection_comment: comment,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

module.exports = {
  PLAN_ACHIEVEMENT_EVENTS,
  emitAchievementSubmittedEvent,
  emitAchievementApprovedEvent,
  emitAchievementRejectedEvent,
};
