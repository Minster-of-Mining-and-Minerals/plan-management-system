"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  dropTableIfExists,
  createTableIfNotExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

/** Baseline 17 — Medical Certificate Ecosystem */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await createTableIfNotExists(queryInterface, "medical_certificate_templates", {
      template_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      header_html: { type: Sequelize.TEXT, allowNull: false },
      footer_html: { type: Sequelize.TEXT, allowNull: false },
      html_content: { type: Sequelize.TEXT, allowNull: false },
      stamp_image_file: { type: Sequelize.STRING(512), allowNull: true },
      has_template_stamp: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await createTableIfNotExists(queryInterface, "medical_certificates", {
      certificate_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      certificate_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      schedule_id: { type: Sequelize.UUID, allowNull: true },
      appointment_id: { type: Sequelize.UUID, allowNull: true },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "medical_certificate_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      include_options: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      doctor_notes: { type: Sequelize.TEXT, allowNull: true },
      rendered_html: { type: Sequelize.TEXT, allowNull: false },
      signature_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "template",
      },
      verification_code: { type: Sequelize.STRING(64), allowNull: true },
      issued_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await safeAddIndex(queryInterface, "medical_certificates", ["patient_id"]);
    await safeAddIndex(queryInterface, "medical_certificates", ["schedule_id"]);
    await safeAddIndex(queryInterface, "medical_certificates", ["appointment_id"]);

    const {
      DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
      DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
      DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
    } = require("../config/defaultMedicalCertificateDocumentTemplate");

    const [existingTemplate] = await queryInterface.sequelize.query(
      `SELECT template_id FROM medical_certificate_templates WHERE code = 'default_medical_certificate' LIMIT 1`
    );
    if (!existingTemplate.length) {
      await queryInterface.bulkInsert("medical_certificate_templates", [
        {
          template_id: uuidv4(),
          name: "Standard medical certificate",
          code: "default_medical_certificate",
          header_html: DEFAULT_MEDICAL_CERTIFICATE_HEADER_HTML,
          footer_html: DEFAULT_MEDICAL_CERTIFICATE_FOOTER_HTML,
          html_content: DEFAULT_MEDICAL_CERTIFICATE_BODY_HTML,
          has_template_stamp: false,
          is_default: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "medical_certificates");
    await dropTableIfExists(queryInterface, "medical_certificate_templates");
  },
};
