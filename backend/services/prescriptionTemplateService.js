"use strict";

const {
  PrescriptionTemplate,
  PrescriptionTemplateItem,
  PrescriptionCategory,
} = require("../models");
const { PRESCRIPTION_TEMPLATE_STATUSES } = require("../config/prescriptionConstants");

const templateInclude = [
  { model: PrescriptionCategory, as: "category", attributes: ["category_id", "name", "code"] },
  {
    model: PrescriptionTemplateItem,
    as: "items",
    separate: true,
    order: [["sort_order", "ASC"], ["created_at", "ASC"]],
  },
];

const formatTemplate = (row) => {
  const plain = row.get({ plain: true });
  return {
    ...plain,
    signature_type_label: plain.has_template_signature
      ? "Template signature"
      : "No template signature",
  };
};

async function list({ status, category_id, search, include_archived } = {}) {
  const where = {};
  if (category_id) where.category_id = category_id;
  if (status) where.status = status;
  else if (!include_archived) where.status = "active";

  const rows = await PrescriptionTemplate.findAll({
    where,
    include: [{ model: PrescriptionCategory, as: "category", attributes: ["category_id", "name", "code"] }],
    order: [["created_at", "DESC"]],
  });
  let data = rows.map(formatTemplate);
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

async function getById(templateId) {
  const row = await PrescriptionTemplate.findByPk(templateId, {
    include: templateInclude,
  });
  if (!row) {
    const err = new Error("Prescription template not found");
    err.status = 404;
    throw err;
  }
  return formatTemplate(row);
}

async function create(payload, actorId) {
  const dup = await PrescriptionTemplate.findOne({ where: { code: payload.code } });
  if (dup) {
    const err = new Error("Template code already exists");
    err.status = 409;
    throw err;
  }
  const row = await PrescriptionTemplate.create({
    category_id: payload.category_id,
    name: payload.name,
    code: payload.code,
    description: payload.description,
    template_type: payload.template_type,
    template_content: payload.template_content,
    has_template_signature: Boolean(payload.has_template_signature),
    template_signature_file: payload.template_signature_file,
    allow_user_signature_override: payload.allow_user_signature_override !== false,
    status: payload.status || "active",
    created_by: actorId,
    updated_by: actorId,
  });

  if (Array.isArray(payload.items) && payload.items.length) {
    await PrescriptionTemplateItem.bulkCreate(
      payload.items.map((item, index) => ({
        template_id: row.template_id,
        item_name: item.item_name,
        strength: item.strength,
        route: item.route,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        quantity: item.quantity,
        notes: item.notes,
        sort_order: item.sort_order ?? index,
      }))
    );
  }

  return getById(row.template_id);
}

async function update(templateId, payload, actorId) {
  const row = await PrescriptionTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Prescription template not found");
    err.status = 404;
    throw err;
  }
  if (payload.status && !PRESCRIPTION_TEMPLATE_STATUSES.includes(payload.status)) {
    const err = new Error("Invalid template status");
    err.status = 400;
    throw err;
  }
  await row.update({
    category_id: payload.category_id ?? row.category_id,
    name: payload.name ?? row.name,
    code: payload.code ?? row.code,
    description: payload.description ?? row.description,
    template_type: payload.template_type ?? row.template_type,
    template_content: payload.template_content ?? row.template_content,
    has_template_signature:
      payload.has_template_signature != null
        ? Boolean(payload.has_template_signature)
        : row.has_template_signature,
    template_signature_file:
      payload.template_signature_file ?? row.template_signature_file,
    allow_user_signature_override:
      payload.allow_user_signature_override != null
        ? Boolean(payload.allow_user_signature_override)
        : row.allow_user_signature_override,
    status: payload.status ?? row.status,
    updated_by: actorId,
  });

  if (Array.isArray(payload.items)) {
    await PrescriptionTemplateItem.destroy({ where: { template_id: templateId } });
    if (payload.items.length) {
      await PrescriptionTemplateItem.bulkCreate(
        payload.items.map((item, index) => ({
          template_id: templateId,
          item_name: item.item_name,
          strength: item.strength,
          route: item.route,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
          quantity: item.quantity,
          notes: item.notes,
          sort_order: item.sort_order ?? index,
        }))
      );
    }
  }

  return getById(templateId);
}

async function archive(templateId, actorId) {
  const row = await PrescriptionTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Prescription template not found");
    err.status = 404;
    throw err;
  }
  await row.update({ status: "archived", updated_by: actorId });
  return formatTemplate(row);
}

module.exports = { list, getById, create, update, archive };
