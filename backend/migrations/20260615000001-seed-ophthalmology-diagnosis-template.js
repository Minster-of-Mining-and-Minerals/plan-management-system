"use strict";

const { v4: uuidv4 } = require("uuid");
const { tableExists } = require("./_helpers/migrationUtils");
const {
  OPHTHALMOLOGY_TEMPLATE_TITLE,
  OPHTHALMOLOGY_TEMPLATE_DESCRIPTION,
  OPHTHALMOLOGY_DIAGRAM_CATEGORIES,
  OPHTHALMOLOGY_DIAGRAMS,
  buildOphthalmologyGroups,
  buildOphthalmologyFields,
} = require("../config/ophthalmologyDiagnosisPreset");

const DIAGNOSIS_MODEL_NAME = "Diagnosis";

async function findOrCreateCategory(queryInterface, { name, code, sort_order }, now) {
  const [existing] = await queryInterface.sequelize.query(
    `SELECT category_id FROM medical_diagram_categories WHERE code = :code OR name = :name LIMIT 1`,
    { replacements: { code, name } }
  );
  if (existing[0]?.category_id) return existing[0].category_id;

  const categoryId = uuidv4();
  await queryInterface.bulkInsert("medical_diagram_categories", [
    {
      category_id: categoryId,
      name,
      code,
      sort_order,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ]);
  return categoryId;
}

async function findOrCreateDiagram(
  queryInterface,
  { code, name, categoryId },
  now
) {
  const [existing] = await queryInterface.sequelize.query(
    `SELECT diagram_id FROM medical_diagrams WHERE code = :code LIMIT 1`,
    { replacements: { code } }
  );
  if (existing[0]?.diagram_id) return existing[0].diagram_id;

  const diagramId = uuidv4();
  await queryInterface.bulkInsert("medical_diagrams", [
    {
      diagram_id: diagramId,
      name,
      code,
      category_id: categoryId,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  ]);
  return diagramId;
}

async function resolveFieldConfig(queryInterface, config = {}, diagramIdByCode) {
  const resolved = { ...config };
  if (resolved.diagram_code) {
    const diagramId = diagramIdByCode[resolved.diagram_code];
    if (diagramId) {
      resolved.diagram_id = diagramId;
      resolved.canvas_source_type = resolved.canvas_source_type || "library";
    }
    delete resolved.diagram_code;
  }
  return resolved;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    if (await tableExists(queryInterface, "medical_diagram_categories")) {
      const categoryIdByCode = {};
      for (const cat of OPHTHALMOLOGY_DIAGRAM_CATEGORIES) {
        categoryIdByCode[cat.code] = await findOrCreateCategory(
          queryInterface,
          cat,
          now
        );
      }

      if (await tableExists(queryInterface, "medical_diagrams")) {
        for (const diagram of OPHTHALMOLOGY_DIAGRAMS) {
          await findOrCreateDiagram(
            queryInterface,
            {
              code: diagram.code,
              name: diagram.name,
              categoryId: categoryIdByCode[diagram.categoryCode] || null,
            },
            now
          );
        }
      }
    }

    const [templates] = await queryInterface.sequelize.query(
      `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
      { replacements: { title: OPHTHALMOLOGY_TEMPLATE_TITLE } }
    );

    let templateId = templates[0]?.template_id;
    if (!templateId) {
      templateId = uuidv4();
      await queryInterface.bulkInsert("diagnosis_templates", [
        {
          template_id: templateId,
          title: OPHTHALMOLOGY_TEMPLATE_TITLE,
          description: OPHTHALMOLOGY_TEMPLATE_DESCRIPTION,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const fields = buildOphthalmologyFields();
    const expectedFieldCount = fields.length;

    const [[{ group_count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS group_count FROM form_field_groups
       WHERE diagnosis_template_id = :templateId AND model_name = :model`,
      { replacements: { templateId, model: DIAGNOSIS_MODEL_NAME } }
    );

    const [[{ field_count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS field_count FROM form_fields
       WHERE diagnosis_template_id = :templateId AND model_name = :model`,
      { replacements: { templateId, model: DIAGNOSIS_MODEL_NAME } }
    );

    if (
      Number(group_count) > 0 &&
      Number(field_count) === expectedFieldCount
    ) {
      return;
    }

    if (Number(group_count) > 0 || Number(field_count) > 0) {
      await queryInterface.bulkDelete("form_fields", {
        diagnosis_template_id: templateId,
        model_name: DIAGNOSIS_MODEL_NAME,
      });
      await queryInterface.bulkDelete("form_field_groups", {
        diagnosis_template_id: templateId,
        model_name: DIAGNOSIS_MODEL_NAME,
      });
    }

    const diagramIdByCode = {};
    if (await tableExists(queryInterface, "medical_diagrams")) {
      const [diagramRows] = await queryInterface.sequelize.query(
        `SELECT diagram_id, code FROM medical_diagrams WHERE code LIKE 'oph_%'`
      );
      for (const row of diagramRows) {
        diagramIdByCode[row.code] = row.diagram_id;
      }
    }

    const groups = buildOphthalmologyGroups();
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
          is_visible: group.is_visible !== false,
          is_required: Boolean(group.is_required),
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    for (const def of fields) {
      const groupId = groupIdByTitle.get(def.section);
      if (!groupId) continue;
      const config = await resolveFieldConfig(
        queryInterface,
        def.config || {},
        diagramIdByCode
      );
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
          is_required: Boolean(def.is_required),
          is_visible: true,
          sort_order: def.sort_order ?? 0,
          config: JSON.stringify(config),
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    const [templates] = await queryInterface.sequelize.query(
      `SELECT template_id FROM diagnosis_templates WHERE title = :title LIMIT 1`,
      { replacements: { title: OPHTHALMOLOGY_TEMPLATE_TITLE } }
    );
    const templateId = templates[0]?.template_id;
    if (!templateId) return;

    await queryInterface.bulkDelete("form_fields", {
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    });
    await queryInterface.bulkDelete("form_field_groups", {
      diagnosis_template_id: templateId,
      model_name: DIAGNOSIS_MODEL_NAME,
    });
    await queryInterface.bulkDelete("diagnosis_templates", {
      template_id: templateId,
    });

    if (await tableExists(queryInterface, "medical_diagrams")) {
      await queryInterface.sequelize.query(
        `DELETE FROM medical_diagrams WHERE code LIKE 'oph_%'`
      );
    }

    if (await tableExists(queryInterface, "medical_diagram_categories")) {
      for (const cat of OPHTHALMOLOGY_DIAGRAM_CATEGORIES) {
        await queryInterface.sequelize.query(
          `DELETE FROM medical_diagram_categories WHERE code = :code`,
          { replacements: { code: cat.code } }
        );
      }
    }
  },
};
