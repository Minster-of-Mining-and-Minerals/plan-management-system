"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_rules", {
      plan_rule_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "government_structures",
          key: "government_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      weight_mode: {
        type: Sequelize.ENUM("number", "percentage", "frequency"),
        allowNull: false,
        defaultValue: "percentage",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
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
    });

    await queryInterface.createTable("plan_rule_steps", {
      plan_rule_step_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      plan_rule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "plan_rules",
          key: "plan_rule_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      step_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      node_type: {
        type: Sequelize.ENUM("strategic", "goal", "kpi", "task"),
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      requires_weight: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

    await queryInterface.addIndex("plan_rule_steps", {
      unique: true,
      fields: ["plan_rule_id", "step_order"],
      name: "plan_rule_steps_rule_order_unique",
    });

    await queryInterface.addColumn("plan_versions", "plan_rule_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "plan_rules",
        key: "plan_rule_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_versions", "plan_rule_id");
    await queryInterface.dropTable("plan_rule_steps");
    await queryInterface.dropTable("plan_rules");
  },
};
