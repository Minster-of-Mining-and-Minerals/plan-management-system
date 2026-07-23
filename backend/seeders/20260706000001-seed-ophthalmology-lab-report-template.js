"use strict";

const { v4: uuidv4 } = require("uuid");
const { tableExists } = require("../migrations/_helpers/migrationUtils");
const {
  OPHTHALMOLOGY_LAB_TEMPLATE_TITLE,
  OPHTHALMOLOGY_LAB_TEMPLATE_DESCRIPTION,
  buildOphthalmologyLabGroups,
  buildOphthalmologyLabFields,
} = require("../config/ophthalmologyLabReportPreset");

const DIAGNOSIS_MODEL_NAME = "Diagnosis";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, "diagnosis_templates"))) return;

    const now = new Date();
    const [templates] = await queryInterface.sequelize.query(
      `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
      { replacements: { title: OPHTHALMOLOGY_LAB_TEMPLATE_TITLE } }
    );

    let templateId = templates[0]?.template_id;
    if (!templateId) {
      templateId = uuidv4();
      await queryInterface.bulkInsert("diagnosis_templates", [
        {
          template_id: templateId,
          title: OPHTHALMOLOGY_LAB_TEMPLATE_TITLE,
          description: OPHTHALMOLOGY_LAB_TEMPLATE_DESCRIPTION,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const fields = buildOphthalmologyLabFields();
    const expectedFieldCount = fields.length;

    const [[{ field_count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS field_count FROM form_fields
       WHERE diagnosis_template_id = :templateId AND model_name = :model`,
      { replacements: { templateId, model: DIAGNOSIS_MODEL_NAME } }
    );

    if (Number(field_count) === expectedFieldCount) return;

    await queryInterface.bulkDelete("form_fields", {
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    });
    await queryInterface.bulkDelete("form_field_groups", {
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    });

    const groups = buildOphthalmologyLabGroups();
    const groupIdByTitle = new Map();

    for (const group of groups) {
      const groupId = uuidv4();
      groupIdByTitle.set(group.title, groupId);
      await queryInterface.bulkInsert("form_field_groups", [
        {
          group_id: groupId,
          model_name: DIAGNOSIS_MODEL_NAME,
          diagnosis_template_id: templateId,
          diagnosis_config_id: null,
          title: group.title,
          description: group.description,
          sort_order: group.sort_order,
          is_visible: group.is_visible,
          is_required: group.is_required,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    for (const def of fields) {
      const groupId = groupIdByTitle.get(def.section);
      if (!groupId) continue;
      await queryInterface.bulkInsert("form_fields", [
        {
          field_id: uuidv4(),
          model_name: DIAGNOSIS_MODEL_NAME,
          diagnosis_template_id: templateId,
          diagnosis_config_id: null,
          group_id: groupId,
          field_key: def.field_key,
          label: def.label,
          field_type: def.field_type,
          storage_type: "custom",
          category: def.section,
          is_required: def.is_required || false,
          is_visible: true,
          sort_order: def.sort_order ?? 0,
          config: JSON.stringify(def.config || {}),
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down() {
    // Non-destructive
  },
};
