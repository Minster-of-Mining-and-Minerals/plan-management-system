"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  USER_MODEL_NAME,
  CORE_USER_FORM_FIELD_DEFS,
} = require("../config/coreUserFormFields");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const def of CORE_USER_FORM_FIELD_DEFS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT field_id FROM form_fields
         WHERE model_name = :model_name AND field_key = :field_key
         LIMIT 1`,
        {
          replacements: {
            model_name: USER_MODEL_NAME,
            field_key: def.field_key,
          },
        }
      );

      if (!rows.length) {
        await queryInterface.bulkInsert("form_fields", [
          {
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
            config: JSON.stringify(def.config),
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        await queryInterface.sequelize.query(
          `UPDATE form_fields
           SET storage_type = 'core',
               category = :category,
               is_required = true,
               is_visible = true,
               sort_order = :sort_order,
               field_type = :field_type,
               config = :config::jsonb,
               updated_at = :updated_at
           WHERE model_name = :model_name AND field_key = :field_key`,
          {
            replacements: {
              model_name: USER_MODEL_NAME,
              field_key: def.field_key,
              category: def.category,
              sort_order: def.sort_order,
              field_type: def.field_type,
              config: JSON.stringify(def.config),
              updated_at: now,
            },
          }
        );
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("form_fields", {
      model_name: USER_MODEL_NAME,
      field_key: CORE_USER_FORM_FIELD_DEFS.map((d) => d.field_key),
    });
  },
};
