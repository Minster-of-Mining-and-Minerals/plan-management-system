"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("internal_assignments", {
      internal_assignment_id: {
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
      internal_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "internal_structures",
          key: "internal_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "plan_assignment_actions",
          key: "assignment_action_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
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

    await queryInterface.addIndex("internal_assignments", {
      fields: ["plan_node_id"],
      name: "internal_assignments_plan_node_id_idx",
    });

    await queryInterface.addIndex("internal_assignments", {
      fields: ["internal_structure_id"],
      name: "internal_assignments_internal_structure_id_idx",
    });

    await queryInterface.addIndex("internal_assignments", {
      fields: ["user_id"],
      name: "internal_assignments_user_id_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("internal_assignments");
  },
};
