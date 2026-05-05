"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("external_assignments", {
      external_assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "plan_nodes",
          key: "plan_node_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      role: {
        type: Sequelize.ENUM("owner", "collaborator"),
        defaultValue: "owner",
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
    });

    await queryInterface.addIndex("external_assignments", {
      fields: ["plan_node_id"],
      name: "external_assignments_plan_node_id_idx",
    });

    await queryInterface.addIndex("external_assignments", {
      fields: ["government_structure_id"],
      name: "external_assignments_govt_structure_id_idx",
    });

    await queryInterface.addIndex("external_assignments", {
      unique: true,
      fields: ["plan_node_id", "government_structure_id"],
      name: "external_assignments_node_govt_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("external_assignments");
  },
};
