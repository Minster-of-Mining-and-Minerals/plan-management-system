"use strict";

const { v4: uuidv4 } = require("uuid");
const { FormField, FormFieldGroup } = require("../models");
const { PATIENT_MODEL_NAME } = require("../config/accountTypes");
const { PATIENT_FORM_CATEGORIES } = require("../config/patientFormCatalog");
const { ensureCoreFormFields } = require("./coreFormFieldService");
const { ensureAccountGroup } = require("./formFieldGroupService");
const { syncGroupRequiredFromFields } = require("./formFieldGroupService");

async function ensureFormFieldGroup(categoryDef) {
  const now = new Date();
  let group = await FormFieldGroup.findOne({
    where: { model_name: PATIENT_MODEL_NAME, title: categoryDef.title },
  });

  if (!group) {
    group = await FormFieldGroup.create({
      group_id: uuidv4(),
      model_name: PATIENT_MODEL_NAME,
      title: categoryDef.title,
      description: categoryDef.description || null,
      sort_order: categoryDef.sort_order,
      is_visible: true,
      is_required: Boolean(categoryDef.is_required),
      created_at: now,
      updated_at: now,
    });
  } else {
    await group.update({
      description: categoryDef.description || null,
      sort_order: categoryDef.sort_order,
      is_visible: true,
      updated_at: now,
    });
  }

  return group;
}

async function ensureCustomField(group, fieldDef) {
  const now = new Date();
  const categoryTitle = group.title;

  const existing = await FormField.findOne({
    where: {
      model_name: PATIENT_MODEL_NAME,
      field_key: fieldDef.field_key,
    },
  });

  const payload = {
    group_id: group.group_id,
    label: fieldDef.label,
    field_type: fieldDef.field_type,
    storage_type: "custom",
    category: categoryTitle,
    is_required: Boolean(fieldDef.is_required),
    is_visible: true,
    sort_order: fieldDef.sort_order,
    config: fieldDef.config || {},
    updated_at: now,
  };

  if (!existing) {
    await FormField.create({
      field_id: uuidv4(),
      model_name: PATIENT_MODEL_NAME,
      field_key: fieldDef.field_key,
      ...payload,
      created_at: now,
    });
    return;
  }

  await existing.update(payload);
}

/**
 * Idempotently seed all patient form categories and default custom fields.
 */
async function ensurePatientFormCatalog() {
  await ensureCoreFormFields();
  const accountGroup = await ensureAccountGroup(PATIENT_MODEL_NAME);

  for (const categoryDef of PATIENT_FORM_CATEGORIES) {
    const group =
      categoryDef.title === "Account"
        ? accountGroup
        : await ensureFormFieldGroup(categoryDef);

    for (const fieldDef of categoryDef.fields || []) {
      await ensureCustomField(group, fieldDef);
    }

    await syncGroupRequiredFromFields(group.group_id);
  }

  return { categories: PATIENT_FORM_CATEGORIES.length };
}

module.exports = {
  ensurePatientFormCatalog,
  ensureFormFieldGroup,
  ensureCustomField,
};
