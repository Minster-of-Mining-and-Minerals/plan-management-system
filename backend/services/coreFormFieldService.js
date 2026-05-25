"use strict";

const { v4: uuidv4 } = require("uuid");
const { FormField } = require("../models");
const {
  USER_MODEL_NAME,
  CORE_USER_FORM_FIELD_DEFS,
} = require("../config/coreUserFormFields");

/**
 * Idempotently ensure required core User form fields exist.
 */
async function ensureCoreFormFields() {
  const now = new Date();

  for (const def of CORE_USER_FORM_FIELD_DEFS) {
    const existing = await FormField.findOne({
      where: { model_name: USER_MODEL_NAME, field_key: def.field_key },
    });

    if (!existing) {
      await FormField.create({
        field_id: uuidv4(),
        model_name: USER_MODEL_NAME,
        field_key: def.field_key,
        label: def.label,
        field_type: def.field_type,
        storage_type: def.storage_type,
        category: def.category,
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
      storage_type: "core",
      category: def.category,
      is_required: true,
      is_visible: true,
      sort_order: def.sort_order,
      field_type: def.field_type,
      config: def.config,
      updated_at: now,
    });
  }
}

module.exports = {
  ensureCoreFormFields,
};
