"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { DEFAULT_RECEIPT_TEMPLATE_HTML, RECEIPT_TEMPLATE_PLACEHOLDERS } = require("../config/defaultReceiptTemplate");

const { ReceiptTemplate } = db;

const format = (row) => row.get({ plain: true });

async function list({ status, search } = {}) {
  const where = {};
  if (status) where.status = status;

  const rows = await ReceiptTemplate.findAll({
    where,
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
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    );
  }
  return data;
}

async function getById(templateId) {
  const row = await ReceiptTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Receipt template not found");
    err.status = 404;
    throw err;
  }
  return format(row);
}

async function getDefaultActive() {
  const row = await ReceiptTemplate.findOne({
    where: { status: "active", is_default: true },
    order: [["updated_at", "DESC"]],
  });
  if (row) return format(row);
  const fallback = await ReceiptTemplate.findOne({
    where: { status: "active" },
    order: [["created_at", "ASC"]],
  });
  return fallback ? format(fallback) : null;
}

async function unsetOtherDefaults(excludeId, transaction) {
  const where = { is_default: true };
  if (excludeId) where.template_id = { [Op.ne]: excludeId };
  await ReceiptTemplate.update(
    { is_default: false },
    { where, transaction }
  );
}

async function create(payload, actorId) {
  const dup = await ReceiptTemplate.findOne({ where: { code: payload.code } });
  if (dup) {
    const err = new Error("Receipt template code already exists");
    err.status = 409;
    throw err;
  }

  return db.sequelize.transaction(async (transaction) => {
    if (payload.is_default) {
      await unsetOtherDefaults(null, transaction);
    }

    const row = await ReceiptTemplate.create(
      {
        name: payload.name,
        code: payload.code,
        html_content: payload.html_content || DEFAULT_RECEIPT_TEMPLATE_HTML,
        is_default: Boolean(payload.is_default),
        status: payload.status || "active",
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction }
    );

    return getById(row.template_id);
  });
}

async function update(templateId, payload, actorId) {
  const row = await ReceiptTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Receipt template not found");
    err.status = 404;
    throw err;
  }

  if (payload.code && payload.code !== row.code) {
    const dup = await ReceiptTemplate.findOne({ where: { code: payload.code } });
    if (dup) {
      const err = new Error("Receipt template code already exists");
      err.status = 409;
      throw err;
    }
  }

  return db.sequelize.transaction(async (transaction) => {
    if (payload.is_default) {
      await unsetOtherDefaults(templateId, transaction);
    }

    await row.update(
      {
        name: payload.name ?? row.name,
        code: payload.code ?? row.code,
        html_content: payload.html_content ?? row.html_content,
        is_default:
          payload.is_default != null ? Boolean(payload.is_default) : row.is_default,
        status: payload.status ?? row.status,
        updated_by: actorId,
      },
      { transaction }
    );

    return getById(templateId);
  });
}

async function remove(templateId) {
  const row = await ReceiptTemplate.findByPk(templateId);
  if (!row) {
    const err = new Error("Receipt template not found");
    err.status = 404;
    throw err;
  }
  if (row.is_default) {
    const err = new Error("Cannot delete the default receipt template");
    err.status = 400;
    throw err;
  }
  await row.update({ status: "inactive", is_default: false });
  return { template_id: templateId, deleted: true };
}

function getPlaceholderCatalog() {
  return RECEIPT_TEMPLATE_PLACEHOLDERS;
}

module.exports = {
  list,
  getById,
  getDefaultActive,
  create,
  update,
  remove,
  getPlaceholderCatalog,
};
