"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_sector_aggregation_publishes", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      plan_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "plan_versions", key: "plan_version_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      external_assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "external_assignments", key: "external_assignment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "government_structures", key: "government_structure_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM("pending", "published", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      published_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejection_comment: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex(
      "plan_sector_aggregation_publishes",
      ["plan_version_id", "external_assignment_id"],
      {
        unique: true,
        name: "plan_sector_agg_publish_version_branch_unique",
      }
    );

    await queryInterface.addIndex("plan_sector_aggregation_publishes", ["plan_version_id"], {
      name: "plan_sector_agg_publish_version_idx",
    });

    await queryInterface.addIndex("plan_sector_aggregation_publishes", ["status"], {
      name: "plan_sector_agg_publish_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("plan_sector_aggregation_publishes");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_plan_sector_aggregation_publishes_status";'
    );
  },
};
