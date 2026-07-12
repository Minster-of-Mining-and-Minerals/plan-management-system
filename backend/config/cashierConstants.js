"use strict";

const CASHIER_SESSION_STATUSES = ["open", "closed"];
const CASHIER_PAYMENT_STATUSES = ["completed", "voided"];
const PAYMENT_METHODS = [
  "cash",
  "mobile_money",
  "card",
  "bank_transfer",
  "other",
];

const PAYABLE_ACCOUNT_STATUSES = ["pending_payment", "partially_paid"];

const CASHIER_PERMISSIONS = [
  { resource: "cashier_session", action: "open" },
  { resource: "cashier_session", action: "close" },
  { resource: "cashier_session", action: "view" },
  { resource: "cashier_payment", action: "create" },
  { resource: "cashier_payment", action: "view" },
  { resource: "cashier_payment", action: "void" },
  { resource: "cashier_queue", action: "view" },
];

const CASHIER_ROLE_NAMES = ["Super Admin", "Admin", "Receptionist"];

module.exports = {
  CASHIER_SESSION_STATUSES,
  CASHIER_PAYMENT_STATUSES,
  PAYMENT_METHODS,
  PAYABLE_ACCOUNT_STATUSES,
  CASHIER_PERMISSIONS,
  CASHIER_ROLE_NAMES,
};
