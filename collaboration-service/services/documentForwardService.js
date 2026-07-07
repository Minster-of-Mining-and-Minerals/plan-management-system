"use strict";

const { getIntegrationAdapters } = require("./integrationContext");

const PLAN_API_URL = process.env.PLAN_API_URL || "http://localhost:4000/api";

async function sendForwardViaHttp(accessToken, payload) {
  const response = await fetch(`${PLAN_API_URL}/notifications/document-forward`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data?.message || "Failed to send document forward notification");
    error.status = response.status;
    throw error;
  }

  return response.json().catch(() => ({}));
}

async function forwardDocument({
  document,
  fromUser,
  recipientUserId,
  message,
  accessToken,
}) {
  const adapters = getIntegrationAdapters();
  const payload = {
    recipient_user_id: recipientUserId,
    document_id: document.document_id,
    document_title: document.title,
    message: message || null,
    sender_name: fromUser.full_name || fromUser.email || "A colleague",
    link_path: `/documents/${document.document_id}`,
  };

  if (adapters.sendDocumentForward) {
    await adapters.sendDocumentForward(fromUser, recipientUserId, document, message);
    return { delivered: true, mode: "integrated" };
  }

  await sendForwardViaHttp(accessToken, payload);
  return { delivered: true, mode: "http" };
}

module.exports = {
  forwardDocument,
};
