"use strict";

const { Op } = require("sequelize");
const { PrescriptionDocumentTemplate, PrescriptionCategory } = require("../models");
const { DEFAULT_PRESCRIPTION_DOCUMENT_HTML } = require("../config/defaultPrescriptionDocumentTemplate");

const format = (row) => row.get({ plain: true });

async function list({ status, category_id, search } = {}) {
  const where = {};
  if (status) where.status = status;
  if (category_id) where.category_id = category_id;

  const rows = await PrescriptionDocumentTemplate.findAll({
    where,
    include: [
      {
        model: PrescriptionCategory,
        as: "category",
        attributes: ["category_id", "name", "code"],
        required: false,
      },
    ],
    order: [
      ["is_default", "DESC"],
      ["created_at", "DESC"],
    ],
  });

  let data = rows.map(format);
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.category?.name?.toLowerCase().includes(q)
    );
  }
  return data;
}

async function getById(documentTemplateId) {
  const row = await PrescriptionDocumentTemplate.findByPk(documentTemplateId, {
    include: [
      {
        model: PrescriptionCategory,
        as: "category",
        attributes: ["category_id", "name", "code"],
        required: false,
      },
    ],
  });
  if (!row) {
    const err = new Error("Document template not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function unsetOtherDefaults(categoryId, excludeId, transaction) {
  const where = { is_default: true };
  if (categoryId) {
    where.category_id = categoryId;
  } else {
    where.category_id = { [Op.is]: null };
  }
  if (excludeId) where.document_template_id = { [Op.ne]: excludeId };

  await PrescriptionDocumentTemplate.update(
    { is_default: false },
    { where, transaction }
  );
}

async function create(payload, actorId) {
  const dup = await PrescriptionDocumentTemplate.findOne({
    where: { code: payload.code },
  });
  if (dup) {
    const err = new Error("Document template code already exists");
    err.status = 409;
    throw err;
  }

  const { sequelize } = PrescriptionDocumentTemplate;
  return sequelize.transaction(async (transaction) => {
    if (payload.is_default) {
      await unsetOtherDefaults(payload.category_id || null, null, transaction);
    }

    const row = await PrescriptionDocumentTemplate.create(
      {
        name: payload.name,
        code: payload.code,
        category_id: payload.category_id || null,
        html_content: payload.html_content || DEFAULT_PRESCRIPTION_DOCUMENT_HTML,
        is_default: Boolean(payload.is_default),
        status: payload.status || "active",
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction }
    );

    return row.document_template_id;
  }).then((id) => getById(id));
}

async function update(documentTemplateId, payload, actorId) {
  const row = await PrescriptionDocumentTemplate.findByPk(documentTemplateId);
  if (!row) {
    const err = new Error("Document template not found");
    err.status = 404;
    throw err;
  }

  if (payload.code && payload.code !== row.code) {
    const dup = await PrescriptionDocumentTemplate.findOne({
      where: { code: payload.code },
    });
    if (dup) {
      const err = new Error("Document template code already exists");
      err.status = 409;
      throw err;
    }
  }

  const { sequelize } = PrescriptionDocumentTemplate;
  return sequelize.transaction(async (transaction) => {
    const nextCategoryId =
      payload.category_id !== undefined ? payload.category_id : row.category_id;
    const nextIsDefault =
      payload.is_default !== undefined ? Boolean(payload.is_default) : row.is_default;

    if (nextIsDefault && !row.is_default) {
      await unsetOtherDefaults(nextCategoryId, documentTemplateId, transaction);
    }

    await row.update(
      {
        name: payload.name ?? row.name,
        code: payload.code ?? row.code,
        category_id: nextCategoryId,
        html_content: payload.html_content ?? row.html_content,
        is_default: nextIsDefault,
        status: payload.status ?? row.status,
        updated_by: actorId,
      },
      { transaction }
    );

    return getById(documentTemplateId);
  });
}

async function remove(documentTemplateId) {
  const row = await PrescriptionDocumentTemplate.findByPk(documentTemplateId);
  if (!row) {
    const err = new Error("Document template not found");
    err.status = 404;
    throw err;
  }
  if (row.is_default) {
    const err = new Error("Cannot deactivate the default document template");
    err.status = 400;
    throw err;
  }
  await row.update({ status: "inactive" });
  return format(row);
}

function getPlaceholderCatalog() {
  return [
    { key: "hospital_name", description: "Hospital name from branding" },
    { key: "hospital_logo_block", description: "Logo image HTML block" },
    { key: "hospital_location", description: "Full organization address" },
    { key: "contact_phone", description: "Hospital phone" },
    { key: "contact_email", description: "Hospital email" },
    { key: "license_info_block", description: "License / registration block" },
    { key: "patient_name", description: "Patient full name" },
    { key: "patient_id", description: "Patient code / ID" },
    { key: "patient_age", description: "Patient age" },
    { key: "patient_sex", description: "Patient sex" },
    { key: "visit_id", description: "Appointment / visit ID" },
    { key: "visit_date", description: "Visit date" },
    { key: "doctor_name", description: "Prescriber name" },
    { key: "doctor_title", description: "Prescriber title" },
    { key: "doctor_specialization", description: "Job title / specialization" },
    { key: "doctor_department", description: "Department name" },
    { key: "prescriptions", description: "Rendered prescription items table" },
    { key: "signature", description: "Signature image or placeholder" },
    { key: "signature_date", description: "Issue date" },
    { key: "notes", description: "Clinical notes" },
  ];
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  getPlaceholderCatalog,
};
