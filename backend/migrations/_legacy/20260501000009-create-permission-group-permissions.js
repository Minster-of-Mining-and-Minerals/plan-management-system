"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
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
        references: {
          model: "permissions",
          key: "permission_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // Add composite primary key
    await queryInterface.addConstraint("permission_group_permissions", {
      fields: ["permission_group_id", "permission_id"],
      type: "primary key",
      name: "pk_permission_group_permissions",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("permission_group_permissions");
  },
};
