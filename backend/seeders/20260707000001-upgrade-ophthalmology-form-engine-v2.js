"use strict";

const { v4: uuidv4 } = require("uuid");
const { tableExists } = require("../migrations/_helpers/migrationUtils");
const {
  OPHTHALMOLOGY_TEMPLATE_TITLE,
  buildOphthalmologyFields,
} = require("../config/ophthalmologyDiagnosisPreset");

const DIAGNOSIS_MODEL_NAME = "Diagnosis";

const CONFIG_PATCHES = {
  oph_icd10_diagnoses: { searchable: true },
  oph_cataract_mapping: {
    visible_when: { field_key: "oph_cataract_present", operator: "truthy" },
  },
  oph_cataract_type: {
    visible_when: { field_key: "oph_cataract_present", operator: "truthy" },
  },
  oph_cataract_grade: {
    visible_when: { field_key: "oph_cataract_present", operator: "truthy" },
  },
  oph_surgery_recommendation: {
    visible_when: { field_key: "oph_cataract_present", operator: "truthy" },
  },
  oph_diabetic_retinopathy_grade: {
    visible_when: { field_key: "oph_chronic_disease", operator: "truthy" },
  },
  oph_diabetic_retina_findings: {
    visible_when: { field_key: "oph_chronic_disease", operator: "truthy" },
  },
  oph_dme_present: {
    visible_when: { field_key: "oph_chronic_disease", operator: "truthy" },
  },
  oph_surgical_recommendation: {
    visible_when: { field_key: "oph_requires_surgery", operator: "truthy" },
  },
  oph_procedure_priority: {
    visible_when: { field_key: "oph_requires_surgery", operator: "truthy" },
  },
  oph_estimated_surgery_date: {
    visible_when: { field_key: "oph_requires_surgery", operator: "truthy" },
  },
  oph_procedure_timestamp_date: {
    visible_when: { field_key: "oph_requires_surgery", operator: "truthy" },
  },
  oph_procedure_timestamp_time: {
    visible_when: { field_key: "oph_requires_surgery", operator: "truthy" },
  },
};

const LEGACY_MEDICATION_KEYS = [
  "oph_medication_1_drug",
  "oph_medication_1_dose",
  "oph_medication_1_frequency",
  "oph_medication_1_duration",
  "oph_medication_2_drug",
  "oph_medication_2_dose",
  "oph_medication_2_frequency",
  "oph_medication_2_duration",
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, "diagnosis_templates"))) return;

    const [templates] = await queryInterface.sequelize.query(
      `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
      { replacements: { title: OPHTHALMOLOGY_TEMPLATE_TITLE } }
    );
    const templateId = templates[0]?.template_id;
    if (!templateId) return;

    for (const [fieldKey, patch] of Object.entries(CONFIG_PATCHES)) {
      await queryInterface.sequelize.query(
        `UPDATE form_fields
         SET config = COALESCE(config, '{}')::jsonb || CAST(:patch AS jsonb),
             updated_at = NOW()
         WHERE field_key = :fieldKey AND diagnosis_template_id = :templateId`,
        {
          replacements: {
            fieldKey,
            templateId,
            patch: JSON.stringify(patch),
          },
        }
      );
    }

    if (LEGACY_MEDICATION_KEYS.length) {
      await queryInterface.sequelize.query(
        `UPDATE form_fields SET is_visible = false, updated_at = NOW()
         WHERE diagnosis_template_id = :templateId
           AND field_key IN (:keys)`,
        { replacements: { templateId, keys: LEGACY_MEDICATION_KEYS } }
      );
    }

    const [[{ repeater_count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS repeater_count FROM form_fields
       WHERE diagnosis_template_id = :templateId AND field_key = 'oph_medications'`,
      { replacements: { templateId } }
    );

    if (Number(repeater_count) === 0) {
      const presetField = buildOphthalmologyFields().find(
        (f) => f.field_key === "oph_medications"
      );
      if (!presetField) return;

      const [groups] = await queryInterface.sequelize.query(
        `SELECT group_id, title FROM form_field_groups
         WHERE diagnosis_template_id = :templateId AND title = :section LIMIT 1`,
        {
          replacements: {
            templateId,
            section: presetField.section,
          },
        }
      );
      const groupId = groups[0]?.group_id;
      if (!groupId) return;

      const now = new Date();
      await queryInterface.bulkInsert("form_fields", [
        {
          field_id: uuidv4(),
          model_name: DIAGNOSIS_MODEL_NAME,
          diagnosis_template_id: templateId,
          diagnosis_config_id: null,
          group_id: groupId,
          field_key: presetField.field_key,
          label: presetField.label,
          field_type: presetField.field_type,
          storage_type: "custom",
          category: presetField.section,
          is_required: presetField.is_required || false,
          is_visible: true,
          sort_order: presetField.sort_order,
          config: JSON.stringify(presetField.config || {}),
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
