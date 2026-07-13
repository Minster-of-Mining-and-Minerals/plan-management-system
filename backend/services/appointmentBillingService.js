"use strict";

const db = require("../models");
const { logAudit } = require("./auditService");
const billingServiceCatalogService = require("./billingServiceCatalogService");
const {
  calculateLinePricing,
  summarizeLines,
  roundMoney,
} = require("../utils/billingPricing");
const {
  deriveAccountStatus,
  accountIsLockedForCharges,
} = require("../utils/billingAccountStatus");
const {
  BILLING_ENTRY_STATUSES,
  BILLING_DISCOUNT_TYPES,
  BILLING_ACCOUNT_STATUSES,
  DEFAULT_CURRENCY,
} = require("../config/billingConstants");

const {
  AppointmentBillingAccount,
  AppointmentBillingEntry,
  StaffAppointment,
  BillingService,
  BillingServiceCategory,
  Department,
  User,
  InternalUserProfile,
} = db;

const creatorInclude = {
  model: User,
  as: "creator",
  attributes: ["user_id", "full_name", "email"],
  required: false,
  include: [
    {
      model: InternalUserProfile,
      as: "internalProfile",
      attributes: ["department_id"],
      required: false,
      include: [
        {
          model: Department,
          as: "departmentRef",
          attributes: ["department_id", "name", "code"],
          required: false,
        },
      ],
    },
  ],
};

function formatEntry(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const dept =
    plain.creator?.internalProfile?.departmentRef?.name || plain.department_name;
  return {
    ...plain,
    quantity: Number(plain.quantity),
    unit_price: Number(plain.unit_price),
    original_unit_price: plain.original_unit_price
      ? Number(plain.original_unit_price)
      : null,
    tax_percent: Number(plain.tax_percent),
    line_subtotal: Number(plain.line_subtotal),
    discount_amount: Number(plain.discount_amount || 0),
    line_tax_amount: Number(plain.line_tax_amount),
    line_total: Number(plain.line_total),
    added_by_name: plain.creator?.full_name || null,
    added_by_department: dept || null,
  };
}

async function getAppointmentOrThrow(appointmentId) {
  const appointment = await StaffAppointment.findByPk(appointmentId);
  if (!appointment) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }
  return appointment;
}

async function getOrCreateAccount(appointmentId, transaction) {
  const appointment = await getAppointmentOrThrow(appointmentId);
  let account = await AppointmentBillingAccount.findOne({
    where: { appointment_id: appointmentId },
    transaction,
  });
  if (!account) {
    account = await AppointmentBillingAccount.create(
      {
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        status: "draft",
        currency: DEFAULT_CURRENCY,
      },
      { transaction }
    );
  }
  return account;
}

async function recalculateAccount(accountId, transaction) {
  const account = await AppointmentBillingAccount.findByPk(accountId, {
    transaction,
  });
  const entries = await AppointmentBillingEntry.findAll({
    where: { account_id: accountId, status: "active" },
    transaction,
  });
  const summary = summarizeLines(entries.map((e) => e.get({ plain: true })));
  const amountPaid = roundMoney(Number(account?.amount_paid || 0));
  const balanceDue = roundMoney(Math.max(summary.grand_total - amountPaid, 0));
  const status = deriveAccountStatus({
    entry_count: summary.entry_count,
    amount_paid: amountPaid,
    grand_total: summary.grand_total,
    current_status: account?.status,
  });

  await AppointmentBillingAccount.update(
    {
      subtotal: summary.subtotal,
      discount_total: summary.discount_total,
      tax_total: summary.tax_total,
      grand_total: summary.grand_total,
      balance_due: balanceDue,
      status,
      paid_at:
        status === "paid"
          ? account?.paid_at || new Date()
          : status === "pending_payment" || status === "partially_paid"
            ? null
            : account?.paid_at,
    },
    { where: { account_id: accountId }, transaction }
  );
  return summary;
}

async function assertAccountUnlocked(accountId, transaction) {
  const account = await AppointmentBillingAccount.findByPk(accountId, {
    transaction,
  });
  if (account && accountIsLockedForCharges(account.get({ plain: true }))) {
    const err = new Error(
      "Billing lines cannot be changed after a payment has been recorded"
    );
    err.status = 400;
    throw err;
  }
}

async function getUserDepartmentId(userId) {
  const profile = await InternalUserProfile.findOne({
    where: { user_id: userId },
    attributes: ["department_id"],
  });
  return profile?.department_id || null;
}

function userHasPermission(user, resource, action) {
  const required = `${resource}:${action}`.toLowerCase();
  return (user?.permissions || []).includes(required);
}

function normalizeDepartmentId(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function serviceDepartmentId(service) {
  const plain = service?.get ? service.get({ plain: true }) : service;
  return normalizeDepartmentId(plain?.department_id);
}

async function assertCanAddService(user, service) {
  if (userHasPermission(user, "appointment_billing", "manage")) return;

  const serviceDeptId = serviceDepartmentId(service);
  const userDeptId = normalizeDepartmentId(await getUserDepartmentId(user.user_id));

  // Global services (department_id null) — billable from any department
  if (!serviceDeptId) return;

  // Department-scoped services — only staff in that department
  if (!userDeptId || serviceDeptId !== userDeptId) {
    const err = new Error(
      "You can only bill services for your department or unrestricted services"
    );
    err.status = 403;
    throw err;
  }
}

async function listActiveServicesForUser(user, query = {}) {
  if (userHasPermission(user, "appointment_billing", "manage")) {
    return billingServiceCatalogService.listActive(query);
  }

  const userDeptId = normalizeDepartmentId(await getUserDepartmentId(user.user_id));
  if (userDeptId) {
    // Own department + global (department_id null) services
    return billingServiceCatalogService.listActive({
      ...query,
      department_id: userDeptId,
    });
  }

  // No department on profile — global services only
  return billingServiceCatalogService.listActive({
    ...query,
    global_only: true,
  });
}

async function getBillingContext(appointmentId) {
  const account = await getOrCreateAccount(appointmentId);
  const entries = await AppointmentBillingEntry.findAll({
    where: { appointment_id: appointmentId },
    include: [creatorInclude],
    order: [["created_at", "ASC"]],
    paranoid: true,
  });

  const activeEntries = entries.filter((e) => e.status === "active");
  const summary = summarizeLines(activeEntries.map((e) => e.get({ plain: true })));

  return {
    account: {
      ...account.get({ plain: true }),
      subtotal: summary.subtotal,
      discount_total: summary.discount_total,
      tax_total: summary.tax_total,
      grand_total: summary.grand_total,
      amount_paid: Number(account.amount_paid || 0),
      balance_due: Number(account.balance_due || 0),
    },
    entries: entries.map(formatEntry),
    summary: {
      subtotal: summary.subtotal,
      tax_total: summary.tax_total,
      discount_total: summary.discount_total,
      grand_total: summary.grand_total,
      amount_paid: Number(account.amount_paid || 0),
      balance_due: Number(account.balance_due || 0),
    },
  };
}

async function createEntry(appointmentId, payload, actor, auditContext = {}) {
  const user = actor;
  const service = await BillingService.findByPk(payload.service_id, {
    include: [
      { model: BillingServiceCategory, as: "category" },
      { model: Department, as: "department" },
    ],
  });

  if (!service) {
    const err = new Error("Service must exist");
    err.status = 400;
    throw err;
  }
  if (service.status !== "active") {
    const err = new Error("Service must be active");
    err.status = 400;
    throw err;
  }

  await assertCanAddService(user, service);

  const catalogPricing = {
    unit_price: Number(service.unit_price),
    tax_percent: Number(service.tax_percent),
  };

  let unitPrice = catalogPricing.unit_price;
  let hasOverride = false;
  let overrideReason = null;

  if (
    payload.unit_price !== undefined &&
    Number(payload.unit_price) !== catalogPricing.unit_price
  ) {
    if (!userHasPermission(user, "billing", "override_price")) {
      const err = new Error("Price override permission required");
      err.status = 403;
      throw err;
    }
    unitPrice = Number(payload.unit_price);
    if (unitPrice < 0) {
      const err = new Error("Price cannot be negative");
      err.status = 400;
      throw err;
    }
    hasOverride = true;
    overrideReason = payload.override_reason?.trim() || null;
    if (!overrideReason) {
      const err = new Error("Override reason is required");
      err.status = 400;
      throw err;
    }
  }

  let discountType = payload.discount_type || null;
  let discountValue = payload.discount_value || 0;
  let discountReason = payload.discount_reason || null;
  let discountApprovedBy = null;

  if (discountType) {
    if (!userHasPermission(user, "billing", "discount")) {
      const err = new Error("Discount permission required");
      err.status = 403;
      throw err;
    }
    if (!BILLING_DISCOUNT_TYPES.includes(discountType)) {
      const err = new Error("Invalid discount type");
      err.status = 400;
      throw err;
    }
    if (!discountReason?.trim()) {
      const err = new Error("Discount reason is required");
      err.status = 400;
      throw err;
    }
    discountApprovedBy = user.user_id;
  }

  const linePricing = calculateLinePricing({
    unitPrice,
    taxPercent: catalogPricing.tax_percent,
    quantity: payload.quantity ?? 1,
    discountType,
    discountValue,
  });

  const creatorDept = await InternalUserProfile.findOne({
    where: { user_id: user.user_id },
    include: [{ model: Department, as: "departmentRef" }],
  });

  const t = await db.sequelize.transaction();
  try {
    const account = await getOrCreateAccount(appointmentId, t);

    if (["paid", "cancelled", "refunded"].includes(account.status)) {
      const err = new Error("Billing account is closed for new entries");
      err.status = 400;
      throw err;
    }
    await assertAccountUnlocked(account.account_id, t);

    const entry = await AppointmentBillingEntry.create(
      {
        account_id: account.account_id,
        appointment_id: appointmentId,
        service_id: service.service_id,
        service_name: service.name,
        service_code: service.code,
        category_name: service.category?.name || null,
        department_id: service.department_id || creatorDept?.department_id || null,
        department_name:
          service.department?.name ||
          creatorDept?.departmentRef?.name ||
          null,
        quantity: linePricing.quantity,
        unit_price: linePricing.unit_price,
        original_unit_price: catalogPricing.unit_price,
        tax_percent: linePricing.tax_percent,
        line_subtotal: linePricing.line_subtotal,
        discount_type: linePricing.discount_type,
        discount_value: linePricing.discount_value,
        discount_amount: linePricing.discount_amount,
        discount_reason: discountReason,
        discount_approved_by: discountApprovedBy,
        line_tax_amount: linePricing.line_tax_amount,
        line_total: linePricing.line_total,
        currency: service.currency || DEFAULT_CURRENCY,
        note: payload.note?.trim() || null,
        status: "active",
        has_price_override: hasOverride,
        override_reason: overrideReason,
        override_approved_by: hasOverride ? user.user_id : null,
        created_by: user.user_id,
        updated_by: user.user_id,
      },
      { transaction: t }
    );

    await recalculateAccount(account.account_id, t);
    await t.commit();

    await logAudit({
      actorUserId: user.user_id,
      action: "create",
      resourceType: "appointment_billing_entry",
      resourceId: entry.entry_id,
      details: {
        appointment_id: appointmentId,
        service_name: service.name,
        line_total: linePricing.line_total,
      },
      ipAddress: auditContext.ipAddress,
    });

    const created = await AppointmentBillingEntry.findByPk(entry.entry_id, {
      include: [creatorInclude],
    });
    return formatEntry(created);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function updateEntry(entryId, payload, actor, auditContext = {}) {
  const entry = await AppointmentBillingEntry.findByPk(entryId);
  if (!entry || entry.status === "cancelled") {
    const err = new Error("Billing entry not found");
    err.status = 404;
    throw err;
  }

  const previous = entry.get({ plain: true });
  const patch = { updated_by: actor.user_id };

  if (payload.quantity !== undefined) {
    const qty = Number(payload.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      const err = new Error("Quantity must be greater than zero");
      err.status = 400;
      throw err;
    }
    patch.quantity = qty;
  }

  if (payload.note !== undefined) patch.note = payload.note?.trim() || null;

  let unitPrice = Number(entry.unit_price);
  if (payload.unit_price !== undefined) {
    if (!userHasPermission(actor, "billing", "override_price")) {
      const err = new Error("Price override permission required");
      err.status = 403;
      throw err;
    }
    unitPrice = Number(payload.unit_price);
    if (unitPrice < 0) {
      const err = new Error("Price cannot be negative");
      err.status = 400;
      throw err;
    }
    patch.unit_price = unitPrice;
    patch.has_price_override = true;
    patch.override_reason = payload.override_reason?.trim() || entry.override_reason;
    patch.override_approved_by = actor.user_id;
  }

  const linePricing = calculateLinePricing({
    unitPrice,
    taxPercent: Number(entry.tax_percent),
    quantity: patch.quantity ?? Number(entry.quantity),
    discountType: entry.discount_type,
    discountValue: entry.discount_value,
  });

  Object.assign(patch, {
    line_subtotal: linePricing.line_subtotal,
    discount_amount: linePricing.discount_amount,
    line_tax_amount: linePricing.line_tax_amount,
    line_total: linePricing.line_total,
  });

  const t = await db.sequelize.transaction();
  try {
    await assertAccountUnlocked(entry.account_id, t);
    await entry.update(patch, { transaction: t });
    await recalculateAccount(entry.account_id, t);
    await t.commit();

    await logAudit({
      actorUserId: actor.user_id,
      action: "update",
      resourceType: "appointment_billing_entry",
      resourceId: entryId,
      details: { previous, current: patch },
      ipAddress: auditContext.ipAddress,
    });

    const updated = await AppointmentBillingEntry.findByPk(entryId, {
      include: [creatorInclude],
    });
    return formatEntry(updated);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function cancelEntry(entryId, actor, auditContext = {}) {
  const entry = await AppointmentBillingEntry.findByPk(entryId);
  if (!entry || entry.status === "cancelled") {
    const err = new Error("Billing entry not found");
    err.status = 404;
    throw err;
  }

  const previous = entry.get({ plain: true });
  const t = await db.sequelize.transaction();
  try {
    await assertAccountUnlocked(entry.account_id, t);
    await entry.update(
      {
        status: "cancelled",
        deleted_by: actor.user_id,
        updated_by: actor.user_id,
      },
      { transaction: t }
    );
    await entry.destroy({ transaction: t });
    await recalculateAccount(entry.account_id, t);
    await t.commit();

    await logAudit({
      actorUserId: actor.user_id,
      action: "delete",
      resourceType: "appointment_billing_entry",
      resourceId: entryId,
      details: { previous, reason: auditContext.reason || null },
      ipAddress: auditContext.ipAddress,
    });

    return { entry_id: entryId, deleted: true };
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

module.exports = {
  getBillingContext,
  createEntry,
  updateEntry,
  cancelEntry,
  listActiveServices: listActiveServicesForUser,
};
