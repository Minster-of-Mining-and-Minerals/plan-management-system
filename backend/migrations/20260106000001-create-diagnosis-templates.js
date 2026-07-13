"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  tableExists,
  columnExists,
  createTableIfNotExists,
} = require("./_helpers/migrationUtils");

const STARTER_TEMPLATES = [
  { title: "General Doctor Diagnosis", description: "Standard outpatient clinical diagnosis form." },
  { title: "Emergency Diagnosis", description: "Rapid triage and emergency assessment fields." },
  { title: "Pediatric Diagnosis", description: "Pediatric-focused examination and notes." },
  { title: "Cardiology Diagnosis", description: "Cardiology-specific vitals and assessment." },
  { title: "Nurse Assessment Form", description: "Nursing intake and observation template." },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    const created = await createTableIfNotExists(queryInterface, "diagnosis_templates", {
      template_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
    });

    if (created) {
      await safeAddIndex(queryInterface, "diagnosis_templates", ["status"]);
    }

    if (!(await columnExists(queryInterface, "diagnosis_form_configs", "source_template_id"))) {
      await queryInterface.addColumn("diagnosis_form_configs", "source_template_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "diagnosis_templates", key: "template_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      });
    }

    if (!(await columnExists(queryInterface, "form_field_groups", "diagnosis_template_id"))) {
      await queryInterface.addColumn("form_field_groups", "diagnosis_template_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "diagnosis_templates", key: "template_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      });
    }

    if (!(await columnExists(queryInterface, "form_fields", "diagnosis_template_id"))) {
      await queryInterface.addColumn("form_fields", "diagnosis_template_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "diagnosis_templates", key: "template_id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS form_fields_diagnosis_template_field_key_unique
      ON form_fields (model_name, field_key, diagnosis_template_id)
      WHERE diagnosis_template_id IS NOT NULL;
    `);

    const [[{ count }]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count FROM diagnosis_templates;`
    );
    if (Number(count) > 0) return;

    const now = new Date();
    for (const t of STARTER_TEMPLATES) {
      await queryInterface.bulkInsert("diagnosis_templates", [
        {
          template_id: uuidv4(),
          title: t.title,
          description: t.description,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("form_fields", "diagnosis_template_id");
    await queryInterface.removeColumn("form_field_groups", "diagnosis_template_id");
    await queryInterface.removeColumn("diagnosis_form_configs", "source_template_id");
    await dropTableIfExists(queryInterface, "diagnosis_templates");
  },
};
