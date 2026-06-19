"use strict";

const { v4: uuidv4 } = require("uuid");
const { FormConfigContainer, FormConfigField } = require("../models");
const { slugifyFieldKey, normalizeOptions } = require("../utils/formConfigFieldValidationUtils");

async function listFields(containerId, { isActive } = {}) {
  const where = { form_config_container_id: containerId };
  if (isActive !== undefined) where.is_active = isActive;

  return FormConfigField.findAll({
    where,
    order: [
      ["display_order", "ASC"],
      ["label", "ASC"],
    ],
  });
}

async function getFieldById(fieldId) {
  return FormConfigField.findByPk(fieldId);
}

async function assertContainerExists(containerId) {
  const container = await FormConfigContainer.findByPk(containerId);
  if (!container) {
    const error = new Error("Form configuration container not found");
    error.statusCode = 404;
    throw error;
  }
  return container;
}

async function createField(containerId, data) {
  await assertContainerExists(containerId);

  const fieldKey = data.field_key?.trim() || slugifyFieldKey(data.label);
  if (!fieldKey) {
    const error = new Error("Field key is required");
    error.statusCode = 400;
    throw error;
  }

  return FormConfigField.create({
    form_config_field_id: uuidv4(),
    form_config_container_id: containerId,
    label: data.label,
    field_key: fieldKey,
    placeholder: data.placeholder ?? null,
    help_text: data.help_text ?? null,
    field_type: String(data.field_type || "TEXT").toUpperCase(),
    required: data.required === true,
    is_active: data.is_active !== undefined ? data.is_active : true,
    display_order: data.display_order ?? 0,
    default_value: data.default_value ?? null,
    validation_rules: data.validation_rules ?? {},
    options: normalizeOptions(data.options),
  });
}

async function updateField(fieldId, data) {
  const field = await FormConfigField.findByPk(fieldId);
  if (!field) {
    const error = new Error("Form field not found");
    error.statusCode = 404;
    throw error;
  }

  const patch = { ...data };
  if (patch.field_type) patch.field_type = String(patch.field_type).toUpperCase();
  if (patch.options) patch.options = normalizeOptions(patch.options);
  if (patch.field_key) patch.field_key = patch.field_key.trim();

  await field.update(patch);
  return field;
}

async function deleteField(fieldId) {
  const field = await FormConfigField.findByPk(fieldId);
  if (!field) {
    const error = new Error("Form field not found");
    error.statusCode = 404;
    throw error;
  }
  await field.destroy();
  return { deleted: true };
}

async function setFieldActive(fieldId, isActive) {
  const field = await FormConfigField.findByPk(fieldId);
  if (!field) {
    const error = new Error("Form field not found");
    error.statusCode = 404;
    throw error;
  }
  await field.update({ is_active: isActive });
  return field;
}

async function reorderFields(containerId, orderedFieldIds) {
  await assertContainerExists(containerId);

  if (!Array.isArray(orderedFieldIds) || orderedFieldIds.length === 0) {
    const error = new Error("orderedFieldIds must be a non-empty array");
    error.statusCode = 400;
    throw error;
  }

  const fields = await FormConfigField.findAll({
    where: { form_config_container_id: containerId },
  });

  const fieldIdSet = new Set(fields.map((f) => f.form_config_field_id));
  for (const id of orderedFieldIds) {
    if (!fieldIdSet.has(id)) {
      const error = new Error("One or more fields do not belong to this container");
      error.statusCode = 400;
      throw error;
    }
  }

  await Promise.all(
    orderedFieldIds.map((id, index) =>
      FormConfigField.update({ display_order: index + 1 }, { where: { form_config_field_id: id } })
    )
  );

  return listFields(containerId);
}

module.exports = {
  listFields,
  getFieldById,
  createField,
  updateField,
  deleteField,
  setFieldActive,
  reorderFields,
};
