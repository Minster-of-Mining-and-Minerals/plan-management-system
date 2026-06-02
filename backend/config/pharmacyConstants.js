"use strict";

const PHARMACY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

const PHARMACY_PRESCRIPTION_STATUS = {
  RECEIVED: "received",
  REVIEWING: "reviewing",
  PREPARING: "preparing",
  PARTIALLY_DISPENSED: "partially_dispensed",
  DISPENSED: "dispensed",
  UNAVAILABLE: "unavailable",
  REJECTED: "rejected",
  COMPLETED: "completed",
};

const PHARMACY_ITEM_STATUS = {
  PENDING: "pending",
  DISPENSED: "dispensed",
  PARTIAL: "partial",
  UNAVAILABLE: "unavailable",
  SUBSTITUTED: "substituted",
};

const PHARMACY_USER_ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
};

const PHARMACY_PRESCRIPTION_STATUS_LIST = Object.values(
  PHARMACY_PRESCRIPTION_STATUS
);

const PHARMACY_FORWARD_STATUS = {
  SENT: "sent",
  FORWARDED: "forwarded",
};

const PHARMACY_FORWARD_ACTION = {
  CREATED: "created",
  PHARMACY_CHANGED: "pharmacy_changed",
  CONTENT_SYNCED: "content_synced",
  FILES_ADDED: "files_added",
};

module.exports = {
  PHARMACY_STATUS,
  PHARMACY_PRESCRIPTION_STATUS,
  PHARMACY_ITEM_STATUS,
  PHARMACY_USER_ROLES,
  PHARMACY_PRESCRIPTION_STATUS_LIST,
  PHARMACY_FORWARD_STATUS,
  PHARMACY_FORWARD_ACTION,
};
