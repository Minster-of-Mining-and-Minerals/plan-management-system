"use strict";

const { v4: uuidv4 } = require("uuid");
const { tableExists } = require("./_helpers/migrationUtils");

const ADMIN_ROLE_NAMES = ["Super Admin", "Admin", "Hospital Admin", "System Admin"];
const CLINICAL_ROLE_NAMES = [
  "Doctor",
  "Physician",
  "Nurse",
  "Clinical Staff",
  "Receptionist",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const templatesExist = await tableExists(
      queryInterface,
      "medical_certificate_templates"
    );

    if (!templatesExist) {
    await queryInterface.createTable("medical_certificate_templates", {
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
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("medical_certificates", {
      certificate_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      certificate_number: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      schedule_id: { type: Sequelize.UUID, allowNull: true },
      appointment_id: { type: Sequelize.UUID, allowNull: true },
      template_id: { type: Sequelize.UUID, allowNull: false },
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
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint("medical_certificates", {
      fields: ["template_id"],
      type: "foreign key",
      name: "medical_certificates_template_id_fkey",
      references: { table: "medical_certificate_templates", field: "template_id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("medical_certificates", ["patient_id"]);
    await queryInterface.addIndex("medical_certificates", ["schedule_id"]);
    await queryInterface.addIndex("medical_certificates", ["appointment_id"]);
    }

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

    const permDefs = [
      { resource: "medical_certificate_template", action: "view" },
      { resource: "medical_certificate_template", action: "create" },
      { resource: "medical_certificate_template", action: "update" },
      { resource: "medical_certificate_template", action: "delete" },
      { resource: "medical_certificate_template", action: "manage" },
      { resource: "medical_certificate", action: "read" },
      { resource: "medical_certificate", action: "create" },
      { resource: "medical_certificate", action: "print" },
    ];

    const permIds = {};
    for (const p of permDefs) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: { resource: p.resource, action: p.action } }
      );
      if (existing.length) {
        permIds[`${p.resource}:${p.action}`] = existing[0].permission_id;
        continue;
      }
      const id = uuidv4();
      permIds[`${p.resource}:${p.action}`] = id;
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: id,
          resource: p.resource,
          action: p.action,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`
    );

    const linkRole = async (roleId, permissionId) => {
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (role_permission_id, role_id, permission_id, is_active, created_at, updated_at)
         SELECT :rpId, :roleId, :permissionId, true, :now, :now
         WHERE NOT EXISTS (
           SELECT 1 FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId
         )`,
        {
          replacements: {
            rpId: uuidv4(),
            roleId,
            permissionId,
            now,
          },
        }
      );
    };

    const adminRoles = roles.filter((r) => ADMIN_ROLE_NAMES.includes(r.name));
    const clinicalRoles = roles.filter((r) => CLINICAL_ROLE_NAMES.includes(r.name));

    for (const role of adminRoles) {
      for (const id of Object.values(permIds)) {
        await linkRole(role.role_id, id);
      }
    }

    const clinicalPermKeys = [
      "medical_certificate:read",
      "medical_certificate:create",
      "medical_certificate:print",
      "medical_certificate_template:view",
    ];
    for (const role of clinicalRoles) {
      for (const key of clinicalPermKeys) {
        const id = permIds[key];
        if (id) await linkRole(role.role_id, id);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("medical_certificates");
    await queryInterface.dropTable("medical_certificate_templates");

    const resources = [
      "medical_certificate_template",
      "medical_certificate",
    ];
    for (const resource of resources) {
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE resource = :resource`,
        { replacements: { resource } }
      );
    }
  },
};
