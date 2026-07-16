"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_period_target_baselines", {
      plan_period_target_baseline_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      execution_snapshot_root_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      annual_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      annual_kpi_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      snapshot_period_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      original_target: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(
      "plan_period_target_baselines",
      ["execution_snapshot_root_id", "snapshot_period_plan_node_id"],
      {
        unique: true,
        name: "plan_period_target_baseline_snapshot_node_unique",
      }
    );

    await queryInterface.addIndex(
      "plan_period_target_baselines",
      ["master_plan_version_id", "annual_kpi_plan_node_id", "period_version_id"],
      {
        name: "plan_period_target_baseline_master_kpi_period_idx",
      }
    );

    await queryInterface.createTable("target_reallocation_requests", {
      target_reallocation_request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      execution_snapshot_root_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      annual_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      annual_kpi_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      from_period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      to_period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      from_period_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      to_period_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      amount: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected", "cancelled", "applied"),
        allowNull: false,
        defaultValue: "pending",
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      requested_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reviewed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      review_comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("target_reallocation_requests", ["master_plan_version_id"], {
      name: "target_reallocation_requests_master_idx",
    });

    await queryInterface.addIndex("target_reallocation_requests", ["status"], {
      name: "target_reallocation_requests_status_idx",
    });

    await queryInterface.addIndex(
      "target_reallocation_requests",
      ["annual_kpi_plan_node_id"],
      {
        name: "target_reallocation_requests_kpi_idx",
      }
    );

    await queryInterface.addIndex(
      "target_reallocation_requests",
      ["from_period_version_id", "to_period_version_id"],
      {
        name: "target_reallocation_requests_periods_idx",
      }
    );

    await queryInterface.addIndex("target_reallocation_requests", ["requested_by"], {
      name: "target_reallocation_requests_requester_idx",
    });

    await queryInterface.addIndex("target_reallocation_requests", ["requested_at"], {
      name: "target_reallocation_requests_requested_at_idx",
    });

    await queryInterface.createTable("target_allocation_histories", {
      target_allocation_history_id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      master_plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      annual_kpi_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      period_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      period_plan_node_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_nodes", key: "plan_node_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      old_target: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      new_target: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      change_type: {
        type: Sequelize.ENUM("reallocation"),
        allowNull: false,
        defaultValue: "reallocation",
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "target_reallocation_requests",
          key: "target_reallocation_request_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      changed_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(
      "target_allocation_histories",
      ["master_plan_version_id", "annual_kpi_plan_node_id", "period_version_id"],
      {
        name: "target_allocation_histories_master_kpi_period_idx",
      }
    );

    await queryInterface.addIndex("target_allocation_histories", ["reference_id"], {
      name: "target_allocation_histories_reference_idx",
    });

    await queryInterface.addIndex("target_allocation_histories", ["changed_at"], {
      name: "target_allocation_histories_changed_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("target_allocation_histories");
    await queryInterface.dropTable("target_reallocation_requests");
    await queryInterface.dropTable("plan_period_target_baselines");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_target_reallocation_requests_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_target_allocation_histories_change_type";'
    );
  },
};
