"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const {
  DEFAULT_MEDICAL_DIAGRAM_SEEDS,
} = require("../config/medicalDiagramConstants");
const medicalDiagramCategoryService = require("./medicalDiagramCategoryService");

const categoryInclude = {
  model: db.MedicalDiagramCategory,
  as: "categoryRef",
  attributes: ["category_id", "name", "code"],
  required: false,
};

function formatDiagram(row) {
  const plain = row.get({ plain: true });
  return {
    ...plain,
    category: plain.categoryRef?.name ?? null,
    category_id: plain.category_id ?? plain.categoryRef?.category_id ?? null,
  };
}

async function listDiagrams({ status, includeInactive = false } = {}) {
  const where = {};
  if (status) where.status = status;
  else if (!includeInactive) where.status = "active";

  const rows = await db.MedicalDiagram.findAll({
    where,
    include: [categoryInclude],
    order: [
      [{ model: db.MedicalDiagramCategory, as: "categoryRef" }, "name", "ASC"],
      ["name", "ASC"],
    ],
  });

  return rows.map(formatDiagram);
}

async function getDiagramById(diagramId) {
  const row = await db.MedicalDiagram.findByPk(diagramId, {
    include: [categoryInclude],
  });
  if (!row) {
    const err = new Error("Medical diagram not found");
    err.status = 404;
    throw err;
  }
  return formatDiagram(row);
}

async function getDiagramByCode(code) {
  const row = await db.MedicalDiagram.findOne({
    where: { code, status: "active" },
    include: [categoryInclude],
  });
  return row ? formatDiagram(row) : null;
}

async function createDiagram(payload, actorId) {
  const existing = await db.MedicalDiagram.findOne({
    where: { code: payload.code },
  });
  if (existing) {
    const err = new Error("Diagram code already exists");
    err.status = 409;
    throw err;
  }

  const categoryId = await medicalDiagramCategoryService.resolveCategoryId(
    payload.category_id || null
  );

  const row = await db.MedicalDiagram.create({
    diagram_id: uuidv4(),
    name: payload.name,
    code: payload.code,
    image_file: payload.image_file || null,
    category_id: categoryId,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });

  return getDiagramById(row.diagram_id);
}

async function updateDiagram(diagramId, payload, actorId) {
  const row = await db.MedicalDiagram.findByPk(diagramId);
  if (!row) {
    const err = new Error("Medical diagram not found");
    err.status = 404;
    throw err;
  }

  if (payload.code && payload.code !== row.code) {
    const dup = await db.MedicalDiagram.findOne({
      where: { code: payload.code },
    });
    if (dup) {
      const err = new Error("Diagram code already exists");
      err.status = 409;
      throw err;
    }
  }

  let categoryId = row.category_id;
  if (payload.category_id !== undefined) {
    categoryId = await medicalDiagramCategoryService.resolveCategoryId(
      payload.category_id || null
    );
  }

  await row.update({
    name: payload.name ?? row.name,
    code: payload.code ?? row.code,
    image_file:
      payload.image_file !== undefined ? payload.image_file : row.image_file,
    category_id: categoryId,
    status: payload.status ?? row.status,
    updated_by: actorId,
  });

  return getDiagramById(diagramId);
}

async function deleteDiagram(diagramId) {
  const row = await db.MedicalDiagram.findByPk(diagramId);
  if (!row) {
    const err = new Error("Medical diagram not found");
    err.status = 404;
    throw err;
  }
  await row.destroy();
}

async function seedDefaultDiagramsIfEmpty(actorId) {
  const count = await db.MedicalDiagram.count();
  if (count > 0) return { seeded: 0 };

  const rows = DEFAULT_MEDICAL_DIAGRAM_SEEDS.map((seed) => ({
    diagram_id: uuidv4(),
    name: seed.name,
    code: seed.code,
    category_id: null,
    status: "active",
    image_file: null,
    created_by: actorId || null,
    updated_by: actorId || null,
  }));

  await db.MedicalDiagram.bulkCreate(rows);
  return { seeded: rows.length };
}

module.exports = {
  listDiagrams,
  getDiagramById,
  getDiagramByCode,
  createDiagram,
  updateDiagram,
  deleteDiagram,
  seedDefaultDiagramsIfEmpty,
};
