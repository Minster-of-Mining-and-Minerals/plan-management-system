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

module.exports = {
  PHARMACY_STATUS,
  PHARMACY_PRESCRIPTION_STATUS,
  PHARMACY_ITEM_STATUS,
  PHARMACY_USER_ROLES,
  PHARMACY_PRESCRIPTION_STATUS_LIST,
};
