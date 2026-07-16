"use strict";

const { sendNotification } = require("../../utils/notification");
const { amendmentTypeLabel } = require("../../utils/planAmendmentTypes");

const PLAN_AMENDMENT_EVENTS = {
  SUBMITTED: "plan_amendment_submitted",
  APPROVED: "plan_amendment_approved",
  REJECTED: "plan_amendment_rejected",
  APPLIED: "plan_amendment_applied",
};

function buildPlanAmendmentLink(masterPlanVersionId, amendmentType = null) {
  const focus =
    amendmentType === "target_reallocation" ? "reallocation" : "amendment";
  return `/plans/${masterPlanVersionId}?tab=hierarchy&focus=${focus}`;
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

async function emitPlanAmendmentSubmittedEvent(
  { amendment, approvers = [], actor = null },
  io = null
) {
  const recipients = normalizeRecipients(approvers, actor?.user_id);
  if (!recipients.length) {
    return [];
  }

  const typeLabel = amendmentTypeLabel(amendment.amendment_type);

  return sendNotification(
    recipients,
    {
      category: "plans",
      notification_type: PLAN_AMENDMENT_EVENTS.SUBMITTED,
      title: "Plan amendment pending approval",
      message: `${actor?.full_name || "A requester"} submitted "${amendment.title}" (${typeLabel}) for approval.`,
      related_entity_type: "plan_amendment",
      related_entity_id: amendment.plan_amendment_id,
      link_path: buildPlanAmendmentLink(
        amendment.master_plan_version_id,
        amendment.amendment_type
      ),
      icon_variant: "clipboard-list",
      priority: "normal",
      metadata: {
        event_type: PLAN_AMENDMENT_EVENTS.SUBMITTED,
        plan_amendment_id: amendment.plan_amendment_id,
        master_plan_version_id: amendment.master_plan_version_id,
        amendment_type: amendment.amendment_type,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitPlanAmendmentApprovedEvent(
  { amendment, recipients = [], actor = null },
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
      notification_type: PLAN_AMENDMENT_EVENTS.APPROVED,
      title: "Plan amendment approved",
      message: `Your amendment "${amendment.title}" was approved and applied.`,
      related_entity_type: "plan_amendment",
      related_entity_id: amendment.plan_amendment_id,
      link_path: buildPlanAmendmentLink(
        amendment.master_plan_version_id,
        amendment.amendment_type
      ),
      icon_variant: "target",
      priority: "normal",
      metadata: {
        event_type: PLAN_AMENDMENT_EVENTS.APPROVED,
        plan_amendment_id: amendment.plan_amendment_id,
        master_plan_version_id: amendment.master_plan_version_id,
        amendment_type: amendment.amendment_type,
        version: amendment.version ?? null,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitPlanAmendmentRejectedEvent(
  { amendment, recipients = [], actor = null, comment = null },
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
      notification_type: PLAN_AMENDMENT_EVENTS.REJECTED,
      title: "Plan amendment rejected",
      message: `Your amendment "${amendment.title}" was rejected.${commentSuffix}`,
      related_entity_type: "plan_amendment",
      related_entity_id: amendment.plan_amendment_id,
      link_path: buildPlanAmendmentLink(
        amendment.master_plan_version_id,
        amendment.amendment_type
      ),
      icon_variant: "shield-alert",
      priority: "normal",
      metadata: {
        event_type: PLAN_AMENDMENT_EVENTS.REJECTED,
        plan_amendment_id: amendment.plan_amendment_id,
        master_plan_version_id: amendment.master_plan_version_id,
        amendment_type: amendment.amendment_type,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

async function emitPlanAmendmentAppliedEvent(
  { amendment, recipients = [], actor = null },
  io = null
) {
  // Alias of approved for callers that want an explicit "applied" event name.
  return emitPlanAmendmentApprovedEvent({ amendment, recipients, actor }, io);
}

module.exports = {
  PLAN_AMENDMENT_EVENTS,
  buildPlanAmendmentLink,
  emitPlanAmendmentSubmittedEvent,
  emitPlanAmendmentApprovedEvent,
  emitPlanAmendmentRejectedEvent,
  emitPlanAmendmentAppliedEvent,
};
