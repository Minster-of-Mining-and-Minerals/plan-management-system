"use strict";

const {
  timestampColumns,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

/**
 * Baseline 03 — User ↔ role / permission group junctions.
 * Replaces: 20260501000008, 20260501000010
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("user_roles", {
      user_role_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "roles", key: "role_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_by: { type: Sequelize.UUID, allowNull: true },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW"),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      ...ts,
    });

    await queryInterface.createTable("user_permission_groups", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
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
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "user_permission_groups");
    await dropTableIfExists(queryInterface, "user_roles");
  },
};
