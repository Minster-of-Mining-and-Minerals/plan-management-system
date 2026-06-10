"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_nodes", {
      plan_node_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "plan_versions",
          key: "plan_version_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      parent_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "plan_nodes",
          key: "plan_node_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("strategic", "goal", "kpi", "task"),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      weight: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
        allowNull: false,
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    await queryInterface.addIndex("plan_nodes", {
      fields: ["plan_version_id"],
      name: "plan_nodes_plan_version_id_idx",
    });

    await queryInterface.addIndex("plan_nodes", {
      fields: ["parent_id"],
      name: "plan_nodes_parent_id_idx",
    });

    await queryInterface.addIndex("plan_nodes", {
      unique: true,
      fields: ["parent_id", "title", "plan_version_id"],
      name: "plan_nodes_parent_title_version_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("plan_nodes");
  },
};
