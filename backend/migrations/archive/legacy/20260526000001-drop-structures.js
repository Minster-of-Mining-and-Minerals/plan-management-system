"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable("structure_permission_groups").catch(() => {});

    const usersTable = await queryInterface.describeTable("users").catch(() => null);
    if (usersTable?.structure_id) {
      await queryInterface.removeColumn("users", "structure_id");
    }

    await queryInterface.dropTable("structures").catch(() => {});

    await queryInterface.sequelize.query(`
      DELETE FROM permissions
      WHERE resource IN ('structures')
         OR (resource = 'permission_groups' AND action IN ('add_structure', 'remove_structure'))
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("structures", {
      structure_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "structures", key: "structure_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addColumn("users", "structure_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "structures", key: "structure_id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.createTable("structure_permission_groups", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "structures", key: "structure_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permission_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "permission_groups", key: "permission_group_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    });
  },
};
