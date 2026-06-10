"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("government_structure_permission_groups", {
      id: {
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("government_structure_permission_groups");
  },
};
