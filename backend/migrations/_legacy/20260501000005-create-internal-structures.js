"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("internal_structures", {
      internal_structure_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "government_structures",
          key: "government_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "internal_structures",
          key: "internal_structure_id",
        },
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
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("internal_structures");
  },
};
