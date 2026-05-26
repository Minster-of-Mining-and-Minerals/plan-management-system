"use strict";

const {
  timestampColumns,
  softDeleteColumn,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 01 — RBAC catalog (no user FKs).
 * Replaces: 20260501000001–00003, 00007, 00009
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("permissions", {
      permission_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      resource: { type: Sequelize.STRING(100), allowNull: false },
      action: { type: Sequelize.STRING(100), allowNull: false },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "permissions", ["resource", "action"], {
      unique: true,
      name: "permissions_resource_action_unique",
    });

    await queryInterface.createTable("roles", {
      role_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      ...ts,
      ...softDeleteColumn(Sequelize),
    });

    await queryInterface.createTable("permission_groups", {
      permission_group_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      ...ts,
    });

    await queryInterface.createTable("role_permissions", {
      role_permission_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "roles", key: "role_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "permissions", key: "permission_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      ...ts,
    });

    await queryInterface.createTable("permission_group_permissions", {
      permission_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "permission_groups",
          key: "permission_group_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "permissions", key: "permission_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addConstraint("permission_group_permissions", {
      fields: ["permission_group_id", "permission_id"],
      type: "primary key",
      name: "pk_permission_group_permissions",
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "permission_group_permissions");
    await dropTableIfExists(queryInterface, "role_permissions");
    await dropTableIfExists(queryInterface, "permission_groups");
    await dropTableIfExists(queryInterface, "roles");
    await dropTableIfExists(queryInterface, "permissions");
  },
};
