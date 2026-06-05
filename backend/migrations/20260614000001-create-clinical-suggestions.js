"use strict";

const { v4: uuidv4 } = require("uuid");
const { tableExists } = require("./_helpers/migrationUtils");
const {
  DEFAULT_CLINICAL_PHRASES,
} = require("../config/clinicalSuggestionConstants");

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

    if (!(await tableExists(queryInterface, "clinical_suggestions"))) {
      await queryInterface.createTable("clinical_suggestions", {
        suggestion_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        text: { type: Sequelize.TEXT, allowNull: false },
        category: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "general" },
        department_id: { type: Sequelize.UUID, allowNull: true },
        created_by: { type: Sequelize.UUID, allowNull: true },
        frequency: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        organization_frequency: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        is_pinned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        last_used_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addIndex("clinical_suggestions", ["category"]);
      await queryInterface.addIndex("clinical_suggestions", ["department_id"]);
      await queryInterface.addIndex("clinical_suggestions", ["is_active"]);
      await queryInterface.addIndex("clinical_suggestions", ["organization_frequency"]);
    }

    if (!(await tableExists(queryInterface, "user_suggestion_usage"))) {
      await queryInterface.createTable("user_suggestion_usage", {
        usage_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        user_id: { type: Sequelize.UUID, allowNull: false },
        suggestion_id: { type: Sequelize.UUID, allowNull: false },
        usage_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        last_used_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });

      await queryInterface.addConstraint("user_suggestion_usage", {
        fields: ["suggestion_id"],
        type: "foreign key",
        name: "user_suggestion_usage_suggestion_id_fkey",
        references: { table: "clinical_suggestions", field: "suggestion_id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });

      await queryInterface.addIndex("user_suggestion_usage", ["user_id", "suggestion_id"], {
        unique: true,
        name: "user_suggestion_usage_user_suggestion_unique",
      });
    }

    const [existing] = await queryInterface.sequelize.query(
      `SELECT suggestion_id FROM clinical_suggestions LIMIT 1`
    );
    if (!existing.length) {
      await queryInterface.bulkInsert(
        "clinical_suggestions",
        DEFAULT_CLINICAL_PHRASES.map((p) => ({
          suggestion_id: uuidv4(),
          text: p.text,
          category: p.category,
          organization_frequency: 1,
          is_pinned: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    const permDefs = [
      { resource: "clinical_suggestion", action: "read" },
      { resource: "clinical_suggestion", action: "create" },
      { resource: "clinical_suggestion", action: "update" },
      { resource: "clinical_suggestion", action: "delete" },
      { resource: "clinical_suggestion", action: "manage" },
    ];

    const permIds = {};
    for (const p of permDefs) {
      const [row] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: { resource: p.resource, action: p.action } }
      );
      if (row.length) {
        permIds[`${p.resource}:${p.action}`] = row[0].permission_id;
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
    const adminRoles = roles.filter((r) => ADMIN_ROLE_NAMES.includes(r.name));
    const clinicalRoles = roles.filter((r) => CLINICAL_ROLE_NAMES.includes(r.name));

    const link = async (roleId, permissionId) => {
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (role_permission_id, role_id, permission_id, is_active, created_at, updated_at)
         SELECT :rpId, :roleId, :permissionId, true, :now, :now
         WHERE NOT EXISTS (
           SELECT 1 FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId
         )`,
        { replacements: { rpId: uuidv4(), roleId, permissionId, now } }
      );
    };

    for (const role of adminRoles) {
      for (const id of Object.values(permIds)) await link(role.role_id, id);
    }
    const readId = permIds["clinical_suggestion:read"];
    if (readId) {
      for (const role of clinicalRoles) await link(role.role_id, readId);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_suggestion_usage");
    await queryInterface.dropTable("clinical_suggestions");
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'clinical_suggestion'`
    );
  },
};
