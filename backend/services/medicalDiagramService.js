"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const {
  DEFAULT_MEDICAL_DIAGRAM_SEEDS,
} = require("../config/medicalDiagramConstants");

async function listDiagrams({ status, includeInactive = false } = {}) {
  const where = {};
  if (status) where.status = status;
  else if (!includeInactive) where.status = "active";

  return db.MedicalDiagram.findAll({
    where,
    order: [
      ["category", "ASC"],
      ["name", "ASC"],
    ],
  });
}

async function getDiagramById(diagramId) {
  const row = await db.MedicalDiagram.findByPk(diagramId);
  if (!row) {
    const err = new Error("Medical diagram not found");
    err.status = 404;
    throw err;
  }
  return row;
}

async function getDiagramByCode(code) {
  return db.MedicalDiagram.findOne({
    where: { code, status: "active" },
  });
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

  return db.MedicalDiagram.create({
    diagram_id: uuidv4(),
    name: payload.name,
    code: payload.code,
    image_file: payload.image_file || null,
    category: payload.category || null,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });
}

async function updateDiagram(diagramId, payload, actorId) {
  const row = await getDiagramById(diagramId);

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

  await row.update({
    name: payload.name ?? row.name,
    code: payload.code ?? row.code,
    image_file:
      payload.image_file !== undefined ? payload.image_file : row.image_file,
    category: payload.category !== undefined ? payload.category : row.category,
    status: payload.status ?? row.status,
    updated_by: actorId,
  });

  return row.reload();
}

async function deleteDiagram(diagramId) {
  const row = await getDiagramById(diagramId);
  await row.destroy();
}

async function seedDefaultDiagramsIfEmpty(actorId) {
  const count = await db.MedicalDiagram.count();
  if (count > 0) return { seeded: 0 };

  const rows = DEFAULT_MEDICAL_DIAGRAM_SEEDS.map((seed) => ({
    diagram_id: uuidv4(),
    name: seed.name,
    code: seed.code,
    category: seed.category,
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
