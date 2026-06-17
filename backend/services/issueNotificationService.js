"use strict";

const { sendNotification } = require("../utils/notification");

const ISSUE_EVENTS = {
  CREATED: "issue_created",
  ASSIGNED: "issue_assigned",
  ACCEPTED: "issue_accepted",
  REJECTED: "issue_rejected",
  RESOLVED: "issue_resolved",
  CLOSED: "issue_closed",
};

function buildIssueLink(issueId) {
  return `/issues/${issueId}`;
}

/**
 * Notification hooks for issue lifecycle events.
 * Channel integration is deferred; events are emitted via in-app notifications when recipients exist.
 */
async function emitIssueEvent(eventType, { issue, actor, recipients = [], extra = {} }, io = null) {
  if (!issue) return [];

  const issueNumber = issue.issue_number || issue.issueNumber;
  const title = issue.title;
  const linkPath = buildIssueLink(issue.issue_id || issue.issueId);

  const templates = {
    [ISSUE_EVENTS.CREATED]: {
      title: `New issue ${issueNumber}`,
      message: `Issue "${title}" has been submitted.`,
      notification_type: ISSUE_EVENTS.CREATED,
    },
    [ISSUE_EVENTS.ASSIGNED]: {
      title: `Issue assigned: ${issueNumber}`,
      message: `You have been assigned issue "${title}".`,
      notification_type: ISSUE_EVENTS.ASSIGNED,
    },
    [ISSUE_EVENTS.ACCEPTED]: {
      title: `Issue accepted: ${issueNumber}`,
      message: `Issue "${title}" has been accepted.`,
      notification_type: ISSUE_EVENTS.ACCEPTED,
    },
    [ISSUE_EVENTS.REJECTED]: {
      title: `Issue rejected: ${issueNumber}`,
      message: `Issue "${title}" has been rejected.`,
      notification_type: ISSUE_EVENTS.REJECTED,
    },
    [ISSUE_EVENTS.RESOLVED]: {
      title: `Issue resolved: ${issueNumber}`,
      message: `Issue "${title}" has been resolved.`,
      notification_type: ISSUE_EVENTS.RESOLVED,
    },
    [ISSUE_EVENTS.CLOSED]: {
      title: `Issue closed: ${issueNumber}`,
      message: `Issue "${title}" has been closed.`,
      notification_type: ISSUE_EVENTS.CLOSED,
    },
  };

  const template = templates[eventType];
  if (!template) return [];

  const normalizedRecipients = (recipients || [])
    .map((r) => ({ user_id: r.user_id || r.id || r }))
    .filter((r) => r.user_id);

  if (normalizedRecipients.length === 0) return [];

  return sendNotification(
    normalizedRecipients,
    {
      category: "issues",
      notification_type: template.notification_type,
      title: template.title,
      message: template.message,
      related_entity_type: "issue",
      related_entity_id: issue.issue_id || issue.issueId,
      link_path: linkPath,
      icon_variant: "alert-circle",
      priority: "normal",
      metadata: {
        event_type: eventType,
        issue_number: issueNumber,
        actor_id: actor?.user_id || actor?.id || null,
        ...extra,
      },
    },
    io
  );
}

module.exports = {
  ISSUE_EVENTS,
  emitIssueEvent,
  buildIssueLink,
};
