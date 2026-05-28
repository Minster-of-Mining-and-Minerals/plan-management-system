"use strict";

const { PrescriptionCategory } = require("../models");
const { PRESCRIPTION_CATEGORY_STATUSES } = require("../config/prescriptionConstants");

const format = (row) => row.get({ plain: true });

async function list({ status, search } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await PrescriptionCategory.findAll({
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
  const row = await PrescriptionCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Prescription category not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function create(payload, actorId) {
  const existing = await PrescriptionCategory.findOne({
    where: { code: payload.code },
  });
  if (existing) {
    const err = new Error("Category code already exists");
    err.status = 409;
    throw err;
  }
  const row = await PrescriptionCategory.create({
    name: payload.name,
    code: payload.code,
    description: payload.description,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });
  return format(row);
}

async function update(categoryId, payload, actorId) {
  const row = await PrescriptionCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Prescription category not found");
    err.status = 404;
    throw err;
  }
  if (payload.code && payload.code !== row.code) {
    const dup = await PrescriptionCategory.findOne({ where: { code: payload.code } });
    if (dup) {
      const err = new Error("Category code already exists");
      err.status = 409;
      throw err;
    }
  }
  if (payload.status && !PRESCRIPTION_CATEGORY_STATUSES.includes(payload.status)) {
    const err = new Error("Invalid category status");
    err.status = 400;
    throw err;
  }
  await row.update({
    ...payload,
    updated_by: actorId,
  });
  return format(row);
}

async function remove(categoryId) {
  const row = await PrescriptionCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Prescription category not found");
    err.status = 404;
    throw err;
  }
  await row.update({ status: "inactive" });
  return format(row);
}

module.exports = { list, getById, create, update, remove };
