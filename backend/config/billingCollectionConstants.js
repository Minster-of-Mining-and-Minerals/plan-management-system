"use strict";

const COLLECTION_REQUEST_STATUSES = [
  "pending",
  "partially_collected",
  "collected",
  "superseded",
  "cancelled",
];

const COLLECTION_REQUEST_SOURCES = ["manual", "workflow"];

const OPEN_COLLECTION_STATUSES = ["pending", "partially_collected"];

const BILLING_COLLECTION_PERMISSIONS = [
  { resource: "billing_collection", action: "send" },
  { resource: "billing_collection", action: "view" },
];

module.exports = {
  COLLECTION_REQUEST_STATUSES,
  COLLECTION_REQUEST_SOURCES,
  OPEN_COLLECTION_STATUSES,
  BILLING_COLLECTION_PERMISSIONS,
};
