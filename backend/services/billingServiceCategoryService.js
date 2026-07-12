"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("./auditService");
const { BILLING_CATEGORY_STATUSES } = require("../config/billingConstants");

const { BillingServiceCategory, BillingService } = db;

function format(row) {
  return row.get ? row.get({ plain: true }) : row;
}

async function list({ status, search } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await BillingServiceCategory.findAll({
    where,
    order: [["name", "ASC"]],
  });
  let data = rows.map(format);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );
  }
  return data;
}

async function getById(categoryId) {
  const row = await BillingServiceCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Billing service category not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function create(payload, actorId, auditContext = {}) {
  const existing = await BillingServiceCategory.findOne({
    where: { code: payload.code },
  });
  if (existing) {
    const err = new Error("Category code already exists");
    err.status = 409;
    throw err;
  }
  const row = await BillingServiceCategory.create({
    name: payload.name.trim(),
    code: payload.code.trim().toLowerCase(),
    description: payload.description || null,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });
  await logAudit({
    actorUserId: actorId,
    action: "create",
    resourceType: "billing_service_category",
    resourceId: row.category_id,
    details: { name: row.name, code: row.code },
    ipAddress: auditContext.ipAddress,
  });
  return format(row);
}

async function update(categoryId, payload, actorId, auditContext = {}) {
  const row = await BillingServiceCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Billing service category not found");
    err.status = 404;
    throw err;
  }
  if (payload.code && payload.code !== row.code) {
    const dup = await BillingServiceCategory.findOne({
      where: { code: payload.code },
    });
    if (dup) {
      const err = new Error("Category code already exists");
      err.status = 409;
      throw err;
    }
  }
  if (payload.status && !BILLING_CATEGORY_STATUSES.includes(payload.status)) {
    const err = new Error("Invalid category status");
    err.status = 400;
    throw err;
  }
  const previous = row.get({ plain: true });
  await row.update({
    ...payload,
    updated_by: actorId,
  });
  await logAudit({
    actorUserId: actorId,
    action: "update",
    resourceType: "billing_service_category",
    resourceId: categoryId,
    details: { previous, current: payload },
    ipAddress: auditContext.ipAddress,
  });
  return format(row);
}

async function remove(categoryId, actorId, auditContext = {}) {
  const row = await BillingServiceCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Billing service category not found");
    err.status = 404;
    throw err;
  }
  const inUse = await BillingService.count({ where: { category_id: categoryId } });
  if (inUse > 0) {
    const err = new Error("Category is in use by billing services");
    err.status = 400;
    throw err;
  }
  await row.update({ status: "inactive", updated_by: actorId });
  await row.destroy();
  await logAudit({
    actorUserId: actorId,
    action: "delete",
    resourceType: "billing_service_category",
    resourceId: categoryId,
    details: { name: row.name },
    ipAddress: auditContext.ipAddress,
  });
  return { category_id: categoryId, deleted: true };
}

module.exports = { list, getById, create, update, remove };
