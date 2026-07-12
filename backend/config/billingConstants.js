"use strict";

const BILLING_SERVICE_STATUSES = ["active", "inactive"];
const BILLING_CATEGORY_STATUSES = ["active", "inactive"];
const BILLING_ACCOUNT_STATUSES = [
  "draft",
  "pending_payment",
  "partially_paid",
  "paid",
  "cancelled",
  "refunded",
];
const BILLING_ENTRY_STATUSES = ["active", "cancelled"];
const BILLING_DISCOUNT_TYPES = ["percentage", "fixed"];
const DEFAULT_CURRENCY = "ETB";

const DEFAULT_BILLING_CATEGORIES = [
  { code: "consultation", name: "Consultation" },
  { code: "laboratory", name: "Laboratory" },
  { code: "radiology", name: "Radiology" },
  { code: "pharmacy", name: "Pharmacy" },
  { code: "procedures", name: "Procedures" },
  { code: "surgery", name: "Surgery" },
  { code: "admission", name: "Admission" },
  { code: "nursing", name: "Nursing" },
  { code: "physiotherapy", name: "Physiotherapy" },
];

const BILLING_SERVICE_PERMISSIONS = [
  { resource: "billing_service", action: "view" },
  { resource: "billing_service", action: "create" },
  { resource: "billing_service", action: "update" },
  { resource: "billing_service", action: "delete" },
  { resource: "billing_service", action: "activate" },
  { resource: "billing_service", action: "deactivate" },
];

const BILLING_CATEGORY_PERMISSIONS = [
  { resource: "billing_service_category", action: "view" },
  { resource: "billing_service_category", action: "create" },
  { resource: "billing_service_category", action: "update" },
  { resource: "billing_service_category", action: "delete" },
];

const APPOINTMENT_BILLING_PERMISSIONS = [
  { resource: "appointment_billing", action: "view" },
  { resource: "appointment_billing", action: "create" },
  { resource: "appointment_billing", action: "update" },
  { resource: "appointment_billing", action: "delete" },
  { resource: "appointment_billing", action: "manage" },
  { resource: "billing", action: "override_price" },
  { resource: "billing", action: "discount" },
];

module.exports = {
  BILLING_SERVICE_STATUSES,
  BILLING_CATEGORY_STATUSES,
  BILLING_ACCOUNT_STATUSES,
  BILLING_ENTRY_STATUSES,
  BILLING_DISCOUNT_TYPES,
  DEFAULT_CURRENCY,
  DEFAULT_BILLING_CATEGORIES,
  BILLING_SERVICE_PERMISSIONS,
  BILLING_CATEGORY_PERMISSIONS,
  APPOINTMENT_BILLING_PERMISSIONS,
};
