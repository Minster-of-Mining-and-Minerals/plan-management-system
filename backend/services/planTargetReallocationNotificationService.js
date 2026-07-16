"use strict";

const { sendNotification } = require("../utils/notification");

const TARGET_REALLOCATION_EVENTS = {
  SUBMITTED: "plan_target_reallocation_submitted",
  APPROVED: "plan_target_reallocation_approved",
  REJECTED: "plan_target_reallocation_rejected",
};

function buildTargetReallocationLink(masterPlanVersionId) {
  return `/plans/${masterPlanVersionId}?tab=hierarchy&focus=reallocation`;
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

async function emitTargetReallocationSubmittedEvent(
  {
    request,
    kpiTitle,
    fromPeriodLabel = null,
    toPeriodLabel = null,
    approvers = [],
    actor = null,
  },
  io = null
) {
  const recipients = normalizeRecipients(approvers, actor?.user_id);
  if (!recipients.length) {
    return [];
  }

  const fromLabel = fromPeriodLabel || "source period";
  const toLabel = toPeriodLabel || "destination period";

  return sendNotification(
    recipients,
    {
      category: "plans",
      notification_type: TARGET_REALLOCATION_EVENTS.SUBMITTED,
      title: "Target reallocation pending approval",
      message: `${actor?.full_name || "A requester"} requested moving ${request.amount} on "${kpiTitle}" from ${fromLabel} to ${toLabel}.`,
      related_entity_type: "target_reallocation_request",
      related_entity_id: request.target_reallocation_request_id,
      link_path: buildTargetReallocationLink(request.master_plan_version_id),
      icon_variant: "clipboard-list",
      priority: "normal",
      metadata: {
        event_type: TARGET_REALLOCATION_EVENTS.SUBMITTED,
        target_reallocation_request_id: request.target_reallocation_request_id,
        master_plan_version_id: request.master_plan_version_id,
        amount: request.amount,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitTargetReallocationApprovedEvent(
  { request, kpiTitle, recipients = [], actor = null },
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
      notification_type: TARGET_REALLOCATION_EVENTS.APPROVED,
      title: "Target reallocation approved",
      message: `Your target reallocation for "${kpiTitle}" (${request.amount}) was approved and applied.`,
      related_entity_type: "target_reallocation_request",
      related_entity_id: request.target_reallocation_request_id,
      link_path: buildTargetReallocationLink(request.master_plan_version_id),
      icon_variant: "target",
      priority: "normal",
      metadata: {
        event_type: TARGET_REALLOCATION_EVENTS.APPROVED,
        target_reallocation_request_id: request.target_reallocation_request_id,
        master_plan_version_id: request.master_plan_version_id,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitTargetReallocationRejectedEvent(
  { request, kpiTitle, recipients = [], actor = null, comment = null },
  io = null
) {
  const normalized = normalizeRecipients(recipients, actor?.user_id);
  if (!normalized.length) {
    return [];
  }

  const commentSuffix = comment ? ` Comment: ${comment}` : "";

  return sendNotification(
    normalized,
    {
      category: "plans",
      notification_type: TARGET_REALLOCATION_EVENTS.REJECTED,
      title: "Target reallocation rejected",
      message: `Your target reallocation for "${kpiTitle}" (${request.amount}) was rejected.${commentSuffix}`,
      related_entity_type: "target_reallocation_request",
      related_entity_id: request.target_reallocation_request_id,
      link_path: buildTargetReallocationLink(request.master_plan_version_id),
      icon_variant: "shield-alert",
      priority: "normal",
      metadata: {
        event_type: TARGET_REALLOCATION_EVENTS.REJECTED,
        target_reallocation_request_id: request.target_reallocation_request_id,
        master_plan_version_id: request.master_plan_version_id,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

module.exports = {
  TARGET_REALLOCATION_EVENTS,
  emitTargetReallocationSubmittedEvent,
  emitTargetReallocationApprovedEvent,
  emitTargetReallocationRejectedEvent,
};
