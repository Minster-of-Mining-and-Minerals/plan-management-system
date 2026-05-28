"use strict";

const { FormField, FormFieldGroup } = require("../models");
const { Op } = require("sequelize");
const {
  PATIENT_MODEL_NAME,
  CORE_USER_COLUMNS,
  isCoreFieldKey,
  isValidCustomFieldKey,
} = require("../config/userFormConstants");
const { normalizeFieldRecord } = require("./formFieldNormalize");
const {
  buildGroupedFormResponse,
  getGroupedFormConfig,
  syncGroupRequiredFromFields,
  ensureAccountGroup,
} = require("./formFieldGroupService");

async function getFormFieldsByModel(modelName, { visibleOnly = false } = {}) {
  const groupWhere = { model_name: modelName };
  if (visibleOnly) {
    groupWhere.is_visible = true;
  }

  const groups = await FormFieldGroup.findAll({
    where: groupWhere,
    include: [
      {
        model: FormField,
        as: "fields",
        required: false,
        where: visibleOnly ? { is_visible: true } : undefined,
      },
    ],
    order: [
      ["sort_order", "ASC"],
      [{ model: FormField, as: "fields" }, "sort_order", "ASC"],
    ],
  });

  return groups.flatMap((g) => g.fields || []);
}

async function getUserFormConfig() {
  return getGroupedFormConfig(PATIENT_MODEL_NAME, { visibleOnly: true });
}

/** @deprecated Use getGroupedFormConfig — kept for compatibility */
function groupFormFields(fields) {
  const byGroup = new Map();
  for (const field of fields.map(normalizeFieldRecord).filter(Boolean)) {
    const key = field.category || "General";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(field);
  }

  const groups = Array.from(byGroup.entries()).map(([title, groupFields], i) => ({
    group_id: null,
    group: title,
    title,
    sort_order: i,
    is_visible: true,
    is_required: groupFields.some((f) => f.is_required),
    is_required_step: groupFields.some((f) => f.is_required),
    fields: groupFields.sort((a, b) => a.sort_order - b.sort_order),
  }));

  const allFields = groups.flatMap((g) => g.fields);
  return {
    groups,
    steps: groups,
    core_fields: allFields.filter((f) => f.storage_type === "core"),
    categories: groups.map((g) => ({
      category: g.title,
      fields: g.fields,
    })),
    fields: allFields,
  };
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
  const where = {
    model_name: modelName,
    field_key: fieldKey,
    diagnosis_config_id: null,
  };
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

async function ensureUniqueFieldKeyForConfig(
  modelName,
  fieldKey,
  configId,
  excludeId = null
) {
  const where = {
    model_name: modelName,
    field_key: fieldKey,
    diagnosis_config_id: configId,
  };
  if (excludeId) {
    where.field_id = { [Op.ne]: excludeId };
  }
  const existing = await FormField.findOne({ where });
  if (existing) {
    const err = new Error(`field_key "${fieldKey}" already exists in this diagnosis form`);
    err.status = 400;
    throw err;
  }
}

async function getGroupForField(
  modelName,
  groupId,
  diagnosisConfigId = null,
  diagnosisTemplateId = null
) {
  const where = { group_id: groupId, model_name: modelName };
  if (diagnosisTemplateId) {
    where.diagnosis_template_id = diagnosisTemplateId;
    where.diagnosis_config_id = null;
  } else if (diagnosisConfigId) {
    where.diagnosis_config_id = diagnosisConfigId;
    where.diagnosis_template_id = null;
  } else {
    where.diagnosis_config_id = null;
    where.diagnosis_template_id = null;
  }
  const group = await FormFieldGroup.findOne({ where });
  if (!group) {
    const err = new Error("Invalid group_id for this model");
    err.status = 400;
    throw err;
  }
  return group;
}

async function ensureUniqueFieldKeyForTemplate(
  modelName,
  fieldKey,
  templateId,
  excludeId = null
) {
  const where = {
    model_name: modelName,
    field_key: fieldKey,
    diagnosis_template_id: templateId,
  };
  if (excludeId) {
    where.field_id = { [Op.ne]: excludeId };
  }
  const existing = await FormField.findOne({ where });
  if (existing) {
    const err = new Error(`field_key "${fieldKey}" already exists in this template`);
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

  return getGroupedFormConfig(modelName);
}

module.exports = {
  getFormFieldsByModel,
  getUserFormConfig,
  normalizeFieldRecord,
  groupFormFields,
  getGroupedFormConfig,
  buildGroupedFormResponse,
  assertFieldKeyForStorage,
  ensureUniqueFieldKey,
  ensureUniqueFieldKeyForConfig,
  ensureUniqueFieldKeyForTemplate,
  getGroupForField,
  reorderFormFields,
  syncGroupRequiredFromFields,
  ensureAccountGroup,
};
