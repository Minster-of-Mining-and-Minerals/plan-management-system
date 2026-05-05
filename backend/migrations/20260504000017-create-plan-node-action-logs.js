"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_node_action_logs", {
      action_log_id: {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "submitted",
          "approved",
          "rejected",
          "forwarded"
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("plan_node_action_logs", {
      fields: ["plan_node_id"],
      name: "plan_node_action_logs_plan_node_id_idx",
    });

    await queryInterface.addIndex("plan_node_action_logs", {
      fields: ["user_id"],
      name: "plan_node_action_logs_user_id_idx",
    });

    await queryInterface.addIndex("plan_node_action_logs", {
      fields: ["action_id"],
      name: "plan_node_action_logs_action_id_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("plan_node_action_logs");
  },
};
