"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("./auditService");
const { getPagination, getPagingData } = require("../utils/pagination");
const {
  calculateUnitPricing,
} = require("../utils/billingPricing");
const {
  BILLING_SERVICE_STATUSES,
  DEFAULT_CURRENCY,
} = require("../config/billingConstants");

const {
  BillingService,
  BillingServiceCategory,
  Department,
  User,
} = db;

const categoryInclude = {
  model: BillingServiceCategory,
  as: "category",
  attributes: ["category_id", "name", "code"],
  required: false,
};

const departmentInclude = {
  model: Department,
  as: "department",
  attributes: ["department_id", "name", "code"],
  required: false,
};

function formatService(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    ...plain,
    unit_price: Number(plain.unit_price),
    tax_percent: Number(plain.tax_percent),
    tax_amount: Number(plain.tax_amount),
    total_amount: Number(plain.total_amount),
    category_name: plain.category?.name || null,
    department_name: plain.department?.name || null,
  };
}

async function list({
  page = 1,
  limit = 20,
  search,
  status,
  department_id,
  category_id,
  sort_by = "name",
  sort_dir = "ASC",
} = {}) {
  const where = {};
  if (status) where.status = status;
  if (department_id) where.department_id = department_id;
  if (category_id) where.category_id = category_id;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { code: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const allowedSort = ["name", "code", "unit_price", "total_amount", "created_at"];
  const orderField = allowedSort.includes(sort_by) ? sort_by : "name";
  const orderDir = sort_dir?.toUpperCase() === "DESC" ? "DESC" : "ASC";
  const pagination = getPagination(page, limit);

  const result = await BillingService.findAndCountAll({
    where,
    include: [categoryInclude, departmentInclude],
    order: [[orderField, orderDir]],
    ...pagination,
  });

  const paged = getPagingData(result, page, limit);
  return {
    ...paged,
    results: paged.results.map(formatService),
  };
}

async function listActive({ department_id, search, global_only } = {}) {
  const conditions = [{ status: "active" }];
  if (global_only) {
    conditions.push({ department_id: null });
  } else if (department_id) {
    // User's department plus global (null department) services
    conditions.push({
      [Op.or]: [{ department_id }, { department_id: null }],
    });
  }
  if (search) {
    conditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
      ],
    });
  }
  const where = conditions.length > 1 ? { [Op.and]: conditions } : conditions[0];

  const rows = await BillingService.findAll({
    where,
    include: [categoryInclude, departmentInclude],
    order: [["name", "ASC"]],
  });
  return rows.map(formatService);
}

async function getById(serviceId) {
  const row = await BillingService.findByPk(serviceId, {
    include: [categoryInclude, departmentInclude],
  });
  if (!row) {
    const err = new Error("Billing service not found");
    err.status = 404;
    throw err;
  }
  return formatService(row);
}

async function ensureUniqueCode(code, excludeId) {
  if (!code) return;
  const where = { code };
  if (excludeId) where.service_id = { [Op.ne]: excludeId };
  const existing = await BillingService.findOne({ where });
  if (existing) {
    const err = new Error("Service code already exists");
    err.status = 409;
    throw err;
  }
}

async function create(payload, actorId, auditContext = {}) {
  if (!payload.name?.trim()) {
    const err = new Error("Service name is required");
    err.status = 400;
    throw err;
  }

  const unitPrice = Number(payload.unit_price);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    const err = new Error("Unit price cannot be negative");
    err.status = 400;
    throw err;
  }

  const taxPercent = Number(payload.tax_percent ?? 0);
  if (!Number.isFinite(taxPercent) || taxPercent < 0) {
    const err = new Error("Tax cannot be negative");
    err.status = 400;
    throw err;
  }

  const code = payload.code?.trim() || null;
  await ensureUniqueCode(code);

  if (payload.department_id) {
    const dept = await Department.findByPk(payload.department_id);
    if (!dept) {
      const err = new Error("Department not found");
      err.status = 400;
      throw err;
    }
  }

  if (payload.category_id) {
    const cat = await BillingServiceCategory.findByPk(payload.category_id);
    if (!cat) {
      const err = new Error("Service category not found");
      err.status = 400;
      throw err;
    }
  }

  const pricing = calculateUnitPricing(unitPrice, taxPercent);

  const row = await BillingService.create({
    name: payload.name.trim(),
    code,
    category_id: payload.category_id || null,
    department_id: payload.department_id || null,
    unit_price: pricing.unit_price,
    tax_percent: pricing.tax_percent,
    tax_amount: pricing.tax_amount,
    total_amount: pricing.total_amount,
    currency: payload.currency || DEFAULT_CURRENCY,
    status: payload.status === "inactive" ? "inactive" : "active",
    effective_date: payload.effective_date || null,
    created_by: actorId,
    updated_by: actorId,
  });

  await logAudit({
    actorUserId: actorId,
    action: "create",
    resourceType: "billing_service",
    resourceId: row.service_id,
    details: { name: row.name, code: row.code, unit_price: pricing.unit_price },
    ipAddress: auditContext.ipAddress,
  });

  return getById(row.service_id);
}

async function update(serviceId, payload, actorId, auditContext = {}) {
  const row = await BillingService.findByPk(serviceId);
  if (!row) {
    const err = new Error("Billing service not found");
    err.status = 404;
    throw err;
  }

  const previous = row.get({ plain: true });

  if (payload.code && payload.code !== row.code) {
    await ensureUniqueCode(payload.code.trim(), serviceId);
  }

  const patch = { updated_by: actorId };

  if (payload.name !== undefined) patch.name = payload.name.trim();
  if (payload.code !== undefined) patch.code = payload.code?.trim() || null;
  if (payload.category_id !== undefined) patch.category_id = payload.category_id || null;
  if (payload.department_id !== undefined) patch.department_id = payload.department_id || null;
  if (payload.currency !== undefined) patch.currency = payload.currency;
  if (payload.effective_date !== undefined) patch.effective_date = payload.effective_date;
  if (payload.status !== undefined) {
    if (!BILLING_SERVICE_STATUSES.includes(payload.status)) {
      const err = new Error("Invalid service status");
      err.status = 400;
      throw err;
    }
    patch.status = payload.status;
  }

  const unitPrice =
    payload.unit_price !== undefined ? Number(payload.unit_price) : Number(row.unit_price);
  const taxPercent =
    payload.tax_percent !== undefined ? Number(payload.tax_percent) : Number(row.tax_percent);

  if (unitPrice < 0 || taxPercent < 0) {
    const err = new Error("Price and tax cannot be negative");
    err.status = 400;
    throw err;
  }

  const pricing = calculateUnitPricing(unitPrice, taxPercent);
  patch.unit_price = pricing.unit_price;
  patch.tax_percent = pricing.tax_percent;
  patch.tax_amount = pricing.tax_amount;
  patch.total_amount = pricing.total_amount;

  await row.update(patch);

  await logAudit({
    actorUserId: actorId,
    action: "update",
    resourceType: "billing_service",
    resourceId: row.service_id,
    details: { previous, current: patch },
    ipAddress: auditContext.ipAddress,
  });

  return getById(serviceId);
}

async function setStatus(serviceId, status, actorId, auditContext = {}) {
  if (!BILLING_SERVICE_STATUSES.includes(status)) {
    const err = new Error("Invalid service status");
    err.status = 400;
    throw err;
  }
  const row = await BillingService.findByPk(serviceId);
  if (!row) {
    const err = new Error("Billing service not found");
    err.status = 404;
    throw err;
  }
  const previous = row.status;
  await row.update({ status, updated_by: actorId });
  await logAudit({
    actorUserId: actorId,
    action: status === "active" ? "activate" : "deactivate",
    resourceType: "billing_service",
    resourceId: serviceId,
    details: { previous, current: status },
    ipAddress: auditContext.ipAddress,
  });
  return getById(serviceId);
}

async function remove(serviceId, actorId, auditContext = {}) {
  const row = await BillingService.findByPk(serviceId);
  if (!row) {
    const err = new Error("Billing service not found");
    err.status = 404;
    throw err;
  }
  await row.update({ status: "inactive", updated_by: actorId });
  await row.destroy();
  await logAudit({
    actorUserId: actorId,
    action: "delete",
    resourceType: "billing_service",
    resourceId: serviceId,
    details: { name: row.name, code: row.code },
    ipAddress: auditContext.ipAddress,
  });
  return { service_id: serviceId, deleted: true };
}

module.exports = {
  list,
  listActive,
  getById,
  create,
  update,
  setStatus,
  remove,
};
