"use strict";

const { v4: uuidv4 } = require("uuid");
const { FormField } = require("../models");
const {
  PATIENT_MODEL_NAME,
  CORE_PATIENT_FORM_FIELD_DEFS,
} = require("../config/corePatientFormFields");
const { ensureAccountGroup } = require("./formFieldGroupService");
const { syncGroupRequiredFromFields } = require("./formFieldGroupService");

/**
 * Idempotently ensure required core User form fields exist in Account group.
 */
async function ensureCoreFormFields() {
  const accountGroup = await ensureAccountGroup(PATIENT_MODEL_NAME);
  const now = new Date();

  for (const def of CORE_PATIENT_FORM_FIELD_DEFS) {
    const existing = await FormField.findOne({
      where: { model_name: PATIENT_MODEL_NAME, field_key: def.field_key },
    });

    if (!existing) {
      await FormField.create({
        field_id: uuidv4(),
        model_name: PATIENT_MODEL_NAME,
        group_id: accountGroup.group_id,
        field_key: def.field_key,
        label: def.label,
        field_type: def.field_type,
        storage_type: def.storage_type,
        category: accountGroup.title,
        is_required: true,
        is_visible: true,
        sort_order: def.sort_order,
        config: def.config,
        created_at: now,
        updated_at: now,
      });
      continue;
    }

    await existing.update({
      group_id: accountGroup.group_id,
      storage_type: "core",
      category: accountGroup.title,
      is_required: true,
      is_visible: true,
      sort_order: def.sort_order,
      field_type: def.field_type,
      config: def.config,
      updated_at: now,
    });
  }

  await accountGroup.update({
    is_visible: true,
    is_required: true,
    updated_at: now,
  });
  await syncGroupRequiredFromFields(accountGroup.group_id);
}

module.exports = {
  ensureCoreFormFields,
};
