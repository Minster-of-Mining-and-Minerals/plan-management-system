"use strict";

const { sendNotification } = require("../utils/notification");

const REGIONAL_ISSUE_EVENTS = {
  CREATED: "regional_issue_created",
  ASSIGNED: "regional_issue_assigned",
  REVIEW_STARTED: "regional_issue_review_started",
  ACCEPTED: "regional_issue_accepted",
  REJECTED: "regional_issue_rejected",
  RESOLVED: "regional_issue_resolved",
  CLOSED: "regional_issue_closed",
  COMMENT_ADDED: "regional_issue_comment_added",
  ESCALATED: "regional_issue_escalated",
};

function buildRegionalIssueLink(regionId, issueId) {
  return `/${regionId}/issues/${issueId}`;
}

async function emitRegionalIssueEvent(
  eventType,
  { regionId, issue, actor, recipients = [], extra = {} }
) {
  if (!issue) return [];

  const issueNumber = issue.issue_number || issue.issueNumber;
  const title = issue.title;
  const linkPath = buildRegionalIssueLink(regionId, issue.regional_issue_id || issue.issue_id);

  const templates = {
    [REGIONAL_ISSUE_EVENTS.CREATED]: {
      title: `Regional Issue: ${issueNumber}`,
      message: `Issue "${title}" has been submitted in your region.`,
      notification_type: REGIONAL_ISSUE_EVENTS.CREATED,
    },
    [REGIONAL_ISSUE_EVENTS.ASSIGNED]: {
      title: `Regional Issue Assigned: ${issueNumber}`,
      message: `You have been assigned regional issue "${title}".`,
      notification_type: REGIONAL_ISSUE_EVENTS.ASSIGNED,
    },
    [REGIONAL_ISSUE_EVENTS.REVIEW_STARTED]: {
      title: `Review Started: ${issueNumber}`,
      message: `Regional issue "${title}" is now under review.`,
      notification_type: REGIONAL_ISSUE_EVENTS.REVIEW_STARTED,
    },
    [REGIONAL_ISSUE_EVENTS.ACCEPTED]: {
      title: `Regional Issue Accepted: ${issueNumber}`,
      message: `Regional issue "${title}" has been accepted for resolution.`,
      notification_type: REGIONAL_ISSUE_EVENTS.ACCEPTED,
    },
    [REGIONAL_ISSUE_EVENTS.REJECTED]: {
      title: `Regional Issue Rejected: ${issueNumber}`,
      message: `Regional issue "${title}" was rejected.`,
      notification_type: REGIONAL_ISSUE_EVENTS.REJECTED,
    },
    [REGIONAL_ISSUE_EVENTS.RESOLVED]: {
      title: `Regional Issue Resolved: ${issueNumber}`,
      message: `Regional issue "${title}" has been resolved.`,
      notification_type: REGIONAL_ISSUE_EVENTS.RESOLVED,
    },
    [REGIONAL_ISSUE_EVENTS.CLOSED]: {
      title: `Regional Issue Closed: ${issueNumber}`,
      message: `Regional issue "${title}" has been closed.`,
      notification_type: REGIONAL_ISSUE_EVENTS.CLOSED,
    },
    [REGIONAL_ISSUE_EVENTS.COMMENT_ADDED]: {
      title: `New Comment on ${issueNumber}`,
      message: `A new comment was added to regional issue "${title}".`,
      notification_type: REGIONAL_ISSUE_EVENTS.COMMENT_ADDED,
    },
  };

  const template = templates[eventType] || {
    title: `Regional Issue Update: ${issueNumber}`,
    message: `Issue "${title}" status has been updated.`,
    notification_type: eventType,
  };

  const uniqueRecipientIds = [...new Set(recipients.filter(Boolean))].filter(
    (id) => !actor || String(id) !== String(actor.user_id)
  );

  if (uniqueRecipientIds.length === 0) return [];

  const recipientObjects = uniqueRecipientIds.map((userId) => ({ user_id: userId }));

  try {
    return await sendNotification(recipientObjects, {
      title: template.title,
      message: template.message,
      notification_type: template.notification_type,
      related_entity_type: "regional_issue",
      related_entity_id: issue.regional_issue_id || issue.issue_id,
      link_path: linkPath,
      priority: extra.priority || "normal",
    });
  } catch (err) {
    console.warn(`[RegionalIssueNotification] failed:`, err.message);
    return [];
  }
}

module.exports = {
  REGIONAL_ISSUE_EVENTS,
  buildRegionalIssueLink,
  emitRegionalIssueEvent,
};
