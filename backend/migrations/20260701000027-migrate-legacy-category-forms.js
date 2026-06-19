"use strict";

const { v4: uuidv4 } = require("uuid");

const LEGACY_FIELD_TYPE_MAP = {
  text: "TEXT",
  textarea: "TEXTAREA",
  select: "SELECT",
  number: "NUMBER",
  email: "EMAIL",
  phone: "PHONE",
  date: "DATE",
  boolean: "BOOLEAN",
  file: "ATTACHMENT",
  attachment: "ATTACHMENT",
};

function mapLegacyFieldType(type) {
  const key = String(type || "text").toLowerCase();
  return LEGACY_FIELD_TYPE_MAP[key] || "TEXT";
}

function parseFormConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [categories] = await queryInterface.sequelize.query(`
      SELECT issue_category_id, code, name, description, display_order, form_config
      FROM issue_categories
      WHERE form_config_container_id IS NULL
        AND is_selectable = true
        AND jsonb_typeof(form_config->'fields') = 'array'
        AND jsonb_array_length(form_config->'fields') > 0
    `);

    const now = new Date();

    for (const category of categories) {
      const formConfig = parseFormConfig(category.form_config);
      const fields = Array.isArray(formConfig.fields) ? formConfig.fields : [];
      if (!fields.length) continue;

      const containerId = uuidv4();
      const containerCode = `legacy_${category.code || category.issue_category_id.replace(/-/g, "").slice(0, 24)}`;

      await queryInterface.bulkInsert("form_config_containers", [
        {
          form_config_container_id: containerId,
          issue_category_id: category.issue_category_id,
          name: `${category.name} Form`,
          code: containerCode,
          description: `Migrated from legacy category form configuration for ${category.name}`,
          version_number: 1,
          is_active: true,
          is_published: true,
          display_order: category.display_order ?? 0,
          created_by: null,
          updated_by: null,
          created_at: now,
          updated_at: now,
        },
      ]);

      const fieldRows = fields.map((field, index) => {
        const validationRules = field.validation_rules || {};
        const options = Array.isArray(field.options)
          ? field.options.map((option) => ({
              label: String(option.label ?? option.value ?? ""),
              value: String(option.value ?? option.label ?? ""),
            }))
          : [];

        return {
          form_config_field_id: uuidv4(),
          form_config_container_id: containerId,
          label: field.label || field.key || `Field ${index + 1}`,
          field_key: field.key || `field_${index + 1}`,
          placeholder: field.placeholder || null,
          help_text: field.help_text || null,
          field_type: mapLegacyFieldType(field.type),
          required: Boolean(field.required),
          is_active: true,
          display_order: index + 1,
          default_value: field.default_value || null,
          validation_rules: Sequelize.literal(
            `'${JSON.stringify(validationRules).replace(/'/g, "''")}'::jsonb`
          ),
          options: Sequelize.literal(
            `'${JSON.stringify(options).replace(/'/g, "''")}'::jsonb`
          ),
          created_at: now,
          updated_at: now,
        };
      });

      if (fieldRows.length) {
        await queryInterface.bulkInsert("form_config_fields", fieldRows);
      }

      await queryInterface.sequelize.query(
        `
        UPDATE issue_categories
        SET form_config_container_id = :containerId,
            updated_at = :now
        WHERE issue_category_id = :categoryId
        `,
        {
          replacements: {
            containerId,
            categoryId: category.issue_category_id,
            now,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    const [containers] = await queryInterface.sequelize.query(`
      SELECT form_config_container_id
      FROM form_config_containers
      WHERE code LIKE 'legacy_%'
    `);

    const containerIds = containers.map((row) => row.form_config_container_id);
    if (!containerIds.length) return;

    await queryInterface.sequelize.query(
      `
      UPDATE issue_categories
      SET form_config_container_id = NULL
      WHERE form_config_container_id IN (:containerIds)
      `,
      { replacements: { containerIds } }
    );

    await queryInterface.sequelize.query(
      `
      DELETE FROM form_config_fields
      WHERE form_config_container_id IN (:containerIds)
      `,
      { replacements: { containerIds } }
    );

    await queryInterface.sequelize.query(
      `
      DELETE FROM form_config_containers
      WHERE form_config_container_id IN (:containerIds)
      `,
      { replacements: { containerIds } }
    );
  },
};
