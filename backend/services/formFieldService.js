"use strict";

const { FormField } = require("../models");
const { Op } = require("sequelize");
const {
  USER_MODEL_NAME,
  CORE_USER_COLUMNS,
  isCoreFieldKey,
  isValidCustomFieldKey,
} = require("../config/userFormConstants");

async function getFormFieldsByModel(modelName, { visibleOnly = false } = {}) {
  const where = { model_name: modelName };
  if (visibleOnly) {
    where.is_visible = true;
  }

  return FormField.findAll({
    where,
    order: [
      ["category", "ASC"],
      ["sort_order", "ASC"],
      ["created_at", "ASC"],
    ],
  });
}

async function getUserFormConfig() {
  return getFormFieldsByModel(USER_MODEL_NAME, { visibleOnly: true });
}

function normalizeFieldRecord(field) {
  const plain = field?.toJSON ? field.toJSON() : field;
  if (!plain) return null;

  const config = plain.config || {};
  if (!config.options && Array.isArray(plain.options)) {
    config.options = plain.options;
  }

  return { ...plain, config };
}

function groupFormFields(fields) {
  const normalized = fields.map(normalizeFieldRecord).filter(Boolean);
  const core_fields = normalized
    .filter((f) => f.storage_type === "core")
    .sort((a, b) => a.sort_order - b.sort_order);

  const customByCategory = new Map();

  normalized
    .filter((f) => f.storage_type === "custom")
    .forEach((field) => {
      const cat = field.category || "General";
      if (!customByCategory.has(cat)) {
        customByCategory.set(cat, []);
      }
      customByCategory.get(cat).push(field);
    });

  const categories = Array.from(customByCategory.entries())
    .map(([category, categoryFields]) => ({
      category,
      fields: categoryFields.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return { core_fields, categories, fields: normalized };
}

function assertFieldKeyForStorage(fieldKey, storageType) {
  if (storageType === "core") {
    if (!isCoreFieldKey(fieldKey)) {
      const err = new Error(
        `Core fields must use keys: ${CORE_USER_COLUMNS.join(", ")}`
      );
      err.status = 400;
      throw err;
    }
    return;
  }

  if (!isValidCustomFieldKey(fieldKey)) {
    const err = new Error(
      "Custom field_key must be lowercase slug (e.g. blood_type, emergency_contact_name)"
    );
    err.status = 400;
    throw err;
  }
}

async function ensureUniqueFieldKey(modelName, fieldKey, excludeId = null) {
  const where = { model_name: modelName, field_key: fieldKey };
  if (excludeId) {
    where.field_id = { [Op.ne]: excludeId };
  }
  const existing = await FormField.findOne({ where });
  if (existing) {
    const err = new Error(`field_key "${fieldKey}" already exists for ${modelName}`);
    err.status = 400;
    throw err;
  }
}

async function reorderFormFields(modelName, orderedFieldIds) {
  const fields = await FormField.findAll({
    where: { model_name: modelName },
  });

  const idSet = new Set(fields.map((f) => f.field_id));
  if (orderedFieldIds.length !== idSet.size) {
    const err = new Error("orderedFieldIds must include every field for this model");
    err.status = 400;
    throw err;
  }

  for (const id of orderedFieldIds) {
    if (!idSet.has(id)) {
      const err = new Error(`Unknown field_id: ${id}`);
      err.status = 400;
      throw err;
    }
  }

  await Promise.all(
    orderedFieldIds.map((fieldId, index) =>
      FormField.update(
        { sort_order: index, updated_at: new Date() },
        { where: { field_id: fieldId } }
      )
    )
  );

  return getFormFieldsByModel(modelName);
}

module.exports = {
  getFormFieldsByModel,
  getUserFormConfig,
  normalizeFieldRecord,
  groupFormFields,
  assertFieldKeyForStorage,
  ensureUniqueFieldKey,
  reorderFormFields,
};
