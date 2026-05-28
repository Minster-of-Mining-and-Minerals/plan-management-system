"use strict";

const { v4: uuidv4 } = require("uuid");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];
const CLINICAL_ROLE_NAMES = ["Super Admin", "Admin", "Doctor", "Nurse"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.addColumn("system_branding", "organization_address", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "organization_city", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "organization_region", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "organization_country", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "organization_branch", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "contact_phone", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "contact_email", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "license_info", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn("system_branding", "prescription_config", {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn("internal_user_profiles", "signature_file", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn("internal_user_profiles", "signature_enabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.createTable("prescription_categories", {
      category_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.createTable("prescription_templates", {
      template_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescription_categories", key: "category_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      template_type: { type: Sequelize.STRING(64), allowNull: true },
      template_content: { type: Sequelize.TEXT, allowNull: true },
      has_template_signature: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      template_signature_file: { type: Sequelize.STRING(500), allowNull: true },
      allow_user_signature_override: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable("prescription_template_items", {
      item_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescription_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      item_name: { type: Sequelize.STRING(255), allowNull: false },
      strength: { type: Sequelize.STRING(120), allowNull: true },
      route: { type: Sequelize.STRING(120), allowNull: true },
      dosage: { type: Sequelize.STRING(120), allowNull: true },
      frequency: { type: Sequelize.STRING(120), allowNull: true },
      duration: { type: Sequelize.STRING(120), allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      quantity: { type: Sequelize.STRING(64), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("prescription_document_templates", {
      document_template_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "prescription_categories", key: "category_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      html_content: { type: Sequelize.TEXT, allowNull: false },
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

    await queryInterface.createTable("prescriptions", {
      prescription_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      appointment_id: { type: Sequelize.UUID, allowNull: true },
      patient_id: { type: Sequelize.UUID, allowNull: false },
      prescriber_id: { type: Sequelize.UUID, allowNull: false },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "prescription_categories", key: "category_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "prescription_templates", key: "template_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      document_template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "prescription_document_templates",
          key: "document_template_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      header_title: { type: Sequelize.STRING(255), allowNull: true },
      signature_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "template",
      },
      rendered_html: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "issued",
      },
      issued_at: { type: Sequelize.DATE, allowNull: true },
      workflow_log_id: { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("prescription_items", {
      prescription_item_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "prescriptions", key: "prescription_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      item_name: { type: Sequelize.STRING(255), allowNull: false },
      strength: { type: Sequelize.STRING(120), allowNull: true },
      route: { type: Sequelize.STRING(120), allowNull: true },
      dosage: { type: Sequelize.STRING(120), allowNull: true },
      frequency: { type: Sequelize.STRING(120), allowNull: true },
      duration: { type: Sequelize.STRING(120), allowNull: true },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      quantity: { type: Sequelize.STRING(64), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    const categories = [
      { code: "drug", name: "Drug" },
      { code: "glasses", name: "Glasses" },
      { code: "imaging", name: "Imaging" },
      { code: "procedure", name: "Procedure" },
      { code: "injection", name: "Injection" },
      { code: "physiotherapy", name: "Physiotherapy" },
      { code: "referral", name: "Referral" },
      { code: "diet", name: "Diet" },
      { code: "equipment", name: "Medical Equipment" },
    ];

    const categoryIds = {};
    for (const c of categories) {
      const id = uuidv4();
      categoryIds[c.code] = id;
      await queryInterface.bulkInsert("prescription_categories", [
        {
          category_id: id,
          name: c.name,
          code: c.code,
          description: `${c.name} prescriptions`,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const defaultDocHtml = `<div class="rx-document">
  <header class="rx-header">
    {{#if hospital_logo}}<img src="{{hospital_logo}}" alt="Logo" class="rx-logo" />{{/if}}
    <h1>{{hospital_name}}</h1>
    <p>{{hospital_location}}</p>
    <p>{{contact_phone}} · {{contact_email}}</p>
  </header>
  <section class="rx-patient">
    <p><strong>Patient:</strong> {{patient_name}} ({{patient_id}})</p>
    <p><strong>Age/Sex:</strong> {{patient_age}} / {{patient_sex}}</p>
    <p><strong>Visit:</strong> {{visit_id}} · {{visit_date}}</p>
  </section>
  <section class="rx-prescriber">
    <p><strong>Prescriber:</strong> {{doctor_name}} — {{doctor_specialization}}</p>
    <p>{{doctor_department}}</p>
  </section>
  <section class="rx-body">{{prescriptions}}</section>
  <footer class="rx-footer">
    <div class="rx-signature">{{signature}}</div>
    <p>Date: {{signature_date}}</p>
  </footer>
</div>`;

    await queryInterface.bulkInsert("prescription_document_templates", [
      {
        document_template_id: uuidv4(),
        name: "Standard Medical Prescription",
        code: "standard_rx",
        category_id: null,
        html_content: defaultDocHtml,
        is_default: true,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ]);

    const permDefs = [
      { resource: "prescription_category", action: "create" },
      { resource: "prescription_category", action: "update" },
      { resource: "prescription_category", action: "delete" },
      { resource: "prescription_category", action: "view" },
      { resource: "prescription_category", action: "manage" },
      { resource: "prescription_template", action: "create" },
      { resource: "prescription_template", action: "update" },
      { resource: "prescription_template", action: "delete" },
      { resource: "prescription_template", action: "view" },
      { resource: "prescription_template", action: "manage" },
      { resource: "prescription", action: "create" },
      { resource: "prescription", action: "read" },
      { resource: "prescription", action: "update" },
      { resource: "prescription", action: "delete" },
      { resource: "prescription", action: "print" },
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
    const roleIdByName = Object.fromEntries(roles.map((r) => [r.name, r.role_id]));

    const adminRoleIds = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const name of ADMIN_ROLE_NAMES) {
      if (roleIdByName[name]) adminRoleIds.add(roleIdByName[name]);
    }
    const clinicalRoleIds = new Set([SUPER_ADMIN_ROLE_ID]);
    for (const name of CLINICAL_ROLE_NAMES) {
      if (roleIdByName[name]) clinicalRoleIds.add(roleIdByName[name]);
    }

    const linkRole = async (roleId, permissionId) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
        { replacements: { roleId, permissionId } }
      );
      if (existing.length) return;
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: roleId,
          permission_id: permissionId,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    };

    for (const roleId of adminRoleIds) {
      for (const id of Object.values(permIds)) {
        await linkRole(roleId, id);
      }
    }

    const clinicalPerms = [
      "prescription:read",
      "prescription:create",
      "prescription:print",
      "prescription_template:view",
      "prescription_category:view",
    ];
    for (const roleId of clinicalRoleIds) {
      for (const key of clinicalPerms) {
        if (permIds[key]) await linkRole(roleId, permIds[key]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("prescription_items");
    await queryInterface.dropTable("prescriptions");
    await queryInterface.dropTable("prescription_document_templates");
    await queryInterface.dropTable("prescription_template_items");
    await queryInterface.dropTable("prescription_templates");
    await queryInterface.dropTable("prescription_categories");

    await queryInterface.removeColumn("internal_user_profiles", "signature_enabled");
    await queryInterface.removeColumn("internal_user_profiles", "signature_file");

    const brandingCols = [
      "organization_address",
      "organization_city",
      "organization_region",
      "organization_country",
      "organization_branch",
      "contact_phone",
      "contact_email",
      "license_info",
      "prescription_config",
    ];
    for (const col of brandingCols) {
      await queryInterface.removeColumn("system_branding", col);
    }
  },
};
