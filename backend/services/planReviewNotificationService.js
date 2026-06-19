"use strict";

const { sendNotification } = require("../utils/notification");

const PLAN_REVIEW_EVENTS = {
  PUBLISHED: "plan_published_for_review",
  REOPENED: "review_reopened",
  COMPLETED: "review_completed",
};

function buildPlanLink(masterVersionId) {
  return `/plans/review/${masterVersionId}`;
}

async function emitPlanReviewEvent(
  eventType,
  { master, actor, recipients = [], reviewSnapshotId = null, reviewVersionNumber = null },
  io = null
) {
  if (!master) return [];

  const reviewVersionLabel =
    reviewVersionNumber != null ? ` (Review v${reviewVersionNumber})` : "";

  const templates = {
    [PLAN_REVIEW_EVENTS.PUBLISHED]: {
      title: "Plan published for review",
      message: `A plan has been published for review${reviewVersionLabel}. You can validate and comment on your assigned sections.`,
      notification_type: PLAN_REVIEW_EVENTS.PUBLISHED,
    },
    [PLAN_REVIEW_EVENTS.REOPENED]: {
      title: "Plan review reopened",
      message: `A plan has been republished for review${reviewVersionLabel}. You can validate and comment on your assigned sections.`,
      notification_type: PLAN_REVIEW_EVENTS.REOPENED,
    },
    [PLAN_REVIEW_EVENTS.COMPLETED]: {
      title: `Plan review completed: ${master.draft_name}`,
      message: `Review for "${master.draft_name}" has been completed.`,
      notification_type: PLAN_REVIEW_EVENTS.COMPLETED,
    },
  };

  const template = templates[eventType];
  if (!template) return [];

  const normalizedRecipients = (recipients || [])
    .map((r) => ({ user_id: r.user_id || r.id || r }))
    .filter((r) => r.user_id);

  if (normalizedRecipients.length === 0) return [];

  const reviewLinkId =
    reviewSnapshotId || master.active_review_snapshot_id || master.plan_version_id;

  return sendNotification(
    normalizedRecipients,
    {
      category: "plans",
      notification_type: template.notification_type,
      title: template.title,
      message: template.message,
      related_entity_type: "plan_version",
      related_entity_id: reviewLinkId,
      link_path: buildPlanLink(reviewLinkId),
      icon_variant: "clipboard-check",
      priority: "normal",
      metadata: {
        event_type: eventType,
        plan_version_id: master.plan_version_id,
        review_snapshot_id: reviewLinkId,
        review_version_number: reviewVersionNumber,
        actor_id: actor?.user_id || null,
      },
    },
    io
  );
}

module.exports = {
  PLAN_REVIEW_EVENTS,
  emitPlanReviewEvent,
};
