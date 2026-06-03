"use strict";

const { MedicalDiagramCategory, MedicalDiagram } = require("../models");
const { MEDICAL_DIAGRAM_CATEGORY_STATUSES } = require("../config/medicalDiagramConstants");

const format = (row) => row.get({ plain: true });

function slugCode(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
}

async function list({ status, includeInactive = false } = {}) {
  const where = {};
  if (status) where.status = status;
  else if (!includeInactive) where.status = "active";

  const rows = await MedicalDiagramCategory.findAll({
    where,
    order: [
      ["sort_order", "ASC"],
      ["name", "ASC"],
    ],
  });
  return rows.map(format);
}

async function getById(categoryId) {
  const row = await MedicalDiagramCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Diagram category not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function resolveCategoryId(categoryId) {
  if (!categoryId) return null;
  const row = await MedicalDiagramCategory.findOne({
    where: { category_id: categoryId, status: "active" },
  });
  if (!row) {
    const err = new Error("Diagram category not found or inactive");
    err.status = 400;
    throw err;
  }
  return categoryId;
}

async function create(payload, actorId) {
  const code = payload.code || slugCode(payload.name);
  const dup = await MedicalDiagramCategory.findOne({
    where: { code },
  });
  if (dup) {
    const err = new Error("Category code already exists");
    err.status = 409;
    throw err;
  }
  const nameDup = await MedicalDiagramCategory.findOne({
    where: { name: payload.name },
  });
  if (nameDup) {
    const err = new Error("Category name already exists");
    err.status = 409;
    throw err;
  }

  const row = await MedicalDiagramCategory.create({
    name: payload.name,
    code,
    sort_order: payload.sort_order ?? 0,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });
  return format(row);
}

async function update(categoryId, payload, actorId) {
  const row = await MedicalDiagramCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Diagram category not found");
    err.status = 404;
    throw err;
  }

  if (payload.code && payload.code !== row.code) {
    const dup = await MedicalDiagramCategory.findOne({
      where: { code: payload.code },
    });
    if (dup) {
      const err = new Error("Category code already exists");
      err.status = 409;
      throw err;
    }
  }

  if (payload.name && payload.name !== row.name) {
    const nameDup = await MedicalDiagramCategory.findOne({
      where: { name: payload.name },
    });
    if (nameDup) {
      const err = new Error("Category name already exists");
      err.status = 409;
      throw err;
    }
  }

  if (
    payload.status &&
    !MEDICAL_DIAGRAM_CATEGORY_STATUSES.includes(payload.status)
  ) {
    const err = new Error("Invalid category status");
    err.status = 400;
    throw err;
  }

  await row.update({
    name: payload.name ?? row.name,
    code: payload.code ?? row.code,
    sort_order: payload.sort_order ?? row.sort_order,
    status: payload.status ?? row.status,
    updated_by: actorId,
  });

  return format(row);
}

async function remove(categoryId) {
  const row = await MedicalDiagramCategory.findByPk(categoryId);
  if (!row) {
    const err = new Error("Diagram category not found");
    err.status = 404;
    throw err;
  }

  const inUse = await MedicalDiagram.count({ where: { category_id: categoryId } });
  if (inUse > 0) {
    await row.update({ status: "inactive" });
    return { ...format(row), archived: true };
  }

  await row.destroy();
  return { deleted: true };
}

module.exports = {
  list,
  getById,
  resolveCategoryId,
  create,
  update,
  remove,
};
